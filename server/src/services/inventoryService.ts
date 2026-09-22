import { prisma } from '../lib/prisma.js';
import { ApiError } from './bookingService.js';
import { appendAuditLog } from './stateService.js';

function nowIso(): string {
  return new Date().toISOString();
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function newInventoryItemId(): string {
  return `inv${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newInventoryTransactionId(): string {
  return `itx${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export async function listInventoryItems() {
  return prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function listInventoryTransactions() {
  return prisma.inventoryTransaction.findMany({ orderBy: { transactionDate: 'desc' } });
}

export async function getInventoryItemBySerial(serialNumber: string) {
  const normalized = serialNumber.trim();
  const item = await prisma.inventoryItem.findUnique({ where: { serialNumber: normalized } });
  if (!item) throw new ApiError('No inventory item found with that serial number.', 404);
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { inventoryItemId: item.id },
    orderBy: { transactionDate: 'desc' },
  });
  return { item, transactions };
}

export async function createInventoryItem(
  input: {
    itemName: string;
    category: string;
    serialNumber: string;
    location: string;
    purchaseDate?: string;
    purchaseReference?: string;
    supplier?: string;
    notes?: string;
  },
  createdBy: string,
) {
  const serialNumber = input.serialNumber.trim();
  const existing = await prisma.inventoryItem.findUnique({ where: { serialNumber } });
  if (existing) throw new ApiError('An item with this serial number already exists.', 409);

  const ts = nowIso();
  const id = newInventoryItemId();

  const item = await prisma.inventoryItem.create({
    data: {
      id,
      itemName: input.itemName.trim(),
      category: input.category.trim(),
      serialNumber,
      location: input.location.trim(),
      status: 'IN',
      currentHolder: null,
      purchaseDate: input.purchaseDate?.trim() || todayDate(),
      purchaseReference: input.purchaseReference?.trim() || null,
      supplier: input.supplier?.trim() || null,
      notes: input.notes?.trim() || null,
      createdBy,
      createdAt: ts,
      updatedAt: ts,
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      id: newInventoryTransactionId(),
      inventoryItemId: id,
      serialNumber,
      action: 'IN',
      transactionDate: ts,
      fromLocation: 'Receiving',
      toLocation: input.location.trim(),
      person: createdBy,
      reason: 'Initial receipt',
      bookingId: null,
      condition: 'Good',
      notes: input.notes?.trim() || null,
      createdBy,
      createdAt: ts,
    },
  });

  await appendAuditLog({
    action: 'create',
    entity: 'inventory_item',
    entityId: id,
    performedBy: createdBy,
    details: `Added inventory item ${input.itemName} (${serialNumber})`,
    newValue: JSON.stringify({ status: 'IN', location: input.location }),
  });

  return item;
}

export async function updateInventoryItem(
  id: string,
  input: {
    itemName?: string;
    category?: string;
    purchaseDate?: string;
    purchaseReference?: string;
    supplier?: string;
    notes?: string;
  },
  updatedBy: string,
) {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) throw new ApiError('Inventory item not found.', 404);

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      itemName: input.itemName?.trim() ?? existing.itemName,
      category: input.category?.trim() ?? existing.category,
      purchaseDate: input.purchaseDate?.trim() ?? existing.purchaseDate,
      purchaseReference: input.purchaseReference?.trim() ?? existing.purchaseReference,
      supplier: input.supplier?.trim() ?? existing.supplier,
      notes: input.notes !== undefined ? input.notes.trim() || null : existing.notes,
      updatedAt: nowIso(),
    },
  });

  await appendAuditLog({
    action: 'update',
    entity: 'inventory_item',
    entityId: id,
    performedBy: updatedBy,
    details: `Updated inventory item ${item.itemName} (${item.serialNumber})`,
  });

  return item;
}

export async function recordStockOut(
  input: {
    serialNumber: string;
    fromLocation: string;
    toLocation: string;
    givenTo: string;
    reason: string;
    bookingId?: string;
    notes?: string;
  },
  createdBy: string,
) {
  const serialNumber = input.serialNumber.trim();
  const item = await prisma.inventoryItem.findUnique({ where: { serialNumber } });
  if (!item) throw new ApiError('No inventory item found with that serial number.', 404);
  if (item.status !== 'IN') {
    throw new ApiError(`Item is currently ${item.status}. Only IN items can be checked out.`, 400);
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new ApiError('Related booking not found.', 400);
  }

  const ts = nowIso();
  const txId = newInventoryTransactionId();

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        id: txId,
        inventoryItemId: item.id,
        serialNumber,
        action: 'OUT',
        transactionDate: ts,
        fromLocation: input.fromLocation.trim(),
        toLocation: input.toLocation.trim(),
        person: input.givenTo.trim(),
        reason: input.reason.trim(),
        bookingId: input.bookingId || null,
        condition: null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: 'OUT',
        location: input.toLocation.trim(),
        currentHolder: input.givenTo.trim(),
        updatedAt: ts,
      },
    }),
  ]);

  await appendAuditLog({
    action: 'stock_out',
    entity: 'inventory_transaction',
    entityId: txId,
    performedBy: createdBy,
    details: `Stock OUT: ${item.itemName} (${serialNumber}) → ${input.givenTo}`,
    newValue: JSON.stringify({ status: 'OUT', holder: input.givenTo, location: input.toLocation }),
  });

  return prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
}

export async function recordStockIn(
  input: {
    serialNumber: string;
    fromLocation: string;
    toLocation: string;
    returnedBy: string;
    condition: string;
    reason: string;
    bookingId?: string;
    notes?: string;
  },
  createdBy: string,
) {
  const serialNumber = input.serialNumber.trim();
  const item = await prisma.inventoryItem.findUnique({ where: { serialNumber } });
  if (!item) throw new ApiError('No inventory item found with that serial number.', 404);
  if (item.status !== 'OUT') {
    throw new ApiError(`Item is currently ${item.status}. Only OUT items can be checked in.`, 400);
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new ApiError('Related booking not found.', 400);
  }

  const ts = nowIso();
  const txId = newInventoryTransactionId();

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        id: txId,
        inventoryItemId: item.id,
        serialNumber,
        action: 'IN',
        transactionDate: ts,
        fromLocation: input.fromLocation.trim(),
        toLocation: input.toLocation.trim(),
        person: input.returnedBy.trim(),
        reason: input.reason.trim(),
        bookingId: input.bookingId || null,
        condition: input.condition.trim(),
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: 'IN',
        location: input.toLocation.trim(),
        currentHolder: null,
        updatedAt: ts,
      },
    }),
  ]);

  await appendAuditLog({
    action: 'stock_in',
    entity: 'inventory_transaction',
    entityId: txId,
    performedBy: createdBy,
    details: `Stock IN: ${item.itemName} (${serialNumber}) from ${input.returnedBy}`,
    newValue: JSON.stringify({ status: 'IN', location: input.toLocation }),
  });

  return prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
}
