import { prisma } from '../lib/prisma.js';
import { isValidCategory, isValidLocation } from '../lib/inventoryConfig.js';
import { ApiError } from './bookingService.js';
import { appendAuditLog } from './stateService.js';
import { newInventoryItemTypeId } from './eventInventoryService.js';

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

export function newStockBalanceId(): string {
  return `isb${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newQuantityMovementId(): string {
  return `iqm${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

function validateLocation(location: string): string {
  const trimmed = location.trim();
  if (!isValidLocation(trimmed)) throw new ApiError(`Invalid location: ${trimmed}`, 400);
  return trimmed;
}

function validateCategory(category: string): string {
  const trimmed = category.trim();
  if (!isValidCategory(trimmed)) throw new ApiError(`Invalid category: ${trimmed}`, 400);
  return trimmed;
}

export async function findOrCreateItemType(
  input: {
    name: string;
    category: string;
    unit?: string;
    serialTracking?: boolean;
    defaultLocation?: string;
    notes?: string;
  },
  createdBy: string,
) {
  const name = input.name.trim();
  const category = validateCategory(input.category);
  const existing = await prisma.inventoryItemType.findUnique({
    where: { name_category: { name, category } },
  });
  if (existing) return existing;

  const ts = nowIso();
  return prisma.inventoryItemType.create({
    data: {
      id: newInventoryItemTypeId(),
      name,
      category,
      unit: input.unit?.trim() || 'unit',
      serialTracking: input.serialTracking ?? true,
      defaultLocation: input.defaultLocation ? validateLocation(input.defaultLocation) : null,
      notes: input.notes?.trim() || null,
      createdBy,
      createdAt: ts,
      updatedAt: ts,
    },
  });
}

export async function listInventoryItemTypes() {
  return prisma.inventoryItemType.findMany({ orderBy: { name: 'asc' } });
}

export function makeItemSerialPrefix(itemName: string): string {
  const namePart = itemName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM';
  return namePart;
}

export function generateSerialNumbersForItem(
  itemName: string,
  quantity: number,
  existingSerials: Set<string>,
): string[] {
  const prefix = makeItemSerialPrefix(itemName);
  const pad = Math.max(3, String(quantity).length);
  const serials: string[] = [];
  const used = new Set(existingSerials);

  for (let i = 1; i <= quantity; i++) {
    let serialNumber = `${prefix}-${String(i).padStart(pad, '0')}`;
    let suffix = i;
    while (used.has(serialNumber)) {
      suffix++;
      serialNumber = `${prefix}-${String(suffix).padStart(pad, '0')}`;
    }
    used.add(serialNumber);
    serials.push(serialNumber);
  }
  return serials;
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
    condition?: string;
    purchaseDate?: string;
    purchaseReference?: string;
    supplier?: string;
    notes?: string;
    itemTypeId?: string;
  },
  createdBy: string,
) {
  const serialNumber = input.serialNumber.trim();
  const location = validateLocation(input.location);
  const category = validateCategory(input.category);
  const existing = await prisma.inventoryItem.findUnique({ where: { serialNumber } });
  if (existing) throw new ApiError('An item with this serial number already exists.', 409);

  const itemType =
    input.itemTypeId
      ? await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } })
      : await findOrCreateItemType(
          { name: input.itemName.trim(), category, serialTracking: true },
          createdBy,
        );
  if (!itemType) throw new ApiError('Item type not found.', 404);
  if (!itemType.serialTracking) {
    throw new ApiError('This item type uses quantity tracking, not serial assets.', 400);
  }

  const ts = nowIso();
  const id = newInventoryItemId();

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.inventoryItem.create({
      data: {
        id,
        itemTypeId: itemType.id,
        itemName: input.itemName.trim(),
        category,
        serialNumber,
        location,
        status: 'AVAILABLE',
        condition: input.condition?.trim() || 'Good',
        lastKnownLocation: null,
        currentHolder: null,
        activeBookingId: null,
        purchaseDate: input.purchaseDate?.trim() || todayDate(),
        purchaseReference: input.purchaseReference?.trim() || null,
        supplier: input.supplier?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
        updatedAt: ts,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        id: newInventoryTransactionId(),
        inventoryItemId: id,
        serialNumber,
        action: 'IN',
        transactionDate: ts,
        fromLocation: 'Receiving',
        toLocation: location,
        person: createdBy,
        reason: 'Initial receipt',
        bookingId: null,
        reference: null,
        condition: input.condition?.trim() || 'Good',
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });

    return created;
  });

  await appendAuditLog({
    action: 'create',
    entity: 'inventory_item',
    entityId: id,
    performedBy: createdBy,
    details: `Added inventory item ${input.itemName} (${serialNumber})`,
    newValue: JSON.stringify({ status: 'AVAILABLE', location }),
  });

  return item;
}

