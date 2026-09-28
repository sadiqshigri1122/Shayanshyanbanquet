import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from './bookingService.js';
import { appendAuditLog } from './stateService.js';
import {
  findOrCreateItemType,
  newQuantityMovementId,
  newStockBalanceId,
} from './inventoryService.js';

const DEFAULT_LOCATION = 'Store Room';

function nowIso(): string {
  return new Date().toISOString();
}

export function newStockCountId(): string {
  return `isc${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newStockCountLineId(): string {
  return `isl${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newAdjustmentId(): string {
  return `iad${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newCheckoutId(): string {
  return `ico${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

type TxClient = Prisma.TransactionClient;

export interface ItemTypeTotals {
  goodQty: number;
  missingQty: number;
  damagedQty: number;
  outQty: number;
  total: number;
}

export async function getItemTypeTotals(itemTypeId: string): Promise<ItemTypeTotals> {
  const balances = await prisma.inventoryStockBalance.findMany({ where: { itemTypeId } });
  const totals = balances.reduce(
    (acc, b) => ({
      goodQty: acc.goodQty + b.goodQty,
      missingQty: acc.missingQty + b.missingQty,
      damagedQty: acc.damagedQty + b.damagedQty,
      outQty: acc.outQty + b.outQty,
    }),
    { goodQty: 0, missingQty: 0, damagedQty: 0, outQty: 0 },
  );
  return {
    ...totals,
    total: totals.goodQty + totals.missingQty + totals.damagedQty + totals.outQty,
  };
}

async function getOrCreateBalance(tx: TxClient, itemTypeId: string, location = DEFAULT_LOCATION) {
  const existing = await tx.inventoryStockBalance.findUnique({
    where: { itemTypeId_location: { itemTypeId, location } },
  });
  if (existing) return existing;

  const ts = nowIso();
  return tx.inventoryStockBalance.create({
    data: {
      id: newStockBalanceId(),
      itemTypeId,
      location,
      goodQty: 0,
      missingQty: 0,
      damagedQty: 0,
      outQty: 0,
      updatedAt: ts,
    },
  });
}

async function adjustGoodQty(
  tx: TxClient,
  itemTypeId: string,
  deltaGood: number,
  deltaMissing = 0,
  deltaDamaged = 0,
  deltaOut = 0,
) {
  const balance = await getOrCreateBalance(tx, itemTypeId);
  const nextGood = balance.goodQty + deltaGood;
  const nextMissing = balance.missingQty + deltaMissing;
  const nextDamaged = balance.damagedQty + deltaDamaged;
  const nextOut = balance.outQty + deltaOut;

  if (nextGood < 0 || nextMissing < 0 || nextDamaged < 0 || nextOut < 0) {
    throw new ApiError('Insufficient quantity for this operation.', 400);
  }

  await tx.inventoryStockBalance.update({
    where: { id: balance.id },
    data: {
      goodQty: nextGood,
      missingQty: nextMissing,
      damagedQty: nextDamaged,
      outQty: nextOut,
      updatedAt: nowIso(),
    },
  });
}

export async function addInventoryStock(
  input: {
    itemName: string;
    category: string;
    quantity: number;
    unit?: string;
    notes?: string;
    supplier?: string;
    purchaseReference?: string;
  },
  createdBy: string,
) {
  if (input.quantity < 1 || input.quantity > 10000) {
    throw new ApiError('Quantity must be between 1 and 10000.', 400);
  }

  const itemType = await findOrCreateItemType(
    {
      name: input.itemName.trim(),
      category: input.category,
      unit: input.unit,
      serialTracking: false,
      notes: input.notes,
    },
    createdBy,
  );

  const ts = nowIso();

  await prisma.$transaction(async (tx) => {
    await adjustGoodQty(tx, itemType.id, input.quantity);
    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: itemType.id,
        action: 'IN',
        quantity: input.quantity,
        fromLocation: 'Receiving',
        toLocation: DEFAULT_LOCATION,
        bookingId: null,
        reason: 'Initial inventory / stock received',
        reference: input.purchaseReference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'add_inventory_stock',
    entity: 'inventory_item_type',
    entityId: itemType.id,
    performedBy: createdBy,
    details: `Added ${input.quantity} × ${itemType.name} to inventory`,
  });

  return { itemTypeId: itemType.id, itemName: itemType.name, quantity: input.quantity };
}

export async function addStockToExistingType(
  input: { itemTypeId: string; quantity: number; notes?: string; reference?: string },
  createdBy: string,
) {
  if (input.quantity < 1) throw new ApiError('Quantity must be at least 1.', 400);

  const itemType = await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } });
  if (!itemType) throw new ApiError('Item type not found.', 404);
  if (itemType.serialTracking) throw new ApiError('This item uses legacy serial tracking.', 400);

  const ts = nowIso();

  await prisma.$transaction(async (tx) => {
    await adjustGoodQty(tx, itemType.id, input.quantity);
    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: itemType.id,
        action: 'IN',
        quantity: input.quantity,
        fromLocation: 'Receiving',
        toLocation: DEFAULT_LOCATION,
        bookingId: null,
        reason: 'Additional stock received',
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });
  });

  return { itemTypeId: itemType.id, quantity: input.quantity };
}

