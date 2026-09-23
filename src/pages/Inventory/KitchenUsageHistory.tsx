import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { modalInputClass, modalSelectClass } from '../../components/ModalField';
import { filterByDateRange } from '../../utils/inventoryUtils';

type DateRange = 'today' | 'week' | 'month' | 'all';

export default function KitchenUsageHistory() {
  const { kitchenStockUsage, kitchenStock } = useApp();
  const [search, setSearch] = useState('');
  const [itemFilter, setItemFilter] = useState('all');
  const [range, setRange] = useState<DateRange>('month');

  const filtered = useMemo(() => {
    return [...kitchenStockUsage]
      .filter((u) => {
        if (itemFilter !== 'all' && u.item !== itemFilter) return false;
        if (range !== 'all' && !filterByDateRange(u.usedAt, range)) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return u.item.toLowerCase().includes(q) || u.usedBy.toLowerCase().includes(q) || (u.reason?.toLowerCase().includes(q) ?? false);
      })
      .sort((a, b) => b.usedAt.localeCompare(a.usedAt));
  }, [kitchenStockUsage, itemFilter, range, search]);

  const totalQty = filtered.reduce((s, u) => s + u.quantity, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Kitchen Usage History</h1>
        <p className="text-sm text-muted">Who used what, when — helps prevent stock loss</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input className={`${modalInputClass} flex-1`} placeholder="Search item, person, reason…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${modalSelectClass} sm:w-48`} value={itemFilter} onChange={(e) => setItemFilter(e.target.value)}>
          <option value="all">All items</option>
          {kitchenStock.map((s) => <option key={s.id} value={s.item}>{s.item}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['today', 'week', 'month', 'all'] as DateRange[]).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${range === r ? 'bg-secondary text-white border-secondary' : 'border-border text-muted'}`}>
            {r === 'all' ? 'All Time' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">{filtered.length} records · {totalQty} units used</p>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold">Date</th>
              <th className="px-4 py-3 text-xs font-semibold">Item</th>
              <th className="px-4 py-3 text-xs font-semibold">Qty</th>
              <th className="px-4 py-3 text-xs font-semibold">Used By</th>
              <th className="px-4 py-3 text-xs font-semibold">Reason</th>
              <th className="px-4 py-3 text-xs font-semibold">Entered By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No usage records.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-surface-alt">
                  <td className="px-4 py-3">{u.usedAt}</td>
                  <td className="px-4 py-3 font-medium">{u.item}</td>
                  <td className="px-4 py-3">{u.quantity} {u.unit}</td>
                  <td className="px-4 py-3">{u.usedBy}</td>
                  <td className="px-4 py-3 text-muted">{u.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{u.createdBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
