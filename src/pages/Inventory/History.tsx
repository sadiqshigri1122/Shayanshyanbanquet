import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { modalInputClass, modalSelectClass } from '../../components/ModalField';
import { formatInventoryDateTime } from '../../utils/inventoryUtils';

export default function InventoryHistory() {
  const { inventoryQuantityMovements, inventoryItemTypes } = useApp();
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  const typeNames = useMemo(
    () => new Map(inventoryItemTypes.map((t) => [t.id, t.name])),
    [inventoryItemTypes],
  );

  const rows = useMemo(() => {
    return [...inventoryQuantityMovements]
      .filter((m) => {
        if (actionFilter !== 'all' && m.action !== actionFilter) return false;
        const q = search.trim().toLowerCase();
        if (q) {
          const name = typeNames.get(m.itemTypeId)?.toLowerCase() ?? '';
          if (!name.includes(q) && !m.reason.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [inventoryQuantityMovements, actionFilter, search, typeNames]);

  const actions = [...new Set(inventoryQuantityMovements.map((m) => m.action))].sort();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Activity History</h1>
        <p className="text-sm text-muted">Stock in, counts, adjustments, and outside checkouts</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className={`${modalInputClass} flex-1`}
          placeholder="Search item or reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${modalSelectClass} sm:w-44`} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold">Date/Time</th>
              <th className="px-4 py-3 text-xs font-semibold">Action</th>
              <th className="px-4 py-3 text-xs font-semibold">Item</th>
              <th className="px-4 py-3 text-xs font-semibold">Qty</th>
              <th className="px-4 py-3 text-xs font-semibold">From → To</th>
              <th className="px-4 py-3 text-xs font-semibold">Reason</th>
              <th className="px-4 py-3 text-xs font-semibold">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No activity found.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-b border-surface-alt">
                  <td className="px-4 py-3 whitespace-nowrap">{formatInventoryDateTime(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface-alt text-primary">
                      {m.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{typeNames.get(m.itemTypeId) ?? m.itemTypeId}</td>
                  <td className="px-4 py-3 font-semibold">{m.quantity}</td>
                  <td className="px-4 py-3">{m.fromLocation ?? '—'} → {m.toLocation ?? '—'}</td>
                  <td className="px-4 py-3 text-muted max-w-[200px] truncate" title={m.reason}>{m.reason}</td>
                  <td className="px-4 py-3 text-muted">{m.createdBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