export async function finalizeStockCount(
  input: {
    lines: Array<{ itemTypeId: string; actualGoodQty: number; remarks?: string }>;
    notes?: string;
    countedAt?: string;
  },
  countedBy: string,
) {
  if (!input.lines.length) throw new ApiError('At least one count line is required.', 400);

  const ts = nowIso();
  const countedAt = input.countedAt?.trim() || ts;
  const stockCountId = newStockCountId();
  const countLines: Array<{
    id: string;
    itemTypeId: string;
    itemName: string;
    systemGoodQty: number;
    actualGoodQty: number;
    missingQty: number;
    surplusQty: number;
    remarks: string | null;
  }> = [];

  for (const line of input.lines) {
    if (line.actualGoodQty < 0) throw new ApiError('Actual quantity cannot be negative.', 400);

    const itemType = await prisma.inventoryItemType.findUnique({ where: { id: line.itemTypeId } });
    if (!itemType) throw new ApiError(`Item type not found: ${line.itemTypeId}`, 404);

    const totals = await getItemTypeTotals(line.itemTypeId);
    const missingQty = Math.max(0, totals.goodQty - line.actualGoodQty);
    const surplusQty = Math.max(0, line.actualGoodQty - totals.goodQty);

    if ((missingQty > 0 || surplusQty > 0) && !line.remarks?.trim()) {
      throw new ApiError(
        `Remarks required for ${itemType.name} — count differs from system (${totals.goodQty} vs ${line.actualGoodQty}).`,
        400,
      );
    }

    countLines.push({
      id: newStockCountLineId(),
      itemTypeId: line.itemTypeId,
      itemName: itemType.name,
      systemGoodQty: totals.goodQty,
      actualGoodQty: line.actualGoodQty,
      missingQty,
      surplusQty,
      remarks: line.remarks?.trim() || null,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryStockCount.create({
      data: {
        id: stockCountId,
        countedAt,
        countedBy,
        notes: input.notes?.trim() || null,
        status: 'FINALIZED',
        createdAt: ts,
        lines: {
          create: countLines,
        },
      },
    });

    for (const line of countLines) {
      const balance = await getOrCreateBalance(tx, line.itemTypeId);
      const goodDelta = line.actualGoodQty - balance.goodQty;
      const missingDelta = line.missingQty;

      await tx.inventoryStockBalance.update({
        where: { id: balance.id },
        data: {
          goodQty: line.actualGoodQty,
          missingQty: balance.missingQty + missingDelta,
          updatedAt: ts,
        },
      });

      if (missingDelta > 0 || goodDelta !== 0) {
        await tx.inventoryQuantityMovement.create({
          data: {
            id: newQuantityMovementId(),
            itemTypeId: line.itemTypeId,
            action: 'COUNT_ADJUST',
            quantity: Math.abs(goodDelta) || missingDelta,
            fromLocation: DEFAULT_LOCATION,
            toLocation: missingDelta > 0 ? 'Missing' : DEFAULT_LOCATION,
            bookingId: null,
            reason: 'Physical stock count',
            reference: stockCountId,
            notes: line.remarks,
            createdBy: countedBy,
            createdAt: ts,
          },
        });
      }
    }
  });

  await appendAuditLog({
    action: 'stock_count',
    entity: 'inventory_stock_count',
    entityId: stockCountId,
    performedBy: countedBy,
    details: `Physical stock count finalized (${input.lines.length} item type(s))`,
  });

  return prisma.inventoryStockCount.findUniqueOrThrow({
    where: { id: stockCountId },
    include: { lines: { include: { itemType: true } } },
  });
}

export async function recordMissingOrDamaged(
  input: {
    itemTypeId: string;
    type: 'MISSING' | 'DAMAGED';
    quantity: number;
    remarks: string;
  },
  adjustedBy: string,
) {
  if (input.quantity < 1) throw new ApiError('Quantity must be at least 1.', 400);
  if (!input.remarks.trim()) throw new ApiError('Remarks are required.', 400);

  const itemType = await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } });
  if (!itemType) throw new ApiError('Item type not found.', 404);

  const totals = await getItemTypeTotals(input.itemTypeId);
  if (totals.goodQty < input.quantity) {
    throw new ApiError(
      `Not enough good stock. Available: ${totals.goodQty}, requested: ${input.quantity}.`,
      400,
    );
  }

  const ts = nowIso();
  const adjustmentId = newAdjustmentId();
  const isMissing = input.type === 'MISSING';

  await prisma.$transaction(async (tx) => {
    await adjustGoodQty(
      tx,
      input.itemTypeId,
      -input.quantity,
      isMissing ? input.quantity : 0,
      isMissing ? 0 : input.quantity,
    );

    await tx.inventoryAdjustment.create({
      data: {
        id: adjustmentId,
        itemTypeId: input.itemTypeId,
        itemName: itemType.name,
        type: input.type,
        quantity: input.quantity,
        remarks: input.remarks.trim(),
        adjustedBy,
        adjustedAt: ts,
        createdAt: ts,
      },
    });

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: input.itemTypeId,
        action: isMissing ? 'MARK_MISSING' : 'MARK_DAMAGED',
        quantity: input.quantity,
        fromLocation: DEFAULT_LOCATION,
        toLocation: isMissing ? 'Missing' : 'Damaged',
        bookingId: null,
        reason: input.remarks.trim(),
        reference: adjustmentId,
        notes: null,
        createdBy: adjustedBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: input.type.toLowerCase(),
    entity: 'inventory_adjustment',
    entityId: adjustmentId,
    performedBy: adjustedBy,
    details: `${input.type}: ${input.quantity} × ${itemType.name}`,
  });

  return prisma.inventoryAdjustment.findUniqueOrThrow({ where: { id: adjustmentId } });
}

