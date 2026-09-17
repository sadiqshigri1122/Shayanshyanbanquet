import { Link, useSearchParams } from 'react-router-dom';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, BLOCKING_STATUSES } from '../../utils/bookingUtils';
import { computeEventBilling, isBookingFinanciallyEditable } from '../../utils/eventDayUtils';
import StatusBadge from '../../components/StatusBadge';

type Tab = 'today' | 'upcoming' | 'closing';

export default function EventDayHub() {
  const { bookings } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'today';
  const today = new Date().toISOString().split('T')[0];

  const activeStatuses = [...BLOCKING_STATUSES, 'confirmed'] as const;

  const events = bookings
    .filter((b) => activeStatuses.includes(b.status as typeof activeStatuses[number]) || b.status === 'completed')
    .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected' && b.status !== 'inquiry')
    .sort((a, b) => a.functionDate.localeCompare(b.functionDate));

  const todayEvents = events.filter((b) => b.functionDate === today);
  const upcomingEvents = events.filter((b) => b.functionDate > today);
  const needsClosing = events.filter((b) => b.functionDate < today && isBookingFinanciallyEditable(b.status));

  const setTab = (t: Tab) => setSearchParams({ tab: t });

  const listForTab =
    tab === 'today' ? todayEvents : tab === 'upcoming' ? upcomingEvents : needsClosing;

  const renderEventRow = (b: typeof events[0]) => {
    const billing = computeEventBilling(b);
    const isToday = b.functionDate === today;

    return (
      <Link
        key={b.id}
        to={`/office/event-day/${b.id}`}
        className="card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-premium transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-secondary text-white' : 'bg-secondary-light'}`}>
            <span className={`text-xs font-bold ${isToday ? 'text-white/80' : 'text-secondary'}`}>
              {new Date(b.functionDate).toLocaleString('en', { month: 'short' })}
            </span>
            <span className={`text-xl font-bold ${isToday ? 'text-white' : 'text-primary'}`}>
              {new Date(b.functionDate).getDate()}
            </span>
          </div>
          <div>
            <p className="font-bold text-primary group-hover:text-secondary transition-colors">
              {b.customer.name} — {b.programme}
            </p>
            <p className="text-sm text-muted">{b.venueName} · {b.numberOfGuests} guests · {b.bookingNumber}</p>
            <div className="flex gap-2 mt-1">
              <StatusBadge status={b.status} />
              {isToday && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-secondary text-white px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 text-sm w-full md:w-auto">
          <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-6 flex-1 sm:flex-none">
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted">Final Bill</p>
              <p className="font-bold">{formatCurrency(billing.finalBill)}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted">Balance</p>
              <p className="font-bold text-danger">{formatCurrency(billing.remainingBalance)}</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted group-hover:text-secondary shrink-0 hidden sm:block" />
        </div>
      </Link>
    );
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today', label: "Today's Events", count: todayEvents.length },
    { id: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { id: 'closing', label: 'Needs Closing', count: needsClosing.length },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <CalendarCheck size={24} /> Event Day
        </h1>
        <p className="text-sm text-muted mt-1">
          Open an event to add extra items, record payments, log office costs, and close the event.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-secondary text-secondary' : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-secondary text-white' : 'bg-gray-100 text-muted'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'closing' && needsClosing.length > 0 && (
        <p className="text-xs text-warning bg-warning/10 px-3 py-2 rounded-lg">
          These events have passed but are not closed yet. Open each event and click &quot;Close Event&quot; when done.
        </p>
      )}

      <section className="space-y-3">
        {listForTab.map(renderEventRow)}
        {listForTab.length === 0 && (
          <p className="text-center py-12 text-gray-400">
            {tab === 'today' && 'No events scheduled for today'}
            {tab === 'upcoming' && 'No upcoming events'}
            {tab === 'closing' && 'All past events are closed — nothing pending'}
          </p>
        )}
      </section>
    </div>
  );
}
