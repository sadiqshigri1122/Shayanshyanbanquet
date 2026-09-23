import { describe, expect, it } from 'vitest';
import {
  buildInventorySummaries,
  normalizeInventoryStatus,
  previewQuantitySerials,
} from './inventoryUtils';
import type { InventoryItem } from '../types';

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, 'id' | 'serialNumber' | 'itemName'>): InventoryItem {
  return {
    category: 'Furniture',
    location: 'Store Room',
    status: 'AVAILABLE',
    createdBy: 'test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('inventoryUtils', () => {
  it('normalizes legacy IN and ISSUED statuses', () => {
    expect(normalizeInventoryStatus('IN')).toBe('AVAILABLE');
    expect(normalizeInventoryStatus('ISSUED')).toBe('OUT');
    expect(normalizeInventoryStatus('RESERVED')).toBe('RESERVED');
  });

  it('builds summaries with reserved and maintenance counts', () => {
    const items = [
      item({ id: '1', serialNumber: 'A-001', itemName: 'Chair', status: 'AVAILABLE', location: 'Hall A — Full' }),
      item({ id: '2', serialNumber: 'A-002', itemName: 'Chair', status: 'RESERVED' }),
      item({ id: '3', serialNumber: 'A-003', itemName: 'Chair', status: 'OUT' }),
      item({ id: '4', serialNumber: 'A-004', itemName: 'Chair', status: 'UNDER_MAINTENANCE' }),
    ];
    const summary = buildInventorySummaries(items)[0];
    expect(summary.total).toBe(4);
    expect(summary.available).toBe(1);
    expect(summary.reserved).toBe(1);
    expect(summary.out).toBe(1);
    expect(summary.underMaintenance).toBe(1);
    expect(summary.byLocation['Hall A — Full']).toBe(1);
  });

  it('generates unique serial previews', () => {
    const existing = new Set(['CHA-001']);
    const serials = previewQuantitySerials('Chair', 3, existing);
    expect(serials).toHaveLength(3);
    expect(new Set(serials).size).toBe(3);
    expect(existing.has(serials[0])).toBe(false);
  });
});