export async function createInventoryItemsByQuantity(
  input: {
    itemName: string;
    category: string;
    location: string;
    quantity: number;
    serialTracking?: boolean;
    unit?: string;
    condition?: string;
    purchaseDate?: string;
    purchaseReference?: string;
    supplier?: string;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.quantity < 1 || input.quantity > 500) {
    throw new ApiError('Quantity must be between 1 and 500.', 400);
  }

  const serialTracking = input.serialTracking ?? true;
  const location = validateLocation(input.location);
  const category = validateCategory(input.category);

  if (!serialTracking) {
    return createQuantityStockIn(
      {
        itemName: input.itemName,
        category,
        location,
        quantity: input.quantity,
        unit: input.unit,
        reason: 'Initial receipt',
        reference: input.purchaseReference,
        notes: input.notes,
        supplier: input.supplier,
      },
      createdBy,
    );
  }

  const existingItems = await prisma.inventoryItem.findMany({ select: { serialNumber: true } });
  const existingSerials = new Set(existingItems.map((i) => i.serialNumber));
  const serialNumbers = generateSerialNumbersForItem(input.itemName, input.quantity, existingSerials);

  const itemType = await findOrCreateItemType(
    { name: input.itemName.trim(), category, unit: input.unit, serialTracking: true },
    createdBy,
  );

  const rows = serialNumbers.map((serialNumber) => ({
    itemName: input.itemName.trim(),
    category,
    serialNumber,
    location,
    condition: input.condition,
    purchaseDate: input.purchaseDate,
    purchaseReference: input.purchaseReference,
    supplier: input.supplier,
    notes: input.notes,
    itemTypeId: itemType.id,
  }));

  return bulkCreateInventoryItems(rows, createdBy);
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

function conditionToStatus(condition: string): 'AVAILABLE' | 'DAMAGED' {
  const normalized = condition.trim().toLowerCase();
  if (normalized === 'damaged' || normalized === 'needs repair') return 'DAMAGED';
  return 'AVAILABLE';
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
  if (item.status !== 'AVAILABLE') {
    throw new ApiError(`Item is currently ${item.status}. Only available items can be checked out.`, 400);
  }

  const fromLocation = input.fromLocation.trim();
  if (fromLocation !== item.location) {
    throw new ApiError(
      `From location must match the item's current location (${item.location}). Transfer the item first if it moved.`,
      400,
    );
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
        lastKnownLocation: input.fromLocation.trim(),
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
    throw new ApiError(`Item is currently ${item.status}. Only checked-out items can be checked in.`, 400);
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new ApiError('Related booking not found.', 400);
  }

  const newStatus = conditionToStatus(input.condition);
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
        status: newStatus,
        location: input.toLocation.trim(),
        lastKnownLocation: input.toLocation.trim(),
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
    details: `Stock IN: ${item.itemName} (${serialNumber}) from ${input.returnedBy} — ${newStatus}`,
    newValue: JSON.stringify({ status: newStatus, location: input.toLocation }),
  });

  return prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
}

