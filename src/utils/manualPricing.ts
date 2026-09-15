import type { BookingService } from '../types';

/** Pre-printed rows on the paper booking slip — amounts are always entered manually */
export const DEFAULT_CHARGE_ROWS = [
  'Booking Charges',
  'Sound System',
  'Entry',
  'Cold Drink',
  'Mineral Water',
] as const;

/** Quick-add labels for custom charges (no fixed price) */
export const CUSTOM_CHARGE_SUGGESTIONS = [
  'Decoration',
  'Generator',
  'Extra Chairs',
  'Catering',
  'Parking',
  'Photography',
  'Lighting',
  'Stage',
  'Security',
  'Other',
];

export interface ManualLineItem {
  id: string;
  particular: string;
  guestCount: string;
  amount: string;
  isDefaultRow: boolean;
  isEventDayAddition?: boolean;
}

let rowId = 0;
export function newRowId(): string {
  rowId += 1;
  return `row-${Date.now()}-${rowId}`;
}

export function createDefaultManualRows(): ManualLineItem[] {
  return DEFAULT_CHARGE_ROWS.map((particular) => ({
    id: newRowId(),
    particular,
    guestCount: '',
    amount: '',
    isDefaultRow: true,
  }));
}

export function createCustomRow(particular = ''): ManualLineItem {
  return {
    id: newRowId(),
    particular,
    guestCount: '',
    amount: '',
    isDefaultRow: false,
  };
}

export function parseAmount(value: string): number {
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sumManualRows(rows: ManualLineItem[]): number {
  return rows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
}

/** Convert manual form rows → booking line items (booking-specific negotiated amounts) */
export function manualRowsToServices(
  rows: ManualLineItem[],
  enteredBy: string,
): BookingService[] {
  const now = new Date().toISOString();
  return rows
    .filter((row) => parseAmount(row.amount) > 0 && row.particular.trim())
    .map((row) => {
      const total = parseAmount(row.amount);
      const guests = row.guestCount.trim() ? parseInt(row.guestCount, 10) : undefined;
      return {
        serviceId: row.isDefaultRow
          ? `default-${row.particular.toLowerCase().replace(/\s+/g, '-')}`
          : `custom-${row.id}`,
        serviceName: row.particular.trim(),
        guestCount: guests && !Number.isNaN(guests) ? guests : undefined,
        quantity: 1,
        unitPrice: total,
        total,
        enteredBy,
        enteredAt: now,
        isEventDayAddition: row.isEventDayAddition,
      };
    });
}

/** Hydrate manual form from saved booking line items */
export function servicesToManualRows(services: BookingService[]): ManualLineItem[] {
  const used = new Set<string>();
  const rows: ManualLineItem[] = DEFAULT_CHARGE_ROWS.map((particular) => {
    const match = services.find(
      (s) =>
        s.serviceName.toLowerCase() === particular.toLowerCase() ||
        s.serviceName.toLowerCase().includes(particular.toLowerCase().split(' ')[0]),
    );
    if (match) used.add(match.serviceId);
    return {
      id: newRowId(),
      particular,
      guestCount: match?.guestCount != null ? String(match.guestCount) : '',
      amount: match ? String(match.total) : '',
      isDefaultRow: true,
    };
  });

  services
    .filter((s) => !used.has(s.serviceId))
    .forEach((s) => {
      rows.push({
        id: newRowId(),
        particular: s.serviceName,
        guestCount: s.guestCount != null ? String(s.guestCount) : '',
        amount: String(s.total),
        isDefaultRow: false,
        isEventDayAddition: s.isEventDayAddition,
      });
    });

  return rows;
}

/** Optional catalogue hint only — never applied automatically */
export function getSuggestedAmount(
  particular: string,
  suggestions: Record<string, number>,
): string | undefined {
  const key = particular.toLowerCase();
  const match = Object.entries(suggestions).find(([k]) => key.includes(k) || k.includes(key));
  return match ? String(match[1]) : undefined;
}
