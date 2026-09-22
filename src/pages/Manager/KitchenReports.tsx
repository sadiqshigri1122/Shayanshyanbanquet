import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { modalInputClass } from '../../components/ModalField';
import { formatCurrency } from '../../utils/bookingUtils';
import { filterByDateRange, isLowStock } from '../../utils/inventoryUtils';
import { exportTableCsv } from '../../utils/inventoryUtils';

type DateRange = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function KitchenReports() {
  const { kitchenPurchases, kitchenStock } = useApp();
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

  const totalCost = filtered.reduce((s, p) => s + p.totalCost, 0);

  const bySupplier = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((p) => map.set(p.supplier, (map.get(p.supplier) ?? 0) + p.totalCost));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + p.totalCost));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const lowStock = kitchenStock.filter((s) => isLowStock(s.currentQuantity, s.minThreshold));

  const exportCsv = () => {
    const rows = filtered.map((p) => ({
      Date: p.purchaseDate,
      Item: p.item,
      Category: p.category,
      Quantity: p.quantity,
      Unit: p.unit,
      'Unit Cost': p.unitCost,
      Total: p.totalCost,
      Supplier: p.supplier,
      'Entered By': p.createdBy,
    }));
    exportTableCsv(rows, 'kitchen-purchases.csv');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Kitchen Reports</h1>
          <p className="text-sm text-muted">Purchases & stock overview</p>
        </div>
        <button type="button" className="btn-secondary !text-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['today', 'week', 'month', 'all', 'custom'] as DateRange[]).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${range === r ? 'bg-secondary text-white border-secondary' : 'border-border text-muted'}`}>
            {r === 'custom' ? 'Custom Range' : r === 'all' ? 'All Time' : r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {range === 'custom' && (
        <div className="flex gap-2">
          <input type="date" className={modalInputClass} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <input type="date" className={modalInputClass} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card"><p className="text-xs text-muted">Purchases</p><p className="text-2xl font-bold">{filtered.length}</p></div>
        <div className="card"><p className="text-xs text-muted">Total Cost</p><p className="text-2xl font-bold">{formatCurrency(totalCost)}</p></div>
        <div className="card"><p className="text-xs text-muted">Low Stock Items</p><p className="text-2xl font-bold text-warning">{lowStock.length}</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Supplier-wise</h3>
          <ul className="text-sm space-y-1">
            {bySupplier.map(([s, amt]) => <li key={s} className="flex justify-between"><span>{s}</span><strong>{formatCurrency(amt)}</strong></li>)}
          </ul>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Category-wise</h3>
          <ul className="text-sm space-y-1">
            {byCategory.map(([c, amt]) => <li key={c} className="flex justify-between"><span>{c}</span><strong>{formatCurrency(amt)}</strong></li>)}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Current Kitchen Stock</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Item</th>
                <th className="py-2">Current</th>
                <th className="py-2">Min</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {kitchenStock.map((s) => (
                <tr key={s.id} className="border-b border-surface-alt">
                  <td className="py-2">{s.item}</td>
                  <td className="py-2">{s.currentQuantity} {s.unit}</td>
                  <td className="py-2">{s.minThreshold} {s.unit}</td>
                  <td className="py-2">{isLowStock(s.currentQuantity, s.minThreshold) ? <span className="text-warning font-semibold">Low</span> : 'OK'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