export async function recordTransfer(
  input: {
    serialNumbers: string[];
    fromLocation: string;
    toLocation: string;
    reason: string;
    notes?: string;
  },
  createdBy: string,
) {
  const fromLocation = input.fromLocation.trim();
  const toLocation = input.toLocation.trim();
  const serialNumbers = [...new Set(input.serialNumbers.map((s) => s.trim()).filter(Boolean))];

  if (serialNumbers.length === 0) throw new ApiError('Select at least one serial number.', 400);
  if (fromLocation === toLocation) throw new ApiError('From and to locations must differ.', 400);

  const items = await prisma.inventoryItem.findMany({
    where: { serialNumber: { in: serialNumbers } },
  });

  if (items.length !== serialNumbers.length) {
    const found = new Set(items.map((i) => i.serialNumber));
    const missing = serialNumbers.filter((s) => !found.has(s));
    throw new ApiError(`Serial number(s) not found: ${missing.join(', ')}`, 404);
  }

  const errors: string[] = [];
  for (const item of items) {
    if (item.status !== 'AVAILABLE') {
      errors.push(`${item.serialNumber}: status is ${item.status}, not available for transfer`);
    } else if (item.location !== fromLocation) {
      errors.push(`${item.serialNumber}: at ${item.location}, not ${fromLocation}`);
    }
  }
  if (errors.length > 0) {
    throw new ApiError(errors.join('; '), 400);
  }

  const ts = nowIso();
  const updated: typeof items = [];

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const txId = newInventoryTransactionId();
      await tx.inventoryTransaction.create({
        data: {
          id: txId,
          inventoryItemId: item.id,
          serialNumber: item.serialNumber,
          action: 'TRANSFER',
          transactionDate: ts,
          fromLocation,
          toLocation,
          person: createdBy,
          reason: input.reason.trim(),
          bookingId: null,
          condition: null,
          notes: input.notes?.trim() || null,
          createdBy,
          createdAt: ts,
        },
      });
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          location: toLocation,
          lastKnownLocation: fromLocation,
          updatedAt: ts,
        },
      });
      updated.push(updatedItem);
    }
  });

  await appendAuditLog({
    action: 'transfer',
    entity: 'inventory_transaction',
    entityId: updated[0]?.id ?? 'bulk',
    performedBy: createdBy,
    details: `Transferred ${updated.length} item(s) from ${fromLocation} to ${toLocation}`,
    newValue: JSON.stringify({ count: updated.length, fromLocation, toLocation }),
  });

  return { transferred: updated.length, items: updated };
}

