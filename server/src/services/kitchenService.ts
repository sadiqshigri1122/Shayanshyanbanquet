import { prisma } from '../lib/prisma.js';
import { appendAuditLog } from './stateService.js';
import { ApiError } from './bookingService.js';

function nowIso(): string {
  return new Date().toISOString();
}

export function newKitchenPurchaseId(): string {
  return `kp${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newKitchenStockId(): string {
  return `ks${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newKitchenUsageId(): string {
  return `ku${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export async function listKitchenPurchases() {
  return prisma.kitchenPurchase.findMany({ orderBy: { purchaseDate: 'desc' } });
}

export async function listKitchenStock() {
  return prisma.kitchenStock.findMany({ orderBy: { item: 'asc' } });
}

export async function listKitchenStockUsage() {
  return prisma.kitchenStockUsage.findMany({ orderBy: { usedAt: 'desc' } });
}

async function upsertKitchenStockFromPurchase(input: {
  item: string;
  category: string;
  unit: string;
  quantity: number;
  purchaseDate: string;
  unitCost: number;
}) {
  const ts = nowIso();
  const normalizedItem = input.item.trim();
  const existing = await prisma.kitchenStock.findUnique({ where: { item: normalizedItem } });

  if (existing) {
    if (existing.unit !== input.unit.trim()) {
      throw new ApiError(`Unit mismatch for "${normalizedItem}". Existing unit is ${existing.unit}.`, 400);
    }
    return prisma.kitchenStock.update({
      where: { item: normalizedItem },
      data: {
        currentQuantity: existing.currentQuantity + input.quantity,
        category: input.category.trim(),
        lastPurchaseDate: input.purchaseDate,
        lastPurchaseCost: input.unitCost,
        updatedAt: ts,
      },
    });
  }

  return prisma.kitchenStock.create({
    data: {
      id: newKitchenStockId(),
      item: normalizedItem,
      category: input.category.trim(),
      unit: input.unit.trim(),
      currentQuantity: input.quantity,
      minThreshold: 0,
      lastPurchaseDate: input.purchaseDate,
      lastPurchaseCost: input.unitCost,
      updatedAt: ts,
    },
  });
}

export async function createKitchenPurchase(
  input: {
    purchaseDate: string;
    item: string;
    category: string;
    quantity: number;
    unit: string;
    unitCost: number;
    supplier: string;
    purchasedBy: string;
    receivedBy: string;
    invoiceNumber?: string;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.quantity <= 0) throw new ApiError('Quantity must be greater than zero.', 400);
  if (input.unitCost < 0) throw new ApiError('Unit cost cannot be negative.', 400);

  const totalCost = Math.round(input.quantity * input.unitCost);
  const ts = nowIso();
  const id = newKitchenPurchaseId();

  const purchase = await prisma.kitchenPurchase.create({
    data: {
      id,
      purchaseDate: input.purchaseDate,
      item: input.item.trim(),
      category: input.category.trim(),
      quantity: input.quantity,
      unit: input.unit.trim(),
      unitCost: input.unitCost,
      totalCost,
      supplier: input.supplier.trim(),
      purchasedBy: input.purchasedBy.trim(),
      receivedBy: input.receivedBy.trim(),
      invoiceNumber: input.invoiceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      createdBy,
      createdAt: ts,
    },
  });

  await upsertKitchenStockFromPurchase({
    item: input.item,
    category: input.category,
    unit: input.unit,
    quantity: input.quantity,
    purchaseDate: input.purchaseDate,
    unitCost: input.unitCost,
  });

  await appendAuditLog({
    action: 'create',
    entity: 'kitchen_purchase',
    entityId: id,
    performedBy: createdBy,
    details: `Kitchen purchase: ${input.item} ${input.quantity} ${input.unit} — Rs. ${totalCost}`,
    newValue: JSON.stringify({ totalCost, supplier: input.supplier }),
  });

  return purchase;
}

export async function recordKitchenStockUsage(
  input: {
    item: string;
    quantity: number;
    reason?: string;
    bookingId?: string;
    usedBy: string;
    usedAt?: string;
  },
  createdBy: string,
) {
  if (input.quantity <= 0) throw new ApiError('Quantity must be greater than zero.', 400);

  const normalizedItem = input.item.trim();
  const stock = await prisma.kitchenStock.findUnique({ where: { item: normalizedItem } });
  if (!stock) throw new ApiError('Kitchen stock item not found.', 404);
  if (stock.currentQuantity < input.quantity) {
    throw new ApiError(`Insufficient stock. Available: ${stock.currentQuantity} ${stock.unit}`, 400);
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new ApiError('Related booking not found.', 400);
  }

  const ts = nowIso();
  const id = newKitchenUsageId();
  const usedAt = input.usedAt || ts.split('T')[0];

  await prisma.$transaction([
    prisma.kitchenStockUsage.create({
      data: {
        id,
        item: normalizedItem,
        quantity: input.quantity,
        unit: stock.unit,
        reason: input.reason?.trim() || null,
        bookingId: input.bookingId || null,
        usedBy: input.usedBy.trim(),
        usedAt,
        createdBy,
        createdAt: ts,
      },
    }),
    prisma.kitchenStock.update({
      where: { item: normalizedItem },
      data: {
        currentQuantity: stock.currentQuantity - input.quantity,
        updatedAt: ts,
      },
    }),
  ]);

  await appendAuditLog({
    action: 'kitchen_usage',
    entity: 'kitchen_stock_usage',
    entityId: id,
    performedBy: createdBy,
    details: `Kitchen stock used: ${normalizedItem} ${input.quantity} ${stock.unit}`,
  });

  return prisma.kitchenStock.findUniqueOrThrow({ where: { item: normalizedItem } });
}

export async function updateKitchenStockThreshold(
  item: string,
  minThreshold: number,
  updatedBy: string,
) {
  if (minThreshold < 0) throw new ApiError('Minimum threshold cannot be negative.', 400);

  const normalizedItem = item.trim();
  const stock = await prisma.kitchenStock.findUnique({ where: { item: normalizedItem } });
  if (!stock) throw new ApiError('Kitchen stock item not found.', 404);

  const updated = await prisma.kitchenStock.update({
    where: { item: normalizedItem },
    data: { minThreshold, updatedAt: nowIso() },
  });

  await appendAuditLog({
    action: 'update',
    entity: 'kitchen_stock',
    entityId: stock.id,
    performedBy: updatedBy,
    details: `Updated low-stock threshold for ${normalizedItem} to ${minThreshold}`,
  });

  return updated;
}
