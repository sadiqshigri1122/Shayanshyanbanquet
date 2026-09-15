import { Link } from 'react-router-dom';
import {
  TrendingUp, DollarSign, CalendarDays, CreditCard,
  CheckCircle2, Clock, XCircle, ArrowRight, AlertCircle,
  BarChart3, Wallet, Receipt,
} from 'lucide-react';
import { useApp, computeKPIs } from '../../context/AppContext';
import { formatCurrency, getStatusColor, BLOCKING_STATUSES } from '../../utils/bookingUtils';

export default function ManagerDashboard() {
  const { bookings, payments, expenses, approvals, approveRequest, currentUser } = useApp();
  const kpis = computeKPIs(bookings, payments, expenses);
  const today = new Date().toISOString().split('T')[0];

  const upcomingEvents = bookings
    .filter((b) => b.functionDate >= today && BLOCKING_STATUSES.includes(b.status))
    .sort((a, b) => a.functionDate.localeCompare(b.functionDate));
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const recentPayments = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 5);

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
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
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

        <div className="mt-4 bg-gradient-to-r from-primary to-primary-light rounded-xl p-6 text-white flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm font-medium">Estimated Net Revenue</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(kpis.netRevenue)}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
            <TrendingUp size={20} className="text-success" />
            <span className="text-success font-bold text-sm">Profitable</span>
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
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary capitalize">{a.requestType.replace('_', ' ')}</p>
                  <p className="text-xs text-muted">{a.details}</p>
                </div>
                <div className="flex gap-2">
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
