import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { modalInputClass } from '../../components/ModalField';
import { formatCurrency } from '../../utils/bookingUtils';
import { filterByDateRange } from '../../utils/inventoryUtils';

type DateRange = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function KitchenPurchaseHistory() {
  const { kitchenPurchases } = useApp();
  const [range, setRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const filtered = useMemo(() => {
    return kitchenPurchases.filter((p) => {
      if (range === 'all') return true;
      if (range === 'custom') return filterByDateRange(p.purchaseDate, 'custom', customFrom, customTo);
      return filterByDateRange(p.purchaseDate, range);
    });
  }, [kitchenPurchases, range, customFrom, customTo]);

  const total = filtered.reduce((s, p) => s + p.totalCost, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Purchase History</h1>
          <p className="text-sm text-muted">Total: {formatCurrency(total)} ({filtered.length} records)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'all', 'custom'] as DateRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${range === r ? 'bg-secondary text-white border-secondary' : 'border-border text-muted'}`}
            >
              {r === 'custom' ? 'Custom' : r === 'all' ? 'All' : r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {range === 'custom' && (
        <div className="flex flex-wrap gap-3">
          <input type="date" className={modalInputClass} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <input type="date" className={modalInputClass} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold">Date</th>
              <th className="px-4 py-3 text-xs font-semibold">Item</th>
              <th className="px-4 py-3 text-xs font-semibold">Qty</th>
              <th className="px-4 py-3 text-xs font-semibold">Unit Cost</th>
              <th className="px-4 py-3 text-xs font-semibold">Total</th>
              <th className="px-4 py-3 text-xs font-semibold">Supplier</th>
              <th className="px-4 py-3 text-xs font-semibold">Entered By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No purchases in this period.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-surface-alt">
                  <td className="px-4 py-3">{p.purchaseDate}</td>
                  <td className="px-4 py-3 font-medium">{p.item}</td>
                  <td className="px-4 py-3">{p.quantity} {p.unit}</td>
                  <td className="px-4 py-3">{formatCurrency(p.unitCost)}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(p.totalCost)}</td>
                  <td className="px-4 py-3">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted">{p.createdBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
