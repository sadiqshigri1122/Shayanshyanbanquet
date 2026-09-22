import type { InventoryTransaction } from '../types';

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
