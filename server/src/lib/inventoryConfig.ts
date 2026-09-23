/** Server-side inventory constants (mirrors frontend types) */

export const INVENTORY_CATEGORIES = [
  'Kitchen Equipment',
  'Electronics',
  'Furniture',
  'Generator',
  'Appliances',
  'Other',
] as const;

export const INVENTORY_STORAGE_LOCATIONS = [
  'Kitchen Store',
  'Kitchen',
  'Store Room',
  'Office',
  'Receiving',
  'Main Storage',
  'Maintenance/Damaged Area',
] as const;

/** Hall section labels — must match frontend HALL_SUB_VENUES locations */
export const INVENTORY_HALL_LOCATIONS = [
  'Hall A — Red Section',
  'Hall A — Gold Section',
  'Hall A — Full',
  'Hall B — Section 1',
  'Hall B — Section 2',
  'Hall B — Full',
  'Hall C — Silver Section',
  'Hall C — Diamond Section',
  'Hall C — Full',
] as const;

export const INVENTORY_LOCATIONS = [
  ...INVENTORY_STORAGE_LOCATIONS,
  ...INVENTORY_HALL_LOCATIONS,
] as const;

export type InventoryAssetStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OUT'
  | 'IN_TRANSIT'
  | 'MISSING'
  | 'DAMAGED'
  | 'UNDER_MAINTENANCE'
  | 'RETIRED';

export const INVENTORY_ASSET_STATUSES: InventoryAssetStatus[] = [
  'AVAILABLE',
  'RESERVED',
  'OUT',
  'IN_TRANSIT',
  'MISSING',
  'DAMAGED',
  'UNDER_MAINTENANCE',
  'RETIRED',
];

export const ACTIVE_INVENTORY_STATUSES: InventoryAssetStatus[] = [
  'AVAILABLE',
  'RESERVED',
  'OUT',
  'IN_TRANSIT',
  'MISSING',
  'DAMAGED',
  'UNDER_MAINTENANCE',
];

export type EventInventoryLineStatus =
  | 'REQUIRED'
  | 'RESERVED'
  | 'ISSUED'
  | 'RETURNED'
  | 'RECONCILED';

export function isValidLocation(location: string): boolean {
  return (INVENTORY_LOCATIONS as readonly string[]).includes(location.trim());
}

export function isValidCategory(category: string): boolean {
  return (INVENTORY_CATEGORIES as readonly string[]).includes(category.trim());
}

export function normalizeAssetStatus(status: string): InventoryAssetStatus {
  if (status === 'IN') return 'AVAILABLE';
  if (status === 'ISSUED') return 'OUT';
  if ((INVENTORY_ASSET_STATUSES as readonly string[]).includes(status)) {
    return status as InventoryAssetStatus;
  }
  return 'AVAILABLE';
}

export function assertValidLocation(location: string, field = 'location'): void {
  if (!isValidLocation(location)) {
    throw new Error(`Invalid ${field}: ${location}`);
  }
}
