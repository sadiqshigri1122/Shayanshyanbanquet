import { describe, expect, it } from 'vitest';
import {
  assertValidStatusTransition,
  BookingStatusValidationError,
  calculateBookingTotals,
  calculateLineItemTotal,
  LineItemValidationError,
  parseBookingStatus,
  validateAndNormalizeLineItems,
  type LineItemInput,
} from './bookingLogic.js';

const item = (overrides: Partial<LineItemInput>): LineItemInput => ({
  serviceId: 's1',
  serviceName: 'Sound System',
  quantity: 1,
  unitPrice: 5000,
  total: 5000,
  ...overrides,
});

describe('calculateLineItemTotal', () => {
  it('multiplies quantity and unit price', () => {
    expect(calculateLineItemTotal(150, 150)).toBe(22500);
  });
});

describe('validateAndNormalizeLineItems', () => {
  it('accepts valid line items', () => {
    const result = validateAndNormalizeLineItems([
      item({ quantity: 2, unitPrice: 1000, total: 2000 }),
    ]);
    expect(result[0].total).toBe(2000);
  });

  it('rejects mismatched totals', () => {
    expect(() =>
      validateAndNormalizeLineItems([item({ quantity: 2, unitPrice: 1000, total: 1500 })]),
    ).toThrow(LineItemValidationError);
  });

  it('rejects empty lists', () => {
    expect(() => validateAndNormalizeLineItems([])).toThrow(LineItemValidationError);
  });
});

describe('booking status validation', () => {
  it('parses known statuses', () => {
    expect(parseBookingStatus('confirmed')).toBe('confirmed');
  });

  it('rejects unknown statuses', () => {
    expect(() => parseBookingStatus('hacked')).toThrow(BookingStatusValidationError);
  });

  it('allows confirmed → completed', () => {
    expect(() => assertValidStatusTransition('confirmed', 'completed')).not.toThrow();
  });

  it('blocks completed → confirmed', () => {
    expect(() => assertValidStatusTransition('completed', 'confirmed')).toThrow(
      BookingStatusValidationError,
    );
  });
});

describe('calculateBookingTotals', () => {
  it('sums from quantity × unitPrice, not client total field alone', () => {
    const services = validateAndNormalizeLineItems([
      item({ quantity: 150, unitPrice: 150, total: 22500 }),
      item({ serviceId: 's2', serviceName: 'Entry', quantity: 1, unitPrice: 2000, total: 2000 }),
    ]);
    expect(calculateBookingTotals(services, 500)).toEqual({
      subtotal: 24500,
      grandTotal: 24000,
    });
  });
});