export async function updateInventoryItemStatus(
  input: {
    serialNumber: string;
    status: 'MISSING' | 'DAMAGED' | 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'RETIRED';
    reason: string;
    notes?: string;
    repairCost?: number;
  },
  updatedBy: string,
) {
  const serialNumber = input.serialNumber.trim();
  const item = await prisma.inventoryItem.findUnique({ where: { serialNumber } });
  if (!item) throw new ApiError('No inventory item found with that serial number.', 404);

  const targetStatus = input.status;
  const currentStatus = item.status;

  if (targetStatus === 'MISSING' || targetStatus === 'DAMAGED') {
    if (currentStatus !== 'AVAILABLE') {
      throw new ApiError(`Only available items can be marked ${targetStatus.toLowerCase()}. Current status: ${currentStatus}.`, 400);
    }
  } else if (targetStatus === 'UNDER_MAINTENANCE') {
    if (currentStatus !== 'AVAILABLE') {
      throw new ApiError(`Only available items can enter maintenance. Current status: ${currentStatus}.`, 400);
    }
  } else if (targetStatus === 'AVAILABLE') {
    if (currentStatus !== 'MISSING' && currentStatus !== 'DAMAGED' && currentStatus !== 'UNDER_MAINTENANCE') {
      throw new ApiError(`Only missing, damaged, or maintenance items can be restored. Current status: ${currentStatus}.`, 400);
    }
  } else if (targetStatus === 'RETIRED') {
    if (currentStatus === 'OUT' || currentStatus === 'RESERVED') {
      throw new ApiError('Cannot retire items that are issued or reserved.', 400);
    }
  }

  const actionMap = {
    MISSING: 'MARK_MISSING' as const,
    DAMAGED: 'MARK_DAMAGED' as const,
    AVAILABLE: 'RESTORE' as const,
    UNDER_MAINTENANCE: 'MAINTENANCE_START' as const,
    RETIRED: 'RETIRE' as const,
  };
  const action = actionMap[targetStatus];
  const ts = nowIso();
  const txId = newInventoryTransactionId();
  const lastKnown = item.location;

  const locationUpdate =
    targetStatus === 'MISSING'
      ? 'Missing'
      : targetStatus === 'DAMAGED'
        ? 'Damaged'
        : targetStatus === 'UNDER_MAINTENANCE'
          ? 'Maintenance/Damaged Area'
          : targetStatus === 'RETIRED'
            ? 'Retired'
            : item.lastKnownLocation ?? item.location;

  const noteSuffix = input.repairCost ? ` Repair cost: ${input.repairCost}` : '';
  const combinedNotes = [input.notes?.trim(), noteSuffix.trim()].filter(Boolean).join(' ') || null;

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        id: txId,
        inventoryItemId: item.id,
        serialNumber,
        action,
        transactionDate: ts,
        fromLocation: item.location,
        toLocation: locationUpdate,
        person: updatedBy,
        reason: input.reason.trim(),
        bookingId: null,
        reference: null,
        condition: targetStatus === 'DAMAGED' ? 'Damaged' : item.condition,
        notes: combinedNotes,
        createdBy: updatedBy,
        createdAt: ts,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: targetStatus === 'AVAILABLE' ? 'AVAILABLE' : targetStatus,
        lastKnownLocation: targetStatus === 'AVAILABLE' ? locationUpdate : lastKnown,
        location: locationUpdate,
        currentHolder: null,
        activeBookingId: null,
        condition: targetStatus === 'DAMAGED' ? 'Damaged' : item.condition,
        updatedAt: ts,
      },
    }),
  ]);

  await appendAuditLog({
    action: action.toLowerCase(),
    entity: 'inventory_item',
    entityId: item.id,
    performedBy: updatedBy,
    details: `${action}: ${item.itemName} (${serialNumber})`,
    newValue: JSON.stringify({ status: targetStatus, lastKnownLocation: lastKnown }),
  });

  return prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
}

export type BulkInventoryItemInput = {
  itemName: string;
  category: string;
  serialNumber: string;
  location: string;
  condition?: string;
  purchaseDate?: string;
  purchaseReference?: string;
  supplier?: string;
  notes?: string;
  itemTypeId?: string;
};

export async function bulkCreateInventoryItems(items: BulkInventoryItemInput[], createdBy: string) {
  const created: Awaited<ReturnType<typeof createInventoryItem>>[] = [];
  const errors: { index: number; serialNumber: string; error: string }[] = [];

  for (let index = 0; index < items.length; index++) {
    const row = items[index];
    try {
      const item = await createInventoryItem(row, createdBy);
      created.push(item);
    } catch (err) {
      errors.push({
        index,
        serialNumber: row.serialNumber?.trim() || `row-${index + 1}`,
        error: err instanceof ApiError ? err.message : 'Could not create item.',
      });
    }
  }

  if (created.length > 0) {
    await appendAuditLog({
      action: 'bulk_create',
      entity: 'inventory_item',
      entityId: created[0].id,
      performedBy: createdBy,
      details: `Bulk import: ${created.length} item(s) added${errors.length ? `, ${errors.length} failed` : ''}`,
      newValue: JSON.stringify({ created: created.length, failed: errors.length }),
    });
  }

  return { created: created.length, items: created, errors, serialNumbers: created.map((i) => i.serialNumber) };
}

