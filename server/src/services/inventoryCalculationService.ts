import { prisma } from '../lib/prisma.js';
import {
  ACTIVE_INVENTORY_STATUSES,
  normalizeAssetStatus,
  type InventoryAssetStatus,
} from '../lib/inventoryConfig.js';

export interface InventoryMasterRow {
  itemTypeId: string;
  itemName: string;
  category: string;
  unit: string;
  serialTracking: boolean;
  total: number;
  available: number;
  reserved: number;
  issued: number;
  missing: number;
  damaged: number;
  underMaintenance: number;
  inTransit: number;
  retired: number;
  locations: string[];
  lastUpdated: string;
}

export interface LocationInventoryRow {
  location: string;
  itemTypeId: string;
  itemName: string;
  category: string;
  serialTracking: boolean;
  quantity: number;
  available: number;
  reserved: number;
  issued: number;
}

export interface InventoryDashboardMetrics {
  totalAssets: number;
  available: number;
  reserved: number;
  issued: number;
  missing: number;
  damaged: number;
  underMaintenance: number;
  inTransit: number;
  lowAvailability: Array<{ itemTypeId: string; itemName: string; available: number; total: number }>;
  byCategory: Array<{ category: string; total: number; available: number }>;
  byLocation: Array<{ location: string; total: number }>;
  recentMovements: Awaited<ReturnType<typeof getRecentMovements>>;
  missingItems: Awaited<ReturnType<typeof getMissingReport>>;
  damagedItems: Awaited<ReturnType<typeof getDamagedReport>>;
  upcomingEventLines: Awaited<ReturnType<typeof getUpcomingEventInventory>>;
}

function countByStatus(items: { status: string }[], status: InventoryAssetStatus): number {
  return items.filter((i) => normalizeAssetStatus(i.status) === status).length;
}