export async function createOutsideCheckout(
  input: {
    itemTypeId: string;
    issuedTo: string;
    issuedQty: number;
    purpose: string;
    expectedReturnAt?: string;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.issuedQty < 1) throw new ApiError('Issued quantity must be at least 1.', 400);
  if (!input.issuedTo.trim()) throw new ApiError('Who took the items is required.', 400);
  if (!input.purpose.trim()) throw new ApiError('Purpose/destination is required.', 400);

  const itemType = await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } });
  if (!itemType) throw new ApiError('Item type not found.', 404);

  const totals = await getItemTypeTotals(input.itemTypeId);
  if (totals.goodQty < input.issuedQty) {
    throw new ApiError(
      `Insufficient good stock. Available: ${totals.goodQty}, requested: ${input.issuedQty}.`,
      400,
    );
  }

  const ts = nowIso();
  const checkoutId = newCheckoutId();

  await prisma.$transaction(async (tx) => {
    await adjustGoodQty(tx, input.itemTypeId, -input.issuedQty, 0, 0, input.issuedQty);

    await tx.inventoryCheckout.create({
      data: {
        id: checkoutId,
        itemTypeId: input.itemTypeId,
        itemName: itemType.name,
        issuedTo: input.issuedTo.trim(),
        issuedQty: input.issuedQty,
        issuedAt: ts,
        purpose: input.purpose.trim(),
        expectedReturnAt: input.expectedReturnAt?.trim() || null,
        returnedQty: 0,
        missingQty: 0,
        damagedQty: 0,
        status: 'OPEN',
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
        updatedAt: ts,
      },
    });

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: input.itemTypeId,
        action: 'CHECKOUT_OUT',
        quantity: input.issuedQty,
        fromLocation: DEFAULT_LOCATION,
        toLocation: 'Outside',
        bookingId: null,
        reason: input.purpose.trim(),
        reference: checkoutId,
        notes: `Issued to: ${input.issuedTo.trim()}`,
        createdBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'checkout_out',
    entity: 'inventory_checkout',
    entityId: checkoutId,
    performedBy: createdBy,
    details: `Checked out ${input.issuedQty} × ${itemType.name} to ${input.issuedTo.trim()}`,
  });

  return prisma.inventoryCheckout.findUniqueOrThrow({
    where: { id: checkoutId },
    include: { itemType: true },
  });
}