export async function createQuantityStockIn(
  input: {
    itemName: string;
    category: string;
    location: string;
    quantity: number;
    unit?: string;
    reason: string;
    reference?: string;
    notes?: string;
    supplier?: string;
    itemTypeId?: string;
  },
  createdBy: string,
) {
  if (input.quantity < 1) throw new ApiError('Quantity must be at least 1.', 400);

  const location = validateLocation(input.location);
  const category = validateCategory(input.category);
  const itemType = input.itemTypeId
    ? await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } })
    : await findOrCreateItemType(
        { name: input.itemName.trim(), category, unit: input.unit, serialTracking: false },
        createdBy,
      );
  if (!itemType) throw new ApiError('Item type not found.', 404);
  if (itemType.serialTracking) throw new ApiError('This item type uses serial tracking.', 400);

  const ts = nowIso();

  await prisma.$transaction(async (tx) => {
    const balance = await tx.inventoryStockBalance.findUnique({
      where: { itemTypeId_location: { itemTypeId: itemType.id, location } },
    });
    if (balance) {
      await tx.inventoryStockBalance.update({
        where: { id: balance.id },
        data: { quantity: balance.quantity + input.quantity, updatedAt: ts },
      });
    } else {
      await tx.inventoryStockBalance.create({
        data: {
          id: newStockBalanceId(),
          itemTypeId: itemType.id,
          location,
          quantity: input.quantity,
          updatedAt: ts,
        },
      });
    }

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: itemType.id,
        action: 'IN',
        quantity: input.quantity,
        fromLocation: 'Receiving',
        toLocation: location,
        bookingId: null,
        reason: input.reason.trim(),
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'quantity_stock_in',
    entity: 'inventory_item_type',
    entityId: itemType.id,
    performedBy: createdBy,
    details: `Stock IN: ${itemType.name} × ${input.quantity} at ${location}`,
  });

  return { itemTypeId: itemType.id, quantity: input.quantity, location };
}

export async function recordQuantityStockOut(
  input: {
    itemTypeId: string;
    location: string;
    quantity: number;
    reason: string;
    reference?: string;
    toLocation?: string;
    bookingId?: string;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.quantity < 1) throw new ApiError('Quantity must be at least 1.', 400);

  const itemType = await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } });
  if (!itemType) throw new ApiError('Item type not found.', 404);
  if (itemType.serialTracking) throw new ApiError('Use serial stock-out for tracked items.', 400);

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new ApiError('Related booking not found.', 400);
  }

  const ts = nowIso();
  const location = validateLocation(input.location);

  await prisma.$transaction(async (tx) => {
    const balance = await tx.inventoryStockBalance.findUnique({
      where: { itemTypeId_location: { itemTypeId: itemType.id, location } },
    });
    if (!balance || balance.quantity < input.quantity) {
      throw new ApiError(
        `Insufficient stock at ${location}. Available: ${balance?.quantity ?? 0}.`,
        400,
      );
    }

    await tx.inventoryStockBalance.update({
      where: { id: balance.id },
      data: { quantity: balance.quantity - input.quantity, updatedAt: ts },
    });

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: itemType.id,
        action: 'OUT',
        quantity: input.quantity,
        fromLocation: location,
        toLocation: input.toLocation?.trim() || 'External',
        bookingId: input.bookingId || null,
        reason: input.reason.trim(),
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'quantity_stock_out',
    entity: 'inventory_item_type',
    entityId: itemType.id,
    performedBy: createdBy,
    details: `Stock OUT: ${itemType.name} × ${input.quantity} from ${location}`,
  });

  return { itemTypeId: itemType.id, quantity: input.quantity, location };
}