export async function computeSerializedMasterRows(): Promise<InventoryMasterRow[]> {
  const [types, assets] = await Promise.all([
    prisma.inventoryItemType.findMany({ orderBy: { name: 'asc' } }),
    prisma.inventoryItem.findMany(),
  ]);

  const assetsByType = new Map<string, typeof assets>();
  for (const asset of assets) {
    const key = asset.itemTypeId ?? `legacy:${asset.itemName}|${asset.category}`;
    const list = assetsByType.get(key) ?? [];
    list.push(asset);
    assetsByType.set(key, list);
  }

  const rows: InventoryMasterRow[] = [];

  for (const type of types.filter((t) => t.serialTracking)) {
    const typeAssets = assetsByType.get(type.id) ?? [];
    const active = typeAssets.filter((a) => normalizeAssetStatus(a.status) !== 'RETIRED');
    const locations = [...new Set(active.map((a) => a.location))].sort();
    const lastUpdated = typeAssets.reduce(
      (max, a) => (a.updatedAt > max ? a.updatedAt : max),
      type.updatedAt,
    );

    rows.push({
      itemTypeId: type.id,
      itemName: type.name,
      category: type.category,
      unit: type.unit,
      serialTracking: true,
      total: active.length,
      available: countByStatus(active, 'AVAILABLE'),
      reserved: countByStatus(active, 'RESERVED'),
      issued: countByStatus(active, 'OUT'),
      missing: countByStatus(active, 'MISSING'),
      damaged: countByStatus(active, 'DAMAGED'),
      underMaintenance: countByStatus(active, 'UNDER_MAINTENANCE'),
      inTransit: countByStatus(active, 'IN_TRANSIT'),
      retired: countByStatus(typeAssets, 'RETIRED'),
      locations,
      lastUpdated,
    });
  }

  // Legacy assets without itemTypeId
  const legacyAssets = assets.filter((a) => !a.itemTypeId);
  const legacyGroups = new Map<string, typeof legacyAssets>();
  for (const asset of legacyAssets) {
    const key = `${asset.itemName}|${asset.category}`;
    const list = legacyGroups.get(key) ?? [];
    list.push(asset);
    legacyGroups.set(key, list);
  }

  for (const [key, typeAssets] of legacyGroups) {
    const [itemName, category] = key.split('|');
    const active = typeAssets.filter((a) => normalizeAssetStatus(a.status) !== 'RETIRED');
    rows.push({
      itemTypeId: `legacy:${key}`,
      itemName,
      category,
      unit: 'unit',
      serialTracking: true,
      total: active.length,
      available: countByStatus(active, 'AVAILABLE'),
      reserved: countByStatus(active, 'RESERVED'),
      issued: countByStatus(active, 'OUT'),
      missing: countByStatus(active, 'MISSING'),
      damaged: countByStatus(active, 'DAMAGED'),
      underMaintenance: countByStatus(active, 'UNDER_MAINTENANCE'),
      inTransit: countByStatus(active, 'IN_TRANSIT'),
      retired: countByStatus(typeAssets, 'RETIRED'),
      locations: [...new Set(active.map((a) => a.location))].sort(),
      lastUpdated: typeAssets.reduce((max, a) => (a.updatedAt > max ? a.updatedAt : max), ''),
    });
  }

  return rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export async function computeQuantityMasterRows(): Promise<InventoryMasterRow[]> {
  const types = await prisma.inventoryItemType.findMany({
    where: { serialTracking: false },
    include: { stockBalances: true, eventLines: true },
    orderBy: { name: 'asc' },
  });

  return types.map((type) => {
    const totalQty = type.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
    const reservedQty = type.eventLines.reduce((sum, l) => sum + l.reservedQty - l.issuedQty, 0);
    const issuedQty = type.eventLines.reduce((sum, l) => sum + l.issuedQty - l.returnedQty, 0);
    const missingQty = type.eventLines.reduce((sum, l) => sum + l.missingQty, 0);
    const damagedQty = type.eventLines.reduce((sum, l) => sum + l.damagedQty, 0);
    const available = Math.max(0, totalQty - reservedQty - issuedQty);
    const locations = type.stockBalances.filter((b) => b.quantity > 0).map((b) => b.location);

    return {
      itemTypeId: type.id,
      itemName: type.name,
      category: type.category,
      unit: type.unit,
      serialTracking: false,
      total: totalQty,
      available,
      reserved: Math.max(0, reservedQty),
      issued: Math.max(0, issuedQty),
      missing: missingQty,
      damaged: damagedQty,
      underMaintenance: 0,
      inTransit: 0,
      retired: 0,
      locations: [...new Set(locations)].sort(),
      lastUpdated: type.updatedAt,
    };
  });
}

export async function getInventoryMaster(): Promise<InventoryMasterRow[]> {
  const [serialized, quantity] = await Promise.all([
    computeSerializedMasterRows(),
    computeQuantityMasterRows(),
  ]);
  return [...serialized, ...quantity].sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export async function getLocationInventory(location?: string): Promise<LocationInventoryRow[]> {
  const where = location ? { location: location.trim() } : undefined;
  const [assets, balances] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { itemType: true },
    }),
    prisma.inventoryStockBalance.findMany({
      where: location ? { location: location.trim(), quantity: { gt: 0 } } : { quantity: { gt: 0 } },
      include: { itemType: true },
    }),
  ]);

  const rows: LocationInventoryRow[] = [];

  const assetGroups = new Map<string, typeof assets>();
  for (const asset of assets.filter((a) => normalizeAssetStatus(a.status) !== 'RETIRED')) {
    const loc = asset.location;
    const key = `${loc}|${asset.itemTypeId ?? asset.itemName}|${asset.category}`;
    const list = assetGroups.get(key) ?? [];
    list.push(asset);
    assetGroups.set(key, list);
  }

  for (const [, group] of assetGroups) {
    const sample = group[0];
    rows.push({
      location: sample.location,
      itemTypeId: sample.itemTypeId ?? `legacy:${sample.itemName}|${sample.category}`,
      itemName: sample.itemName,
      category: sample.category,
      serialTracking: true,
      quantity: group.length,
      available: countByStatus(group, 'AVAILABLE'),
      reserved: countByStatus(group, 'RESERVED'),
      issued: countByStatus(group, 'OUT'),
    });
  }

  for (const balance of balances) {
    rows.push({
      location: balance.location,
      itemTypeId: balance.itemTypeId,
      itemName: balance.itemType.name,
      category: balance.itemType.category,
      serialTracking: false,
      quantity: balance.quantity,
      available: balance.quantity,
      reserved: 0,
      issued: 0,
    });
  }

  return rows.sort((a, b) => a.location.localeCompare(b.location) || a.itemName.localeCompare(b.itemName));
}