export async function returnOutsideCheckout(
  input: {
    checkoutId: string;
    returnedQty: number;
    missingQty?: number;
    damagedQty?: number;
    returnRemarks?: string;
    returnedBy?: string;
  },
  updatedBy: string,
) {
  const missingQty = input.missingQty ?? 0;
  const damagedQty = input.damagedQty ?? 0;

  if (input.returnedQty < 0 || missingQty < 0 || damagedQty < 0) {
    throw new ApiError('Return quantities cannot be negative.', 400);
  }

  const checkout = await prisma.inventoryCheckout.findUnique({ where: { id: input.checkoutId } });
  if (!checkout) throw new ApiError('Checkout record not found.', 404);
  if (checkout.status === 'COMPLETED') throw new ApiError('This checkout is already completed.', 400);

  const outstanding = checkout.issuedQty - checkout.returnedQty - checkout.missingQty - checkout.damagedQty;
  const totalThisReturn = input.returnedQty + missingQty + damagedQty;

  if (totalThisReturn !== outstanding) {
    throw new ApiError(
      `Return must account for all ${outstanding} outstanding item(s). You entered ${totalThisReturn} (returned ${input.returnedQty}, missing ${missingQty}, damaged ${damagedQty}).`,
      400,
    );
  }

  if ((missingQty > 0 || damagedQty > 0) && !input.returnRemarks?.trim()) {
    throw new ApiError('Remarks are required when reporting missing or damaged items.', 400);
  }

  const ts = nowIso();
  const returnedBy = input.returnedBy?.trim() || updatedBy;

  await prisma.$transaction(async (tx) => {
    await adjustGoodQty(
      tx,
      checkout.itemTypeId,
      input.returnedQty,
      missingQty,
      damagedQty,
      -outstanding,
    );

    await tx.inventoryCheckout.update({
      where: { id: checkout.id },
      data: {
        returnedQty: checkout.returnedQty + input.returnedQty,
        missingQty: checkout.missingQty + missingQty,
        damagedQty: checkout.damagedQty + damagedQty,
        returnedAt: ts,
        returnedBy,
        returnRemarks: input.returnRemarks?.trim() || null,
        status: 'COMPLETED',
        updatedAt: ts,
      },
    });

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: checkout.itemTypeId,
        action: 'CHECKOUT_RETURN',
        quantity: totalThisReturn,
        fromLocation: 'Outside',
        toLocation: DEFAULT_LOCATION,
        bookingId: null,
        reason: input.returnRemarks?.trim() || 'Items returned from outside',
        reference: checkout.id,
        notes: `Returned: ${input.returnedQty}, Missing: ${missingQty}, Damaged: ${damagedQty}`,
        createdBy: updatedBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'checkout_return',
    entity: 'inventory_checkout',
    entityId: checkout.id,
    performedBy: updatedBy,
    details: `Return for ${checkout.itemName}: ${input.returnedQty} good, ${missingQty} missing, ${damagedQty} damaged`,
  });

  const updated = await prisma.inventoryCheckout.findUniqueOrThrow({
    where: { id: checkout.id },
    include: { itemType: true },
  });

  return {
    ...updated,
    reconciliation: {
      issued: updated.issuedQty,
      returned: updated.returnedQty,
      missing: updated.missingQty,
      damaged: updated.damagedQty,
      complete: updated.returnedQty + updated.missingQty + updated.damagedQty === updated.issuedQty,
    },
  };
}

export async function listStockCounts(limit = 50) {
  return prisma.inventoryStockCount.findMany({
    include: { lines: { include: { itemType: true } } },
    orderBy: { countedAt: 'desc' },
    take: limit,
  });
}

export async function listAdjustments(limit = 100) {
  return prisma.inventoryAdjustment.findMany({
    include: { itemType: true },
    orderBy: { adjustedAt: 'desc' },
    take: limit,
  });
}

export async function listCheckouts(status?: string) {
  return prisma.inventoryCheckout.findMany({
    where: status ? { status } : undefined,
    include: { itemType: true },
    orderBy: { issuedAt: 'desc' },
  });
}

export async function getQuantityInventoryReports() {
  const [masterTypes, stockCounts, adjustments, checkouts] = await Promise.all([
    prisma.inventoryItemType.findMany({
      where: { serialTracking: false },
      include: { stockBalances: true },
      orderBy: { name: 'asc' },
    }),
    listStockCounts(30),
    listAdjustments(50),
    listCheckouts(),
  ]);

  const overview = masterTypes.map((type) => {
    const totals = type.stockBalances.reduce(
      (acc, b) => ({
        goodQty: acc.goodQty + b.goodQty,
        missingQty: acc.missingQty + b.missingQty,
        damagedQty: acc.damagedQty + b.damagedQty,
        outQty: acc.outQty + b.outQty,
      }),
      { goodQty: 0, missingQty: 0, damagedQty: 0, outQty: 0 },
    );
    return {
      itemTypeId: type.id,
      itemName: type.name,
      category: type.category,
      unit: type.unit,
      ...totals,
      total: totals.goodQty + totals.missingQty + totals.damagedQty + totals.outQty,
    };
  });

  const openCheckouts = checkouts.filter((c) => c.status === 'OPEN');
  const overdueCheckouts = openCheckouts.filter(
    (c) => c.expectedReturnAt && c.expectedReturnAt < nowIso(),
  );

  return {
    overview,
    stockCounts,
    adjustments,
    checkouts,
    openCheckouts,
    overdueCheckouts,
    completedCheckouts: checkouts.filter((c) => c.status === 'COMPLETED'),
  };
}
