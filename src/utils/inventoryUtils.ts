import type { InventoryItem, InventoryTransaction } from '../types';
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '../types';

/** Items OUT longer than this are flagged as overdue / missing */
export const INVENTORY_OVERDUE_DAYS = 3;

export interface BulkInventoryRow {
  itemName: string;
  category: string;
  serialNumber: string;
  location: string;
  purchaseDate?: string;
  supplier?: string;
  notes?: string;
}

export interface ParsedBulkRow extends BulkInventoryRow {
  rowNumber: number;
  errors: string[];
}

export function formatInventoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatInventoryDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTransactionLine(tx: InventoryTransaction): string {
  const date = formatInventoryDate(tx.transactionDate);
  return `${date} → ${tx.action} → ${tx.fromLocation} → ${tx.toLocation} → ${tx.person}`;
}

export function isLowStock(current: number, threshold: number): boolean {
  return threshold > 0 && current <= threshold;
}

export function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTableCsv(rows: Record<string, string | number>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((r) => headers.map((h) => escapeCsvField(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getLastOutTransaction(
  itemId: string,
  transactions: InventoryTransaction[],
): InventoryTransaction | undefined {
  return transactions
    .filter((t) => t.inventoryItemId === itemId && t.action === 'OUT')
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0];
}

export function getDaysOut(item: InventoryItem, transactions: InventoryTransaction[]): number | null {
  if (item.status !== 'OUT') return null;
  const lastOut = getLastOutTransaction(item.id, transactions);
  if (!lastOut) return null;
  const outDate = new Date(lastOut.transactionDate);
  if (Number.isNaN(outDate.getTime())) return null;
  return Math.floor((Date.now() - outDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdueOut(
  item: InventoryItem,
  transactions: InventoryTransaction[],
  overdueDays = INVENTORY_OVERDUE_DAYS,
): boolean {
  const days = getDaysOut(item, transactions);
  return days !== null && days >= overdueDays;
}

export function getOverdueOutItems(
  items: InventoryItem[],
  transactions: InventoryTransaction[],
  overdueDays = INVENTORY_OVERDUE_DAYS,
): Array<InventoryItem & { daysOut: number }> {
  return items
    .filter((i) => i.status === 'OUT')
    .map((i) => ({ item: i, daysOut: getDaysOut(i, transactions) }))
    .filter((x): x is { item: InventoryItem; daysOut: number } => x.daysOut !== null && x.daysOut >= overdueDays)
    .map(({ item, daysOut }) => ({ ...item, daysOut }))
    .sort((a, b) => b.daysOut - a.daysOut);
}

export function makeSerialPrefix(itemName: string, location: string): string {
  const namePart = itemName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM';
  const hallMatch = location.match(/Hall\s+([ABC])/i);
  const hallPart = hallMatch ? hallMatch[1].toUpperCase() : 'ST';
  const sectionMatch = location.match(/(Red|Gold|Silver|Diamond|Section\s*1|Section\s*2|Full)/i);
  const sectionRaw = sectionMatch?.[1]?.replace(/\s+/g, '') ?? 'GEN';
  const sectionPart = sectionRaw.slice(0, 3).toUpperCase();
  return `${namePart}-${hallPart}-${sectionPart}`;
}

export function generateSerialNumbers(
  prefix: string,
  quantity: number,
  existingSerials: Set<string>,
): { serialNumber: string; errors: string[] }[] {
  const cleanPrefix = prefix.trim().toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-');
  const pad = Math.max(3, String(quantity).length);
  const rows: { serialNumber: string; errors: string[] }[] = [];
  const used = new Set(existingSerials);

  for (let i = 1; i <= quantity; i++) {
    const serialNumber = `${cleanPrefix}-${String(i).padStart(pad, '0')}`;
    const errors: string[] = [];
    if (used.has(serialNumber)) errors.push('Serial already exists in system or batch.');
    used.add(serialNumber);
    rows.push({ serialNumber, errors });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const CSV_HEADERS = ['itemName', 'category', 'serialNumber', 'location', 'purchaseDate', 'supplier', 'notes'] as const;

export function buildInventoryTemplateCsv(): string {
  const sample = [
    'Wooden Chair',
    INVENTORY_CATEGORIES[4],
    'CHR-A-RED-001',
    INVENTORY_LOCATIONS.find((l) => l.includes('Hall A')) ?? INVENTORY_LOCATIONS[0],
    new Date().toISOString().split('T')[0],
    'Local Supplier',
    'Hall A Red section',
  ];
  return [CSV_HEADERS.join(','), sample.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\r\n');
}

export function parseInventoryCsv(
  text: string,
  existingSerials: Set<string>,
): { rows: ParsedBulkRow[]; parseErrors: string[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parseErrors: string[] = [];
  if (lines.length === 0) return { rows: [], parseErrors: ['File is empty.'] };

  const headerFields = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const headerMap: Record<string, number> = {};
  headerFields.forEach((h, i) => {
    if (h === 'itemname' || h === 'name') headerMap.itemName = i;
    if (h === 'category') headerMap.category = i;
    if (h === 'serialnumber' || h === 'serial') headerMap.serialNumber = i;
    if (h === 'location' || h === 'hall') headerMap.location = i;
    if (h === 'purchasedate' || h === 'date') headerMap.purchaseDate = i;
    if (h === 'supplier') headerMap.supplier = i;
    if (h === 'notes') headerMap.notes = i;
  });

  if (headerMap.itemName === undefined || headerMap.serialNumber === undefined || headerMap.location === undefined) {
    return {
      rows: [],
      parseErrors: ['CSV must include columns: itemName, serialNumber, location (category recommended).'],
    };
  }

  const validCategories = new Set<string>(INVENTORY_CATEGORIES);
  const validLocations = new Set<string>(INVENTORY_LOCATIONS);
  const seenSerials = new Set(existingSerials);
  const rows: ParsedBulkRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const rowNumber = i + 1;
    const get = (key: keyof typeof headerMap) =>
      headerMap[key] !== undefined ? (fields[headerMap[key]!] ?? '').trim() : '';

    const itemName = get('itemName');
    const category = get('category') || INVENTORY_CATEGORIES[INVENTORY_CATEGORIES.length - 1];
    const serialNumber = get('serialNumber');
    const location = get('location');
    const purchaseDate = get('purchaseDate') || undefined;
    const supplier = get('supplier') || undefined;
    const notes = get('notes') || undefined;

    const errors: string[] = [];
    if (!itemName) errors.push('Item name is required.');
    if (!serialNumber) errors.push('Serial number is required.');
    if (!location) errors.push('Location is required.');
    if (category && !validCategories.has(category)) errors.push(`Invalid category: ${category}`);
    if (location && !validLocations.has(location)) errors.push(`Invalid location: ${location}`);
    if (serialNumber) {
      if (seenSerials.has(serialNumber)) errors.push('Duplicate serial number.');
      seenSerials.add(serialNumber);
    }

    rows.push({ rowNumber, itemName, category, serialNumber, location, purchaseDate, supplier, notes, errors });
  }

  return { rows, parseErrors };
}

export function filterByDateRange(
  dateStr: string,
  range: 'today' | 'week' | 'month' | 'custom',
  customFrom?: string,
  customTo?: string,
): boolean {
  const today = new Date().toISOString().split('T')[0];
  if (range === 'today') return dateStr === today;
  if (range === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return dateStr >= weekAgo.toISOString().split('T')[0];
  }
  if (range === 'month') return dateStr >= monthStart();
  if (range === 'custom' && customFrom && customTo) {
    return dateStr >= customFrom && dateStr <= customTo;
  }
  return true;
}
