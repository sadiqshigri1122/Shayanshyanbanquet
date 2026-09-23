import { Link } from 'react-router-dom';
import {
  TrendingUp, DollarSign, CalendarDays, CreditCard,
  CheckCircle2, Clock, XCircle, ArrowRight, AlertCircle,
  BarChart3, Wallet, Receipt, Package, ChefHat,
} from 'lucide-react';
import { useApp, computeKPIs } from '../../context/AppContext';
import { formatCurrency, getStatusColor, BLOCKING_STATUSES } from '../../utils/bookingUtils';
import { formatInventoryDateTime, getOverdueOutItems, isLowStock } from '../../utils/inventoryUtils';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';

export default function ManagerDashboard() {
  const {
    bookings, payments, expenses, approvals, approveRequest, currentUser,
    inventoryItems, inventoryTransactions, kitchenPurchases, kitchenStock,
  } = useApp();
  const kpis = computeKPIs(bookings, payments, expenses);
  const today = new Date().toISOString().split('T')[0];

  const upcomingEvents = bookings
    .filter((b) => b.functionDate >= today && BLOCKING_STATUSES.includes(b.status))
    .sort((a, b) => a.functionDate.localeCompare(b.functionDate));
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const recentPayments = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 5);
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const kitchenPurchasesThisMonth = kitchenPurchases.filter((p) => p.purchaseDate.startsWith(monthPrefix));
  const lowStockCount = kitchenStock.filter((s) => isLowStock(s.currentQuantity, s.minThreshold)).length;
  const recentInventoryTx = [...inventoryTransactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, 5);
  const recentKitchenPurchases = [...kitchenPurchases].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)).slice(0, 5);
  const overdueCount = getOverdueOutItems(inventoryItems, inventoryTransactions).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manager Dashboard</h1>
        <p className="text-muted text-sm mt-0.5">Business overview & operations management</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today's Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Bookings", value: kpis.todayBookings, icon: CalendarDays, color: 'from-secondary to-secondary-hover' },
            { label: "Today's Events", value: kpis.todayEvents, icon: CheckCircle2, color: 'from-success to-success' },
            { label: "Today's Revenue", value: formatCurrency(kpis.todayRevenue), icon: DollarSign, color: 'from-warning to-warning' },
            { label: 'Cancellations', value: kpis.todayCancellations, icon: XCircle, color: 'from-danger to-danger' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-primary mt-1">{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <Icon size={18} className="text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Booking KPIs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: kpis.totalBookings, color: 'border-l-primary' },
            { label: 'Confirmed', value: kpis.confirmedBookings, color: 'border-l-success' },
            { label: 'Pending', value: kpis.pendingBookings, color: 'border-l-yellow-500' },
            { label: 'Tentative', value: kpis.tentativeBookings, color: 'border-l-info' },
            { label: 'Cancelled', value: kpis.cancelledBookings, color: 'border-l-danger' },
            { label: 'Completed', value: kpis.completedEvents, color: 'border-l-info' },
          ].map((kpi) => (
            <div key={kpi.label} className={`card !py-4 border-l-4 ${kpi.color}`}>
              <p className="text-xs text-muted">{kpi.label}</p>
              <p className="text-2xl font-bold text-primary">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Financial Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Booking Value', value: formatCurrency(kpis.totalBookingValue), icon: BarChart3, accent: 'text-secondary', bg: 'bg-secondary-light' },
            { label: 'Total Advance Received', value: formatCurrency(kpis.totalAdvanceReceived), icon: Wallet, accent: 'text-success', bg: 'bg-success/10' },
            { label: 'Outstanding Balance', value: formatCurrency(kpis.totalBalance), icon: AlertCircle, accent: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Total Expenses', value: formatCurrency(kpis.totalExpenses), icon: Receipt, accent: 'text-danger', bg: 'bg-danger/10' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`${card.bg} rounded-xl p-5 border border-border`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={card.accent} />
                  <p className="text-xs text-muted font-medium">{card.label}</p>
                </div>
                <p className={`text-xl font-bold ${card.accent}`}>{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 bg-gradient-to-r from-primary to-primary-light rounded-xl p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/60 text-sm font-medium">Estimated Net Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{formatCurrency(kpis.netRevenue)}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 self-start sm:self-auto">
            <TrendingUp size={20} className="text-success" />
            <span className="text-success font-bold text-sm">Profitable</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inventory & Kitchen</h2>
        {overdueCount > 0 && (
          <Link to="/manager/inventory-reports" className="block card border-l-4 border-l-warning mb-4 hover:opacity-90">
            <p className="font-semibold text-warning">{overdueCount} inventory item(s) overdue — not returned on time</p>
            <p className="text-sm text-muted mt-1">Open Inventory Reports to see who has them.</p>
          </Link>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Inventory Items', value: inventoryItems.length, link: '/manager/inventory-reports' },
            { label: 'Available', value: inventoryItems.filter((i) => i.status === 'AVAILABLE').length },
            { label: 'Missing', value: inventoryItems.filter((i) => i.status === 'MISSING').length, warn: inventoryItems.some((i) => i.status === 'MISSING') },
            { label: 'Checked Out', value: inventoryItems.filter((i) => i.status === 'OUT').length },
            { label: 'Overdue OUT', value: overdueCount, warn: overdueCount > 0, link: '/manager/inventory-reports' },
            { label: 'Kitchen Purchases (Month)', value: kitchenPurchasesThisMonth.length },
            { label: 'Low Stock Items', value: lowStockCount, warn: lowStockCount > 0 },
          ].map((card) => (
            <div key={card.label} className={`card !py-4 ${card.warn ? 'border-l-4 border-l-warning' : ''}`}>
              {card.link ? (
                <Link to={card.link}>
                  <p className="text-xs text-muted">{card.label}</p>
                  <p className="text-2xl font-bold text-primary">{card.value}</p>
                </Link>
              ) : (
                <>
                  <p className="text-xs text-muted">{card.label}</p>
                  <p className="text-2xl font-bold text-primary">{card.value}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Package size={16} /> Recent Inventory Activity</h3>
              <Link to="/manager/inventory-reports" className="text-xs text-secondary font-semibold">Reports</Link>
            </div>
            {recentInventoryTx.length === 0 ? (
              <p className="text-sm text-muted">No activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentInventoryTx.map((tx) => {
                  const item = inventoryItems.find((i) => i.id === tx.inventoryItemId);
                  return (
                    <li key={tx.id} className="border-b border-surface-alt pb-2 last:border-0">
                      {formatInventoryDateTime(tx.transactionDate).split(',')[0]} | {tx.serialNumber} | {item?.itemName} | <InventoryStatusBadge status={tx.action} /> | {tx.person} | Entered by {tx.createdBy}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ChefHat size={16} /> Recent Kitchen Purchases</h3>
              <Link to="/manager/kitchen-reports" className="text-xs text-secondary font-semibold">Reports</Link>
            </div>
            {recentKitchenPurchases.length === 0 ? (
              <p className="text-sm text-muted">No purchases yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentKitchenPurchases.map((p) => (
                  <li key={p.id} className="border-b border-surface-alt pb-2 last:border-0">
                    {p.purchaseDate} | {p.item} | {p.quantity} {p.unit} | {formatCurrency(p.totalCost)} | {p.purchasedBy}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card !p-0">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-bold text-primary text-sm flex items-center gap-2">
              <Clock size={16} className="text-warning" /> Pending Approvals
            </h2>
            <Link to="/manager/approvals" className="text-xs text-secondary font-semibold">View All</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingApprovals.map((a) => (
              <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary capitalize">{a.requestType.replace('_', ' ')}</p>
                  <p className="text-xs text-muted">{a.details}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approveRequest(a.id, true, 'Approved', currentUser.name)} className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg">Approve</button>
                  <button onClick={() => approveRequest(a.id, false, 'Rejected', currentUser.name)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">Reject</button>
                </div>
              </div>
            ))}
            {pendingApprovals.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-success" />
                No pending approvals
              </div>
            )}
          </div>
        </div>

        <div className="card !p-0">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-bold text-primary text-sm flex items-center gap-2">
              <CreditCard size={16} className="text-success" /> Recent Payments
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">{p.customerName}</p>
                  <p className="text-xs text-muted">{p.bookingNumber} · {p.paymentDate}</p>
                </div>
                <span className="text-sm font-bold text-success">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-primary text-sm">Upcoming Events</h2>
          <Link to="/manager/bookings" className="text-xs text-secondary font-semibold flex items-center gap-1">View All <ArrowRight size={12} /></Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-muted">Booking</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted">Customer</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted">Venue</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted">Date</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted text-right">Balance</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {upcomingEvents.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-3 font-bold text-primary">{e.bookingNumber}</td>
                <td className="px-5 py-3">{e.customer.name}</td>
                <td className="px-5 py-3">{e.venueName}</td>
                <td className="px-5 py-3">{e.functionDate}</td>
                <td className="px-5 py-3 text-right font-bold text-danger">{formatCurrency(e.remainingBalance)}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(e.status)}`}>
                    {e.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
