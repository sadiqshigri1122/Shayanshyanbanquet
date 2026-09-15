import { Link } from 'react-router-dom';
import {
  PlusCircle, CalendarDays, CreditCard, Search, CalendarCheck,
  Clock, AlertCircle, Users, ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getStatusColor, BLOCKING_STATUSES, daysUntilDate } from '../../utils/bookingUtils';
import { isBookingFinanciallyEditable } from '../../utils/eventDayUtils';
import { staffBookingStatus } from '../../utils/staffLabels';

export default function OfficeDashboard() {
  const { bookings } = useApp();
  const today = new Date().toISOString().split('T')[0];

  const todayEvents = bookings.filter(
    (b) => b.functionDate === today && ['confirmed', 'hold', 'tentative'].includes(b.status),
  );
  const upcomingEvents = bookings
    .filter((b) => b.functionDate >= today && BLOCKING_STATUSES.includes(b.status))
    .sort((a, b) => a.functionDate.localeCompare(b.functionDate));
  const thisWeekEvents = upcomingEvents.filter((b) => {
    const days = daysUntilDate(b.functionDate, today);
    return days >= 0 && days <= 7 && ['confirmed', 'hold', 'tentative'].includes(b.status);
  });
  const pendingBookings = bookings.filter((b) => b.status === 'pending_review' || b.status === 'inquiry');
  const pendingPaymentBookings = bookings.filter((b) => b.remainingBalance > 0 && !['cancelled', 'rejected', 'completed'].includes(b.status));
  const needsClosing = bookings.filter((b) => b.functionDate < today && isBookingFinanciallyEditable(b.status) && ['confirmed', 'hold', 'tentative'].includes(b.status));
  const recentBookings = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const quickActions = [
    { label: 'New Booking', icon: PlusCircle, path: '/office/new-booking', color: 'bg-success' },
    { label: "Today's Events", icon: CalendarCheck, path: '/office/event-day?tab=today', color: 'bg-secondary' },
    { label: 'Check Calendar', icon: CalendarDays, path: '/office/calendar', color: 'bg-info' },
    { label: 'Receive Payment', icon: CreditCard, path: '/office/payments', color: 'bg-warning' },
    { label: 'All Bookings', icon: Search, path: '/office/bookings', color: 'bg-primary-light' },
    { label: 'Customers', icon: Users, path: '/office/customers', color: 'bg-primary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Booking Office</h1>
          <p className="text-muted text-sm mt-0.5">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/office/new-booking" className="btn-primary flex items-center gap-2 !px-5 !py-2.5 !rounded-lg shadow-sm text-sm">
          <PlusCircle size={16} /> New Booking
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.path} className="card !p-4 hover:shadow-premium transition-all group text-center">
              <div className={`${action.color} w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-700">{action.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Today's Events", value: todayEvents.length.toString(), icon: CalendarCheck, color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/20', link: '/office/event-day?tab=today' },
          { label: 'Needs Closing', value: needsClosing.length.toString(), icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20', link: '/office/event-day?tab=closing' },
          { label: 'Pending Setup', value: pendingBookings.length.toString(), icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20', link: '/office/bookings' },
          { label: 'Upcoming Events', value: upcomingEvents.length.toString(), icon: CalendarDays, color: 'text-secondary', bgColor: 'bg-secondary-light', borderColor: 'border-secondary/20', link: '/office/event-day?tab=upcoming' },
          { label: 'Outstanding Payments', value: pendingPaymentBookings.length.toString(), icon: AlertCircle, color: 'text-danger', bgColor: 'bg-danger/10', borderColor: 'border-danger/20', link: '/office/payments' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} to={kpi.link} className={`${kpi.bgColor} rounded-xl p-5 border ${kpi.borderColor} hover:shadow-sm transition-all block`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted mb-1">{kpi.label}</p>
                  <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
                <Icon size={22} className={`${kpi.color} opacity-60`} />
              </div>
            </Link>
          );
        })}
      </div>

      {thisWeekEvents.length > 0 && (
        <div className="card !p-0 border border-secondary/30">
          <div className="p-4 border-b border-secondary/20 bg-secondary-light/40 flex justify-between items-center">
            <h2 className="font-bold text-primary text-sm flex items-center gap-2">
              <CalendarDays size={16} className="text-secondary" /> Events This Week ({thisWeekEvents.length})
            </h2>
            <Link to="/office/event-day?tab=upcoming" className="text-xs text-secondary font-semibold">View All →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {thisWeekEvents.slice(0, 5).map((b) => {
              const days = daysUntilDate(b.functionDate, today);
              const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
              return (
                <Link key={b.id} to={`/office/bookings/${b.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50/50 text-sm gap-3">
                  <span>
                    <strong>{b.customer.name}</strong> · {b.venueName} · {b.functionDate}
                    {b.remainingBalance > 0 && (
                      <span className="text-danger ml-2">{formatCurrency(b.remainingBalance)} due</span>
                    )}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${days <= 1 ? 'bg-warning/15 text-warning' : 'bg-secondary-light text-secondary'}`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {needsClosing.length > 0 && (
        <div className="card !p-0 border border-warning/30">
          <div className="p-4 border-b border-warning/20 bg-warning/5 flex justify-between items-center">
            <h2 className="font-bold text-primary text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" /> Events Need Closing ({needsClosing.length})
            </h2>
            <Link to="/office/event-day?tab=closing" className="text-xs text-secondary font-semibold">View All →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {needsClosing.slice(0, 4).map((b) => (
              <Link key={b.id} to={`/office/event-day/${b.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50/50 text-sm">
                <span><strong>{b.customer.name}</strong> · {b.functionDate} · {b.bookingNumber}</span>
                <span className="text-secondary font-semibold text-xs">Close Event →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card !p-0">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-bold text-primary text-sm">Recent Bookings</h2>
            <Link to="/office/bookings" className="text-xs text-secondary font-semibold flex items-center gap-1">View All <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBookings.map((booking) => (
              <Link key={booking.id} to={`/office/bookings/${booking.id}`} className="block p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{booking.bookingNumber}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                      {staffBookingStatus(booking.status).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{formatCurrency(booking.grandTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted">
                    <span className="font-medium text-gray-700">{booking.customer.name}</span>
                    {' · '}{booking.programme}{' · '}{booking.venueName}
                  </div>
                  <span className="text-xs text-gray-400">{booking.functionDate}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card !p-0">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-bold text-primary text-sm">Upcoming Events</h2>
            <Link to="/office/event-day?tab=upcoming" className="text-xs text-secondary font-semibold flex items-center gap-1">View All <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingEvents.slice(0, 5).map((event) => (
              <Link key={event.id} to={`/office/event-day/${event.id}`} className="block p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-secondary-light rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs text-secondary font-bold">{new Date(event.functionDate).toLocaleString('en', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-primary leading-none">{new Date(event.functionDate).getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{event.customer.name}</p>
                    <p className="text-xs text-muted">{event.programme} · {event.venueName}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {pendingPaymentBookings.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-primary text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" /> Outstanding Payments
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-muted">Booking</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted">Customer</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted">Balance</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendingPaymentBookings.slice(0, 8).map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3 font-bold text-primary">{b.bookingNumber}</td>
                  <td className="px-5 py-3">{b.customer.name}</td>
                  <td className="px-5 py-3 text-danger font-bold">{formatCurrency(b.remainingBalance)}</td>
                  <td className="px-5 py-3">
                    <Link to={`/office/bookings/${b.id}?action=payment`} className="text-xs text-secondary font-semibold">Receive →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
