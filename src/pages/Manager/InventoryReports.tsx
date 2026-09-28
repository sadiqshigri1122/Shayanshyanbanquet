import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatInventoryDateTime } from '../../utils/inventoryUtils';
import type { InventoryCheckout, InventoryStockCount } from '../../types';

type Tab = 'overview' | 'counts' | 'adjustments' | 'checkouts';

export default function InventoryReports() {
  const {
    inventoryStockBalances,
    inventoryItemTypes,
    inventoryStockCounts,
    inventoryAdjustments,
    inventoryCheckouts,
    getQuantityInventoryReports,
    apiMode,
  } = useApp();

  const [tab, setTab] = useState<Tab>('overview');
  const [remoteOverview, setRemoteOverview] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!apiMode) return;
    void getQuantityInventoryReports().then((data) => {
      const overview = data.overview as Array<Record<string, unknown>> | undefined;
      if (overview) setRemoteOverview(overview);
    });
  }, [apiMode, getQuantityInventoryReports, inventoryStockBalances.length]);

  const overview = useMemo(() => {
    if (remoteOverview.length > 0) return remoteOverview;
    const types = inventoryItemTypes.filter((t) => !t.serialTracking);
    return types.map((type) => {
      const balances = inventoryStockBalances.filter((b) => b.itemTypeId === type.id);
      const goodQty = balances.reduce((s, b) => s + (b.goodQty ?? b.quantity ?? 0), 0);
      const missingQty = balances.reduce((s, b) => s + (b.missingQty ?? 0), 0);
      const damagedQty = balances.reduce((s, b) => s + (b.damagedQty ?? 0), 0);
      const outQty = balances.reduce((s, b) => s + (b.outQty ?? 0), 0);
      return {
        itemTypeId: type.id,
        itemName: type.name,
        category: type.category,
        unit: type.unit,
        goodQty,
        missingQty,
        damagedQty,
        outQty,
        total: goodQty + missingQty + damagedQty + outQty,
      };
    });
  }, [remoteOverview, inventoryItemTypes, inventoryStockBalances]);

  const totals = {
    good: overview.reduce((s, row) => s + Number(row.goodQty ?? 0), 0),
    missing: overview.reduce((s, row) => s + Number(row.missingQty ?? 0), 0),
    damaged: overview.reduce((s, row) => s + Number(row.damagedQty ?? 0), 0),
    out: overview.reduce((s, row) => s + Number(row.outQty ?? 0), 0),
  };

  const openCheckouts = inventoryCheckouts.filter((c) => c.status === 'OPEN');
  const completedCheckouts = inventoryCheckouts.filter((c) => c.status === 'COMPLETED');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'counts', label: 'Stock counts' },
    { id: 'adjustments', label: 'Missing / Damaged' },
    { id: 'checkouts', label: 'Outside in/out' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Inventory Reports</h1>
        <p className="text-sm text-muted mt-1">Quantity inventory — totals, counts, adjustments, and outside checkouts</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total owned', value: totals.good + totals.missing + totals.damaged + totals.out },
          { label: 'Good', value: totals.good },
          { label: 'Out', value: totals.out, warn: totals.out > 0 },
          { label: 'Missing', value: totals.missing, warn: totals.missing > 0 },
          { label: 'Damaged', value: totals.damaged, warn: totals.damaged > 0 },
        ].map((card) => (
          <div key={card.label} className={`card ${card.warn ? 'border-l-4 border-l-warning' : ''}`}>
            <p className="text-xs text-muted">{card.label}</p>
            <p className="text-2xl font-bold text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary text-white' : 'bg-surface-alt text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 pr-4 text-right">Good</th>
                <th className="py-2 pr-4 text-right">Out</th>
                <th className="py-2 pr-4 text-right">Missing</th>
                <th className="py-2 text-right">Damaged</th>
              </tr>
            </thead>
            <tbody>
              {overview.map((row) => (
                <tr key={String(row.itemTypeId)} className="border-b border-surface-alt">
                  <td className="py-3 pr-4 font-medium">{String(row.itemName)}</td>
                  <td className="py-3 pr-4 text-muted">{String(row.category)}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{Number(row.total)}</td>
                  <td className="py-3 pr-4 text-right text-success">{Number(row.goodQty)}</td>
                  <td className="py-3 pr-4 text-right">{Number(row.outQty) || '—'}</td>
                  <td className="py-3 pr-4 text-right text-danger">{Number(row.missingQty) || '—'}</td>
                  <td className="py-3 text-right text-warning">{Number(row.damagedQty) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'counts' && (
        <div className="space-y-4">
          {(inventoryStockCounts as InventoryStockCount[]).length === 0 ? (
            <p className="text-sm text-muted card">No stock counts recorded yet.</p>
          ) : (
            inventoryStockCounts.map((count) => (
              <div key={count.id} className="card">
                <p className="font-semibold text-primary">
                  Count — {formatInventoryDateTime(count.countedAt)} by {count.countedBy}
                </p>
                {count.notes && <p className="text-sm text-muted mt-1">{count.notes}</p>}
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="border-b text-muted text-left">
                      <th className="py-1 pr-3">Item</th>
                      <th className="py-1 pr-3">System</th>
                      <th className="py-1 pr-3">Actual</th>
                      <th className="py-1 pr-3">Missing</th>
                      <th className="py-1">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {count.lines?.map((line) => (
                      <tr key={line.id} className="border-b border-surface-alt">
                        <td className="py-2 pr-3">{line.itemName}</td>
                        <td className="py-2 pr-3">{line.systemGoodQty}</td>
                        <td className="py-2 pr-3">{line.actualGoodQty}</td>
                        <td className="py-2 pr-3 text-danger">{line.missingQty || '—'}</td>
                        <td className="py-2 text-muted text-xs">{line.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'adjustments' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">By</th>
                <th className="py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {inventoryAdjustments.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-muted">No adjustments yet.</td></tr>
              ) : (
                inventoryAdjustments.map((a) => (
                  <tr key={a.id} className="border-b border-surface-alt">
                    <td className="py-3 pr-4 text-xs">{formatInventoryDateTime(a.adjustedAt)}</td>
                    <td className="py-3 pr-4">{a.itemName}</td>
                    <td className={`py-3 pr-4 font-medium ${a.type === 'MISSING' ? 'text-danger' : 'text-warning'}`}>{a.type}</td>
                    <td className="py-3 pr-4">{a.quantity}</td>
                    <td className="py-3 pr-4">{a.adjustedBy}</td>
                    <td className="py-3 text-muted text-xs">{a.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'checkouts' && (
        <div className="space-y-6">
          {openCheckouts.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-warning mb-3">Open checkouts ({openCheckouts.length})</h2>
              <CheckoutTable rows={openCheckouts} />
            </div>
          )}
          <div className="card">
            <h2 className="font-semibold text-primary mb-3">All checkouts</h2>
            <CheckoutTable rows={[...openCheckouts, ...completedCheckouts]} />
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutTable({ rows }: { rows: InventoryCheckout[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No checkout records.</p>;
  return (
    <table className="w-full text-sm overflow-x-auto">
      <thead>
        <tr className="border-b text-left text-muted">
          <th className="py-2 pr-3">Item</th>
          <th className="py-2 pr-3">Issued to</th>
          <th className="py-2 pr-3">Issued</th>
          <th className="py-2 pr-3">Returned</th>
          <th className="py-2 pr-3">Missing</th>
          <th className="py-2 pr-3">Damaged</th>
          <th className="py-2 pr-3">Status</th>
          <th className="py-2">Purpose</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id} className="border-b border-surface-alt">
            <td className="py-2 pr-3 font-medium">{c.itemName} × {c.issuedQty}</td>
            <td className="py-2 pr-3">{c.issuedTo}</td>
            <td className="py-2 pr-3 text-xs">{formatInventoryDateTime(c.issuedAt)}</td>
            <td className="py-2 pr-3 text-success">{c.returnedQty || '—'}</td>
            <td className="py-2 pr-3 text-danger">{c.missingQty || '—'}</td>
            <td className="py-2 pr-3 text-warning">{c.damagedQty || '—'}</td>
            <td className="py-2 pr-3">{c.status}</td>
            <td className="py-2 text-xs text-muted">{c.purpose}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