export async function countAvailableSerialized(itemTypeId: string, location?: string): Promise<number> {
  const where: Record<string, unknown> = {
    itemTypeId,
    status: { in: ['AVAILABLE', 'IN'] },
  };
  if (location) where.location = location.trim();

  const count = await prisma.inventoryItem.count({ where });
  return count;
}

export async function countAvailableQuantity(itemTypeId: string, location?: string): Promise<number> {
  if (location) {
    const balance = await prisma.inventoryStockBalance.findUnique({
      where: { itemTypeId_location: { itemTypeId, location: location.trim() } },
    });
    return balance?.quantity ?? 0;
  }

  const balances = await prisma.inventoryStockBalance.findMany({ where: { itemTypeId } });
  const totalStock = balances.reduce((sum, b) => sum + b.quantity, 0);

  const lines = await prisma.eventInventoryLine.findMany({ where: { itemTypeId } });
  const reserved = lines.reduce((sum, l) => sum + Math.max(0, l.reservedQty - l.issuedQty), 0);
  const issued = lines.reduce((sum, l) => sum + Math.max(0, l.issuedQty - l.returnedQty), 0);

  return Math.max(0, totalStock - reserved - issued);
}

export async function getRecentMovements(limit = 20) {
  const [assetTx, qtyTx] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      orderBy: { transactionDate: 'desc' },
      take: limit,
      include: { inventoryItem: { select: { itemName: true } } },
    }),
    prisma.inventoryQuantityMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { itemType: { select: { name: true } } },
    }),
  ]);

  const combined = [
    ...assetTx.map((t) => ({
      id: t.id,
      date: t.transactionDate,
      itemName: t.inventoryItem.itemName,
      serialNumber: t.serialNumber,
      quantity: 1,
      fromLocation: t.fromLocation,
      toLocation: t.toLocation,
      action: t.action,
      user: t.createdBy,
      reference: t.reference ?? t.bookingId ?? undefined,
      type: 'asset' as const,
    })),
    ...qtyTx.map((t) => ({
      id: t.id,
      date: t.createdAt,
      itemName: t.itemType.name,
      serialNumber: undefined as string | undefined,
      quantity: t.quantity,
      fromLocation: t.fromLocation ?? undefined,
      toLocation: t.toLocation ?? undefined,
      action: t.action,
      user: t.createdBy,
      reference: t.reference ?? t.bookingId ?? undefined,
      type: 'quantity' as const,
    })),
  ];

  return combined.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export async function getMissingReport() {
  const missingAssets = await prisma.inventoryItem.findMany({
    where: { status: 'MISSING' },
    orderBy: { updatedAt: 'desc' },
  });

  const results = [];
  for (const item of missingAssets) {
    const lastTx = await prisma.inventoryTransaction.findFirst({
      where: { inventoryItemId: item.id },
      orderBy: { transactionDate: 'desc' },
    });
    const lastEvent = item.activeBookingId
      ? await prisma.booking.findUnique({ where: { id: item.activeBookingId }, select: { bookingNumber: true, functionDate: true } })
      : lastTx?.bookingId
        ? await prisma.booking.findUnique({ where: { id: lastTx.bookingId }, select: { bookingNumber: true, functionDate: true } })
        : null;

    results.push({
      itemName: item.itemName,
      serialNumber: item.serialNumber,
      lastLocation: item.lastKnownLocation ?? item.location,
      lastEvent: lastEvent?.bookingNumber,
      lastEventDate: lastEvent?.functionDate,
      lastMovement: lastTx
        ? { action: lastTx.action, date: lastTx.transactionDate, user: lastTx.createdBy, from: lastTx.fromLocation, to: lastTx.toLocation }
        : null,
      status: item.status,
      notes: item.notes,
    });
  }

  const qtyLines = await prisma.eventInventoryLine.findMany({ where: { missingQty: { gt: 0 } } });
  for (const line of qtyLines) {
    results.push({
      itemName: line.itemName,
      serialNumber: undefined,
      missingQuantity: line.missingQty,
      lastEvent: line.bookingId,
      status: 'MISSING',
      notes: line.notes,
    });
  }

  return results;
}

