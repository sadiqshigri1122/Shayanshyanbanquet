import { Plus, Trash2 } from 'lucide-react';
import type { ManualLineItem } from '../utils/manualPricing';
import {
  createCustomRow,
  CUSTOM_CHARGE_SUGGESTIONS,
  sumManualRows,
} from '../utils/manualPricing';
import { formatCurrency } from '../utils/bookingUtils';

interface ManualPricingTableProps {
  rows: ManualLineItem[];
  onChange: (rows: ManualLineItem[]) => void;
  discount: number;
  onDiscountChange: (amount: number) => void;
  discountPercent: string;
  onDiscountPercentChange: (percent: string) => void;
  advancePaid: number;
  onAdvanceChange: (amount: number) => void;
  compact?: boolean;
}

export default function ManualPricingTable({
  rows,
  onChange,
  discount,
  onDiscountChange,
  discountPercent,
  onDiscountPercentChange,
  advancePaid,
  onAdvanceChange,
  compact,
}: ManualPricingTableProps) {
  const subtotal = sumManualRows(rows);
  const grandTotal = Math.max(0, subtotal - discount);
  const balance = Math.max(0, grandTotal - advancePaid);

  const updateRow = (idx: number, field: keyof ManualLineItem, value: string) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const removeRow = (idx: number) => {
    if (rows[idx].isDefaultRow) return;
    onChange(rows.filter((_, i) => i !== idx));
  };

  const addCustomRow = (particular = '') => {
    onChange([...rows, createCustomRow(particular)]);
  };

  const handleDiscountPercent = (pct: string) => {
    onDiscountPercentChange(pct);
    const n = parseFloat(pct);
    if (Number.isFinite(n) && n >= 0 && subtotal > 0) {
      onDiscountChange(Math.round((subtotal * n) / 100));
    } else if (!pct.trim()) {
      onDiscountChange(0);
    }
  };

  const handleDiscountAmount = (amount: number) => {
    onDiscountChange(amount);
    if (subtotal > 0) {
      onDiscountPercentChange(amount > 0 ? ((amount / subtotal) * 100).toFixed(1) : '');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        Enter negotiated amounts for this booking. Prices are not fixed — each booking can differ.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-[18%]">No. of Guests</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600">Particular / Service</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-[28%]">Amount (Rs.)</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={row.guestCount}
                    onChange={(e) => updateRow(idx, 'guestCount', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {row.isDefaultRow ? (
                    <span className="block px-2 py-1.5 font-medium text-gray-800">{row.particular}</span>
                  ) : (
                    <input
                      type="text"
                      placeholder="Description"
                      value={row.particular}
                      onChange={(e) => updateRow(idx, 'particular', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={row.amount}
                    onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-right font-medium focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </td>
                <td className="px-1 py-1.5 text-center">
                  {!row.isDefaultRow && (
                    <button type="button" onClick={() => removeRow(idx)} className="text-danger/70 hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addCustomRow()}
          className="flex items-center gap-1 text-xs text-secondary font-semibold hover:text-secondary-hover"
        >
          <Plus size={14} /> Add Custom Charge
        </button>
        {!compact && (
          <div className="flex flex-wrap gap-1">
            {CUSTOM_CHARGE_SUGGESTIONS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => addCustomRow(label)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-secondary-light hover:text-secondary"
              >
                + {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-xs">Discount (Rs.)</span>
            <input
              type="number"
              min={0}
              value={discount || ''}
              onChange={(e) => handleDiscountAmount(+e.target.value)}
              placeholder="Optional"
              className="w-24 border rounded px-2 py-1 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-xs">Discount (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => handleDiscountPercent(e.target.value)}
              placeholder="Optional"
              className="w-24 border rounded px-2 py-1 text-right text-xs"
            />
          </div>
        </div>
        <div className="flex justify-between font-bold text-primary text-base border-t pt-2">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Advance Received</span>
          <input
            type="number"
            min={0}
            value={advancePaid || ''}
            onChange={(e) => onAdvanceChange(+e.target.value)}
            placeholder="0"
            className="w-28 border rounded px-2 py-1 text-right text-sm"
          />
        </div>
        <div className="flex justify-between font-bold text-danger">
          <span>Remaining Balance</span>
          <span>{formatCurrency(balance)}</span>
        </div>
      </div>
    </div>
  );
}

export function getPricingFromRows(
  rows: ManualLineItem[],
  discount: number,
  advancePaid: number,
) {
  const subtotal = sumManualRows(rows);
  const grandTotal = Math.max(0, subtotal - discount);
  const remainingBalance = Math.max(0, grandTotal - advancePaid);
  return { subtotal, grandTotal, remainingBalance };
}