export async function recordQuantityTransfer(
  input: {
    itemTypeId: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    reason: string;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.quantity < 1) throw new ApiError('Quantity must be at least 1.', 400);

  const fromLocation = validateLocation(input.fromLocation);
  const toLocation = validateLocation(input.toLocation);
  if (fromLocation === toLocation) throw new ApiError('From and to locations must differ.', 400);

  const itemType = await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } });
  if (!itemType) throw new ApiError('Item type not found.', 404);

  const ts = nowIso();

  await prisma.$transaction(async (tx) => {
    const fromBalance = await tx.inventoryStockBalance.findUnique({
      where: { itemTypeId_location: { itemTypeId: itemType.id, location: fromLocation } },
    });
    if (!fromBalance || fromBalance.quantity < input.quantity) {
      throw new ApiError(
        `Insufficient stock at ${fromLocation}. Available: ${fromBalance?.quantity ?? 0}.`,
        400,
      );
    }

    await tx.inventoryStockBalance.update({
      where: { id: fromBalance.id },
      data: { quantity: fromBalance.quantity - input.quantity, updatedAt: ts },
    });

    const toBalance = await tx.inventoryStockBalance.findUnique({
      where: { itemTypeId_location: { itemTypeId: itemType.id, location: toLocation } },
    });
    if (toBalance) {
      await tx.inventoryStockBalance.update({
        where: { id: toBalance.id },
        data: { quantity: toBalance.quantity + input.quantity, updatedAt: ts },
      });
    } else {
      await tx.inventoryStockBalance.create({
        data: {
          id: newStockBalanceId(),
          itemTypeId: itemType.id,
          location: toLocation,
          quantity: input.quantity,
          updatedAt: ts,
        },
      });
    }

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: itemType.id,
        action: 'TRANSFER',
        quantity: input.quantity,
        fromLocation,
        toLocation,
        bookingId: null,
        reason: input.reason.trim(),
        reference: null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'quantity_transfer',
    entity: 'inventory_item_type',
    entityId: itemType.id,
    performedBy: createdBy,
    details: `Transferred ${input.quantity} × ${itemType.name} from ${fromLocation} to ${toLocation}`,
  });

  return { itemTypeId: itemType.id, quantity: input.quantity, fromLocation, toLocation };
}

export async function recordInventoryAdjustment(
  input: {
    itemTypeId: string;
    location: string;
    adjustmentQty: number;
    reason: string;
    reference?: string;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.adjustmentQty === 0) throw new ApiError('Adjustment quantity cannot be zero.', 400);

  const itemType = await prisma.inventoryItemType.findUnique({ where: { id: input.itemTypeId } });
  if (!itemType) throw new ApiError('Item type not found.', 404);
  if (itemType.serialTracking) throw new ApiError('Use status changes for serialized adjustments.', 400);

  const ts = nowIso();
  const location = validateLocation(input.location);

  await prisma.$transaction(async (tx) => {
    const balance = await tx.inventoryStockBalance.findUnique({
      where: { itemTypeId_location: { itemTypeId: itemType.id, location } },
    });
    const current = balance?.quantity ?? 0;
    const next = current + input.adjustmentQty;
    if (next < 0) {
      throw new ApiError(`Adjustment would make stock negative. Current: ${current}.`, 400);
    }

    if (balance) {
      await tx.inventoryStockBalance.update({
        where: { id: balance.id },
        data: { quantity: next, updatedAt: ts },
      });
    } else if (input.adjustmentQty > 0) {
      await tx.inventoryStockBalance.create({
        data: {
          id: newStockBalanceId(),
          itemTypeId: itemType.id,
          location,
          quantity: input.adjustmentQty,
          updatedAt: ts,
        },
      });
    } else {
      throw new ApiError(`No stock at ${location} to reduce.`, 400);
    }

    await tx.inventoryQuantityMovement.create({
      data: {
        id: newQuantityMovementId(),
        itemTypeId: itemType.id,
        action: 'ADJUSTMENT',
        quantity: Math.abs(input.adjustmentQty),
        fromLocation: input.adjustmentQty < 0 ? location : null,
        toLocation: input.adjustmentQty > 0 ? location : null,
        bookingId: null,
        reason: input.reason.trim(),
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy,
        createdAt: ts,
      },
    });
  });

  await appendAuditLog({
    action: 'adjustment',
    entity: 'inventory_item_type',
    entityId: itemType.id,
    performedBy: createdBy,
    details: `Adjusted ${itemType.name} at ${location} by ${input.adjustmentQty}`,
    reason: input.reason,
  });

  return { itemTypeId: itemType.id, adjustmentQty: input.adjustmentQty, location };
}

export async function listQuantityMovements(filters?: {
  itemTypeId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.itemTypeId) where.itemTypeId = filters.itemTypeId;
  if (filters?.action) where.action = filters.action;
  if (filters?.fromDate || filters?.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: filters.fromDate } : {}),
      ...(filters.toDate ? { lte: filters.toDate } : {}),
    };
  }

  return prisma.inventoryQuantityMovement.findMany({
    where,
    include: { itemType: true },
    orderBy: { createdAt: 'desc' },
  });
}
