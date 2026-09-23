import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';
import { modalInputClass } from '../../components/ModalField';
import {
  formatInventoryDate,
  formatInventoryDateTime,
  formatTransactionLine,
  filterByDateRange,
  getDaysOut,
  getOverdueOutItems,
  INVENTORY_OVERDUE_DAYS,
} from '../../utils/inventoryUtils';
import { exportTableCsv } from '../../utils/inventoryUtils';

type DateRange = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function InventoryReports() {
  const { inventoryItems, inventoryTransactions, searchInventoryBySerial } = useApp();
  const [serialQuery, setSerialQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Awaited<ReturnType<typeof searchInventoryBySerial>> | null>(null);
  const [searchError, setSearchError] = useState('');
  const [range, setRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const itemsIn = inventoryItems.filter((i) => i.status === 'IN').length;
  const itemsOut = inventoryItems.filter((i) => i.status === 'OUT').length;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    inventoryItems.forEach((i) => map.set(i.category, (map.get(i.category) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [inventoryItems]);

  const byLocation = useMemo(() => {
    const map = new Map<string, number>();
    inventoryItems.forEach((i) => map.set(i.location, (map.get(i.location) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [inventoryItems]);

  const byHolder = useMemo(() => {
    const map = new Map<string, number>();
    inventoryItems.filter((i) => i.status === 'OUT' && i.currentHolder).forEach((i) => {
      map.set(i.currentHolder!, (map.get(i.currentHolder!) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [inventoryItems]);

  const filteredTx = useMemo(() => {
    return inventoryTransactions.filter((tx) => {
      if (range === 'all') return true;
      const date = tx.transactionDate.split('T')[0];
      if (range === 'custom') return filterByDateRange(date, 'custom', customFrom, customTo);
      return filterByDateRange(date, range);
    });
  }, [inventoryTransactions, range, customFrom, customTo]);

  const userActivity = useMemo(() => {
    const map = new Map<string, number>();
    filteredTx.forEach((tx) => map.set(tx.createdBy, (map.get(tx.createdBy) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredTx]);

  const overdueItems = useMemo(
    () => getOverdueOutItems(inventoryItems, inventoryTransactions),
    [inventoryItems, inventoryTransactions],
  );

  const itemsCurrentlyOut = useMemo(
    () =>
      inventoryItems
        .filter((i) => i.status === 'OUT')
        .map((i) => ({ ...i, daysOut: getDaysOut(i, inventoryTransactions) }))
        .sort((a, b) => (b.daysOut ?? 0) - (a.daysOut ?? 0)),
    [inventoryItems, inventoryTransactions],
  );

  const handleSearch = async () => {
    setSearchError('');
    setSearchResult(null);
    if (!serialQuery.trim()) return;
    try {
      const result = await searchInventoryBySerial(serialQuery.trim());
      setSearchResult(result);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const exportCsv = () => {
    const rows = filteredTx.map((tx) => {
      const item = inventoryItems.find((i) => i.id === tx.inventoryItemId);
      return {
        Date: formatInventoryDateTime(tx.transactionDate),
        Action: tx.action,
        Serial: tx.serialNumber,
        Item: item?.itemName ?? '',
        From: tx.fromLocation,
        To: tx.toLocation,
        Person: tx.person,
        'Entered By': tx.createdBy,
      };
    });
    exportTableCsv(rows, 'inventory-movements.csv');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Inventory Reports</h1>
          <p className="text-sm text-muted">Track what exists, who has it, and what is overdue</p>
        </div>
        <button type="button" className="btn-secondary !text-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      {overdueItems.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <h2 className="font-semibold text-warning mb-2">
            {overdueItems.length} item(s) overdue (OUT {INVENTORY_OVERDUE_DAYS}+ days)
          </h2>
          <p className="text-sm text-muted mb-3">These may be lost or forgotten — follow up immediately.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Serial</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Holder</th>
                  <th className="py-2">Location</th>
                  <th className="py-2">Days OUT</th>
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((i) => (
                  <tr key={i.id} className="border-b border-surface-alt">
                    <td className="py-2 font-mono text-xs">{i.serialNumber}</td>
                    <td className="py-2">{i.itemName}</td>
                    <td className="py-2 font-semibold">{i.currentHolder ?? '—'}</td>
                    <td className="py-2">{i.location}</td>
                    <td className="py-2 text-warning font-semibold">{i.daysOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-primary mb-3">Who Has What (Currently OUT)</h2>
        {itemsCurrentlyOut.length === 0 ? (
          <p className="text-sm text-muted">All items are IN storage.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Serial</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Taken By</th>
                  <th className="py-2">At Location</th>
                  <th className="py-2">Days OUT</th>
                </tr>
              </thead>
              <tbody>
                {itemsCurrentlyOut.map((i) => (
                  <tr key={i.id} className="border-b border-surface-alt">
                    <td className="py-2 font-mono text-xs">{i.serialNumber}</td>
                    <td className="py-2">{i.itemName}</td>
                    <td className="py-2 font-medium">{i.currentHolder ?? '—'}</td>
                    <td className="py-2">{i.location}</td>
                    <td className="py-2">{i.daysOut ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-primary mb-3">Serial Number Search</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={`${modalInputClass} flex-1`}
            placeholder="SN-KIT-1002"
            value={serialQuery}
            onChange={(e) => setSerialQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          />
          <button type="button" className="btn-primary" onClick={() => void handleSearch()}>Search</button>
        </div>
        {searchError && <p className="text-danger text-sm mt-2">{searchError}</p>}
        {searchResult && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-muted">Item:</span> {searchResult.item.itemName}</p>
              <p><span className="text-muted">Serial:</span> {searchResult.item.serialNumber}</p>
              <p className="flex items-center gap-2"><span className="text-muted">Status:</span> <InventoryStatusBadge status={searchResult.item.status} /></p>
              <p><span className="text-muted">Holder:</span> {searchResult.item.currentHolder ?? '—'}</p>
              <p><span className="text-muted">Location:</span> {searchResult.item.location}</p>
              <p><span className="text-muted">Last Movement:</span> {formatInventoryDate(searchResult.transactions[0]?.transactionDate ?? searchResult.item.updatedAt)}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Complete History</h3>
              <ul className="space-y-1 text-sm">
                {searchResult.transactions.map((tx) => (
                  <li key={tx.id} className="text-muted">
                    {formatTransactionLine(tx)}
                    <span className="text-xs block">Entered by {tx.createdBy} · {formatInventoryDateTime(tx.transactionDate)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: inventoryItems.length },
          { label: 'Items IN', value: itemsIn },
          { label: 'Items OUT', value: itemsOut },
          { label: 'Movements', value: filteredTx.length },
        ].map((k) => (
          <div key={k.label} className="card !py-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className="text-2xl font-bold text-primary">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-2">By Category</h3>
          <ul className="text-sm space-y-1">
            {byCategory.map(([cat, n]) => <li key={cat}>{cat}: <strong>{n}</strong></li>)}
          </ul>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-2">By Location</h3>
          <ul className="text-sm space-y-1">
            {byLocation.map(([loc, n]) => <li key={loc}>{loc}: <strong>{n}</strong></li>)}
          </ul>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-2">Held by Staff (OUT)</h3>
          <ul className="text-sm space-y-1">
            {byHolder.length === 0 ? <li className="text-muted">None</li> : byHolder.map(([h, n]) => <li key={h}>{h}: <strong>{n}</strong></li>)}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['today', 'week', 'month', 'all', 'custom'] as DateRange[]).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${range === r ? 'bg-secondary text-white border-secondary' : 'border-border text-muted'}`}>
              {r === 'custom' ? 'Custom' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex gap-2 mb-4">
            <input type="date" className={modalInputClass} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <input type="date" className={modalInputClass} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
        <h3 className="text-sm font-semibold mb-2">User-wise Activity</h3>
        <ul className="text-sm flex flex-wrap gap-4 mb-6">
          {userActivity.map(([user, n]) => <li key={user}>{user}: <strong>{n}</strong> transactions</li>)}
        </ul>

        <h3 className="text-sm font-semibold mb-2">Movement Log</h3>
        {filteredTx.length === 0 ? (
          <p className="text-sm text-muted">No movements in this period.</p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-border text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Serial</th>
                  <th className="py-2">Person</th>
                  <th className="py-2">From → To</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.slice(0, 100).map((tx) => {
                  const item = inventoryItems.find((i) => i.id === tx.inventoryItemId);
                  return (
                    <tr key={tx.id} className="border-b border-surface-alt">
                      <td className="py-2">{formatInventoryDateTime(tx.transactionDate)}</td>
                      <td className="py-2"><InventoryStatusBadge status={tx.action} /></td>
                      <td className="py-2 font-mono text-xs">{tx.serialNumber}</td>
                      <td className="py-2">{tx.person}</td>
                      <td className="py-2 text-muted">{item?.itemName ?? '—'} · {tx.fromLocation} → {tx.toLocation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
