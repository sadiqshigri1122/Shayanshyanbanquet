import { Link } from 'react-router-dom';
import {
  Package, ClipboardCheck, AlertTriangle, ArrowUpCircle, ArrowDownCircle, ShoppingCart, PlusCircle, Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { formatInventoryDateTime } from '../../utils/inventoryUtils';
import { formatCurrency } from '../../utils/bookingUtils';

export default function InventoryDashboard() {
  const {
    inventoryItemTypes,
    inventoryStockBalances,
    inventoryCheckouts,
    inventoryAdjustments,
    inventoryQuantityMovements,
    kitchenPurchases,
  } = useApp();
  const { path } = useDashboard();

  const qtyTypes = inventoryItemTypes.filter((t) => !t.serialTracking);

  const totals = inventoryStockBalances.reduce(
    (acc, b) => ({
      good: acc.good + (b.goodQty ?? b.quantity ?? 0),
      missing: acc.missing + (b.missingQty ?? 0),
      damaged: acc.damaged + (b.damagedQty ?? 0),
      out: acc.out + (b.outQty ?? 0),
    }),
    { good: 0, missing: 0, damaged: 0, out: 0 },
  );
  const totalOwned = totals.good + totals.missing + totals.damaged + totals.out;

  const openCheckouts = inventoryCheckouts.filter((c) => c.status === 'OPEN');
  const overdueCheckouts = openCheckouts.filter(
    (c) => c.expectedReturnAt && c.expectedReturnAt < new Date().toISOString(),
  );

  const monthStart = new Date().toISOString().slice(0, 7);
  const purchasesThisMonth = kitchenPurchases.filter((p) => p.purchaseDate.startsWith(monthStart));

  const recentMovements = [...inventoryQuantityMovements]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const quickLinks = [
    { label: 'Add Inventory', icon: PlusCircle, path: path('/add-item') },
    { label: 'Bulk Upload', icon: Upload, path: path('/bulk-add') },
    { label: 'Stock Count', icon: ClipboardCheck, path: path('/stock-count') },
    { label: 'Missing / Damaged', icon: AlertTriangle, path: path('/adjust') },
    { label: 'Check Out', icon: ArrowUpCircle, path: path('/checkout-out') },
    { label: 'Check In', icon: ArrowDownCircle, path: path('/checkout-return') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Inventory Dashboard</h1>
        <p className="text-muted text-sm mt-0.5">Quantity-based inventory — what you have, what is out, and what needs attention</p>
      </div>

      {overdueCheckouts.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <p className="font-semibold text-warning">{overdueCheckouts.length} overdue checkout(s)</p>
          <ul className="text-sm mt-2 space-y-1">
            {overdueCheckouts.slice(0, 5).map((c) => (
              <li key={c.id}>{c.itemName} × {c.outstanding} → {c.issuedTo}</li>
            ))}
          </ul>
          <Link to={path('/checkout-return')} className="text-xs text-secondary font-semibold mt-2 inline-block">
            Process returns
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Owned', value: totalOwned, icon: Package, link: path('/master') },
          { label: 'Good (In stock)', value: totals.good, icon: Package },
          { label: 'Out (Outside)', value: totals.out, icon: ArrowUpCircle, warn: totals.out > 0 },
          { label: 'Missing', value: totals.missing, icon: AlertTriangle, warn: totals.missing > 0 },
          { label: 'Damaged', value: totals.damaged, icon: AlertTriangle, warn: totals.damaged > 0 },
        ].map((card) => {
          const Icon = card.icon;
          const inner = (
            <div className={`card h-full ${card.warn ? 'border-l-4 border-l-warning' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{card.value}</p>
                </div>
                <Icon size={20} className="text-secondary" />
              </div>
            </div>
          );
          return card.link ? (
            <Link key={card.label} to={card.link} className="block hover:opacity-90">{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickLinks.map(({ label, icon: Icon, path: to }) => (
          <Link key={to} to={to} className="card hover:shadow-md transition-shadow flex items-center gap-2 py-3">
            <Icon size={18} className="text-secondary shrink-0" />
            <span className="text-sm font-medium text-primary">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-primary mb-3">Open checkouts ({openCheckouts.length})</h2>
          {openCheckouts.length === 0 ? (
            <p className="text-sm text-muted">No items currently checked out.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {openCheckouts.slice(0, 5).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span>{c.itemName} × {c.outstanding} → <strong>{c.issuedTo}</strong></span>
                  <span className="text-muted text-xs shrink-0">{formatInventoryDateTime(c.issuedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-primary mb-3">Recent adjustments</h2>
          {inventoryAdjustments.length === 0 ? (
            <p className="text-sm text-muted">No missing or damaged records yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {inventoryAdjustments.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <span className={a.type === 'MISSING' ? 'text-danger' : 'text-warning'}>{a.type}</span>
                  {' '}{a.quantity} × {a.itemName}
                  <p className="text-xs text-muted truncate">{a.remarks}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-primary mb-3">Recent activity</h2>
        {recentMovements.length === 0 ? (
          <p className="text-sm text-muted">No movements yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {recentMovements.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span><strong>{m.action}</strong> — {m.quantity} ({m.reason})</span>
                <span className="text-muted text-xs shrink-0">{formatInventoryDateTime(m.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-primary mb-2 flex items-center gap-2">
          <ShoppingCart size={18} /> Kitchen — {purchasesThisMonth.length} purchases this month
        </h2>
        <p className="text-sm text-muted">
          Total: {formatCurrency(purchasesThisMonth.reduce((s, p) => s + p.totalCost, 0))}
        </p>
        <p className="text-xs text-muted mt-1">{qtyTypes.length} item type(s) in equipment inventory</p>
      </div>
    </div>
  );
}
