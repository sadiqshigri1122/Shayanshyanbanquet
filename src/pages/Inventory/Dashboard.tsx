import { Link } from 'react-router-dom';
import { Package, ArrowDownCircle, ArrowUpCircle, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { formatInventoryDateTime, getOverdueOutItems, INVENTORY_OVERDUE_DAYS } from '../../utils/inventoryUtils';
import { formatCurrency } from '../../utils/bookingUtils';
import { isLowStock } from '../../utils/inventoryUtils';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';

export default function InventoryDashboard() {
  const { inventoryItems, inventoryTransactions, kitchenPurchases, kitchenStock } = useApp();
  const { path } = useDashboard();

  const itemsIn = inventoryItems.filter((i) => i.status === 'IN').length;
  const itemsOut = inventoryItems.filter((i) => i.status === 'OUT').length;
  const lowStock = kitchenStock.filter((s) => isLowStock(s.currentQuantity, s.minThreshold));
  const monthStart = new Date().toISOString().slice(0, 7);
  const purchasesThisMonth = kitchenPurchases.filter((p) => p.purchaseDate.startsWith(monthStart));

  const recentTx = [...inventoryTransactions]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, 5);
  const recentPurchases = [...kitchenPurchases]
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
    .slice(0, 5);
  const overdueItems = getOverdueOutItems(inventoryItems, inventoryTransactions);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Inventory Dashboard</h1>
        <p className="text-muted text-sm mt-0.5">Know what you have, where it is, and who took it</p>
      </div>

      {overdueItems.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <p className="font-semibold text-warning">{overdueItems.length} item(s) not returned ({INVENTORY_OVERDUE_DAYS}+ days OUT)</p>
          <ul className="text-sm mt-2 space-y-1">
            {overdueItems.slice(0, 5).map((i) => (
              <li key={i.id}>{i.serialNumber} — {i.itemName} → <strong>{i.currentHolder}</strong> ({i.daysOut} days)</li>
            ))}
          </ul>
          <Link to={path('/items')} className="text-xs text-secondary font-semibold mt-2 inline-block">View all items</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Inventory Items', value: inventoryItems.length, icon: Package, link: path('/items') },
          { label: 'Items IN', value: itemsIn, icon: ArrowDownCircle },
          { label: 'Items OUT', value: itemsOut, icon: ArrowUpCircle },
          { label: 'Low Stock', value: lowStock.length, icon: AlertTriangle, warn: lowStock.length > 0 },
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
            <Link key={card.label} to={card.link} className="block hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-primary">Recent Inventory Activity</h2>
            <Link to={path('/history')} className="text-xs text-secondary font-semibold">View all</Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted">No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentTx.map((tx) => {
                const item = inventoryItems.find((i) => i.id === tx.inventoryItemId);
                return (
                  <li key={tx.id} className="text-sm border-b border-surface-alt pb-2 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted">{formatInventoryDateTime(tx.transactionDate).split(',')[0]}</span>
                      <span className="font-mono text-xs">{tx.serialNumber}</span>
                      <span>{item?.itemName ?? '—'}</span>
                      <InventoryStatusBadge status={tx.action} />
                      <span className="text-muted">{tx.person}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">Entered by {tx.createdBy}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-primary">Recent Kitchen Purchases</h2>
            <Link to={path('/kitchen/history')} className="text-xs text-secondary font-semibold">View all</Link>
          </div>
          <p className="text-xs text-muted mb-3">
            This month: {purchasesThisMonth.length} purchases · {formatCurrency(purchasesThisMonth.reduce((s, p) => s + p.totalCost, 0))}
          </p>
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-muted">No purchases yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentPurchases.map((p) => (
                <li key={p.id} className="text-sm flex flex-wrap items-center gap-2 border-b border-surface-alt pb-2 last:border-0">
                  <span className="text-muted">{p.purchaseDate}</span>
                  <span className="font-medium">{p.item}</span>
                  <span>{p.quantity} {p.unit}</span>
                  <span className="text-secondary font-semibold">{formatCurrency(p.totalCost)}</span>
                  <span className="text-muted">{p.purchasedBy}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to={path('/kitchen/purchases')} className="btn-primary !px-4 !py-2 !text-sm inline-flex items-center gap-2">
              <ShoppingCart size={16} /> New Purchase
            </Link>
            <Link to={path('/bulk-add')} className="btn-secondary !px-4 !py-2 !text-sm">Bulk Add Items</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