export async function getDamagedReport() {
  const damaged = await prisma.inventoryItem.findMany({
    where: { status: 'DAMAGED' },
    orderBy: { updatedAt: 'desc' },
  });

  return damaged.map((item) => ({
    itemName: item.itemName,
    serialNumber: item.serialNumber,
    location: item.location,
    condition: item.condition,
    lastKnownLocation: item.lastKnownLocation,
    updatedAt: item.updatedAt,
    notes: item.notes,
  }));
}

export async function getUpcomingEventInventory(daysAhead = 14) {
  const today = new Date().toISOString().split('T')[0];
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const endStr = end.toISOString().split('T')[0];

  const bookings = await prisma.booking.findMany({
    where: {
      functionDate: { gte: today, lte: endStr },
      status: { in: ['confirmed', 'hold', 'tentative'] },
    },
    include: { eventInventoryLines: true },
    orderBy: { functionDate: 'asc' },
  });

  return bookings.flatMap((b) =>
    b.eventInventoryLines.map((line) => ({
      bookingId: b.id,
      bookingNumber: b.bookingNumber,
      functionDate: b.functionDate,
      venueName: b.venueName,
      itemName: line.itemName,
      requiredQty: line.requiredQty,
      reservedQty: line.reservedQty,
      issuedQty: line.issuedQty,
      status: line.status,
    })),
  );
}

export async function getDashboardMetrics(): Promise<InventoryDashboardMetrics> {
  const assets = await prisma.inventoryItem.findMany({
    where: { status: { in: ACTIVE_INVENTORY_STATUSES } },
  });

  const master = await getInventoryMaster();
  const lowAvailability = master
    .filter((m) => m.total > 0 && m.available / m.total <= 0.2)
    .map((m) => ({ itemTypeId: m.itemTypeId, itemName: m.itemName, available: m.available, total: m.total }));

  const byCategoryMap = new Map<string, { total: number; available: number }>();
  for (const row of master) {
    const cur = byCategoryMap.get(row.category) ?? { total: 0, available: 0 };
    cur.total += row.total;
    cur.available += row.available;
    byCategoryMap.set(row.category, cur);
  }

  const locationRows = await getLocationInventory();
  const byLocationMap = new Map<string, number>();
  for (const row of locationRows) {
    byLocationMap.set(row.location, (byLocationMap.get(row.location) ?? 0) + row.quantity);
  }

  const [recentMovements, missingItems, damagedItems, upcomingEventLines] = await Promise.all([
    getRecentMovements(15),
    getMissingReport(),
    getDamagedReport(),
    getUpcomingEventInventory(),
  ]);

  return {
    totalAssets: assets.length,
    available: countByStatus(assets, 'AVAILABLE'),
    reserved: countByStatus(assets, 'RESERVED'),
    issued: countByStatus(assets, 'OUT'),
    missing: countByStatus(assets, 'MISSING'),
    damaged: countByStatus(assets, 'DAMAGED'),
    underMaintenance: countByStatus(assets, 'UNDER_MAINTENANCE'),
    inTransit: countByStatus(assets, 'IN_TRANSIT'),
    lowAvailability,
    byCategory: [...byCategoryMap.entries()].map(([category, v]) => ({ category, ...v })),
    byLocation: [...byLocationMap.entries()].map(([location, total]) => ({ location, total })),
    recentMovements,
    missingItems,
    damagedItems,
    upcomingEventLines,
  };
}

export async function getSerialAssetReport(filters?: {
  status?: string;
  location?: string;
  itemTypeId?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.location) where.location = filters.location.trim();
  if (filters?.itemTypeId) where.itemTypeId = filters.itemTypeId;

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: [{ itemName: 'asc' }, { serialNumber: 'asc' }],
  });

  return items.map((item) => ({
    serialNumber: item.serialNumber,
    itemName: item.itemName,
    category: item.category,
    location: item.location,
    status: normalizeAssetStatus(item.status),
    condition: item.condition,
    activeBookingId: item.activeBookingId,
    currentHolder: item.currentHolder,
    updatedAt: item.updatedAt,
  }));
}
