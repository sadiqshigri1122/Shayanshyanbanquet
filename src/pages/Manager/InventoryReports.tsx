import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';
import InventoryItemDetailModal from '../../components/InventoryItemDetailModal';
import { modalInputClass } from '../../components/ModalField';
import {
  buildInventorySummaries,
  formatInventoryDateTime,
  formatTransactionLine,
  filterByDateRange,
  getDaysOut,
  getMissingItemDetails,
  getOverdueOutItems,
  INVENTORY_OVERDUE_DAYS,
  normalizeInventoryStatus,
} from '../../utils/inventoryUtils';
import { exportTableCsv } from '../../utils/inventoryUtils';

type DateRange = 'today' | 'week' | 'month' | 'custom' | 'all';
type StatusDrilldown = 'missing' | 'damaged' | null;

export default function InventoryReports() {
  const {
    inventoryItems,
    inventoryTransactions,
    searchInventoryBySerial,
    updateInventoryItemStatus,
  } = useApp();
  const [serialQuery, setSerialQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Awaited<ReturnType<typeof searchInventoryBySerial>> | null>(null);
  const [searchError, setSearchError] = useState('');
  const [range, setRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [statusDrilldown, setStatusDrilldown] = useState<StatusDrilldown>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const normalizedItems = useMemo(
    () => inventoryItems.map((i) => ({ ...i, status: normalizeInventoryStatus(i.status) })),
    [inventoryItems],
  );

  const summaries = useMemo(() => buildInventorySummaries(normalizedItems), [normalizedItems]);
  const missingDetails = useMemo(
    () => getMissingItemDetails(normalizedItems, inventoryTransactions),
    [normalizedItems, inventoryTransactions],
  );
  const damagedItems = useMemo(
    () => normalizedItems.filter((i) => i.status === 'DAMAGED'),
    [normalizedItems],
  );

  const itemsAvailable = normalizedItems.filter((i) => i.status === 'AVAILABLE').length;
  const itemsMissing = normalizedItems.filter((i) => i.status === 'MISSING').length;
  const itemsDamaged = normalizedItems.filter((i) => i.status === 'DAMAGED').length;
  const itemsOut = normalizedItems.filter((i) => i.status === 'OUT').length;

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
    () => getOverdueOutItems(normalizedItems, inventoryTransactions),
    [normalizedItems, inventoryTransactions],
  );

  const itemsCurrentlyOut = useMemo(
    () =>
      normalizedItems
        .filter((i) => i.status === 'OUT')
        .map((i) => ({ ...i, daysOut: getDaysOut(i, inventoryTransactions) }))
        .sort((a, b) => (b.daysOut ?? 0) - (a.daysOut ?? 0)),
    [normalizedItems, inventoryTransactions],
  );

  const detailItem = detailId ? normalizedItems.find((i) => i.id === detailId) : null;

  const handleSearch = async () => {
    setSearchError('');
    setSearchResult(null);
    if (!serialQuery.trim()) return;
    try {
      const result = await searchInventoryBySerial(serialQuery.trim());
      setSearchResult({
        ...result,
        item: { ...result.item, status: normalizeInventoryStatus(result.item.status) },
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const exportCsv = () => {
    const rows = filteredTx.map((tx) => {
      const item = normalizedItems.find((i) => i.id === tx.inventoryItemId);
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
          <p className="text-sm text-muted">Auto-calculated summaries by item type, location, and status</p>
        </div>
        <button type="button" className="btn-secondary !text-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Items', value: normalizedItems.length },
          { label: 'Available', value: itemsAvailable, onClick: undefined },
          { label: 'Missing', value: itemsMissing, onClick: () => setStatusDrilldown('missing') },
          { label: 'Damaged', value: itemsDamaged, onClick: () => setStatusDrilldown('damaged') },
          { label: 'Checked Out', value: itemsOut },
        ].map((k) => (
          <button
            key={k.label}
            type="button"
            className={`card !py-4 text-left ${k.onClick ? 'hover:ring-2 hover:ring-secondary/40 cursor-pointer' : ''}`}
            onClick={k.onClick}
            disabled={!k.onClick || k.value === 0}
          >
            <p className="text-xs text-muted">{k.label}</p>
            <p className="text-2xl font-bold text-primary">{k.value}</p>
          </button>
        ))}
      </div>

      {statusDrilldown === 'missing' && missingDetails.length > 0 && (
        <div className="card border-l-4 border-l-danger">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-danger">Missing Items</h2>
            <button type="button" className="text-xs text-muted" onClick={() => setStatusDrilldown(null)}>Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Serial</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Last Known Location</th>
                  <th className="py-2">Last Movement</th>
                  <th className="py-2">Date/Time</th>
                  <th className="py-2">Last Handled By</th>
                </tr>
              </thead>
              <tbody>
                {missingDetails.map(({ item, lastKnownLocation, lastMovement }) => (
                  <tr
                    key={item.id}
                    className="border-b border-surface-alt hover:bg-surface-alt/50 cursor-pointer"
                    onClick={() => setDetailId(item.id)}
                  >
                    <td className="py-2 font-mono text-xs">{item.serialNumber}</td>
                    <td className="py-2">{item.itemName}</td>
                    <td className="py-2">{lastKnownLocation}</td>
                    <td className="py-2">
                      {lastMovement ? `${lastMovement.from} → ${lastMovement.to}` : '—'}
                    </td>
                    <td className="py-2">{lastMovement ? formatInventoryDateTime(lastMovement.date) : '—'}</td>
                    <td className="py-2">{lastMovement?.handledBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statusDrilldown === 'damaged' && damagedItems.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-warning">Damaged Items</h2>
            <button type="button" className="text-xs text-muted" onClick={() => setStatusDrilldown(null)}>Close</button>
          </div>
          <ul className="text-sm space-y-2">
            {damagedItems.map((i) => (
              <li key={i.id}>
                <button type="button" className="text-left hover:underline" onClick={() => setDetailId(i.id)}>
                  {i.serialNumber} — {i.itemName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-primary mb-4">Inventory by Item Type</h2>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted">No inventory items yet.</p>
        ) : (
          <div className="space-y-4">
            {summaries.map((s) => (
              <div key={s.itemName} className="border border-border rounded-lg p-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedItem(expandedItem === s.itemName ? null : s.itemName)}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-primary">{s.itemName} — Total: {s.total}</h3>
                    <span className="text-xs text-muted">{s.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span>Available: <strong>{s.available}</strong></span>
                    <button type="button" className="hover:underline" onClick={(e) => { e.stopPropagation(); setStatusDrilldown('missing'); }}>
                      Missing: <strong className={s.missing > 0 ? 'text-danger' : ''}>{s.missing}</strong>
                    </button>
                    <button type="button" className="hover:underline" onClick={(e) => { e.stopPropagation(); setStatusDrilldown('damaged'); }}>
                      Damaged: <strong className={s.damaged > 0 ? 'text-warning' : ''}>{s.damaged}</strong>
                    </button>
                    <span>Checked Out: <strong>{s.out}</strong></span>
                  </div>
                </button>
                {expandedItem === s.itemName && (
                  <div className="mt-3 pt-3 border-t border-border text-sm">
                    <p className="font-medium mb-2">Available items by location</p>
                    <ul className="space-y-1">
                      {Object.entries(s.byLocation).sort((a, b) => b[1] - a[1]).map(([loc, count]) => (
                        <li key={loc}>{loc}: <strong>{count}</strong></li>
                      ))}
                      {s.missing > 0 && <li className="text-danger">Missing: <strong>{s.missing}</strong></li>}
                      {s.damaged > 0 && <li className="text-warning">Damaged: <strong>{s.damaged}</strong></li>}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {overdueItems.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <h2 className="font-semibold text-warning mb-2">
            {overdueItems.length} item(s) overdue (OUT {INVENTORY_OVERDUE_DAYS}+ days)
          </h2>
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
                  <tr key={i.id} className="border-b border-surface-alt cursor-pointer hover:bg-surface-alt/50" onClick={() => setDetailId(i.id)}>
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
          <p className="text-sm text-muted">No items currently checked out.</p>
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
                  <tr key={i.id} className="border-b border-surface-alt cursor-pointer hover:bg-surface-alt/50" onClick={() => setDetailId(i.id)}>
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
            placeholder="CH-017"
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
            </div>
            <ul className="space-y-1 text-sm">
              {searchResult.transactions.map((tx) => (
                <li key={tx.id} className="text-muted">{formatTransactionLine(tx)} · {formatInventoryDateTime(tx.transactionDate)}</li>
              ))}
            </ul>
          </div>
        )}
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
                  const item = normalizedItems.find((i) => i.id === tx.inventoryItemId);
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

      {detailItem && (
        <InventoryItemDetailModal
          item={detailItem}
          transactions={inventoryTransactions}
          onClose={() => setDetailId(null)}
          canUpdateStatus
          onUpdateStatus={updateInventoryItemStatus}
          onStatusUpdated={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
