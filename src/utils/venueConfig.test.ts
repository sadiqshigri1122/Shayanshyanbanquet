import { describe, expect, it } from 'vitest';
import { venuesConflict } from './venueConfig';

describe('venueConfig', () => {
  it('same venue always conflicts', () => {
    expect(venuesConflict('va-red', 'va-red')).toBe(true);
  });

  it('different groups do not conflict', () => {
    expect(venuesConflict('va-red', 'vb1')).toBe(false);
    expect(venuesConflict('va-red', 'vc-silver')).toBe(false);
  });

  it('full hall conflicts with any section in group', () => {
    expect(venuesConflict('va-full', 'va-red')).toBe(true);
    expect(venuesConflict('va-red', 'va-full')).toBe(true);
    expect(venuesConflict('vb-full', 'vb1')).toBe(true);
  });

  it('adjacent sections in same group can coexist', () => {
    expect(venuesConflict('va-red', 'va-gold')).toBe(false);
    expect(venuesConflict('vb1', 'vb2')).toBe(false);
    expect(venuesConflict('vc-silver', 'vc-diamond')).toBe(false);
  });
});
