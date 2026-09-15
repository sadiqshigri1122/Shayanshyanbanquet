import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { isBookingFinanciallyEditable } from '../../utils/eventDayUtils';
import StatusBadge from '../../components/StatusBadge';
import type { Booking } from '../../types';
import {
  type CalendarVenueGroup,
  formatDateKey,
  getDayHallStatuses,
  getDaySummary,
  groupHallStatuses,
  filterHallStatuses,
} from '../../utils/calendarUtils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const FILTER_OPTIONS: { value: 'all' | CalendarVenueGroup; label: string }[] = [
  { value: 'all', label: 'All Halls' },
  { value: 'A', label: 'Hall A' },
  { value: 'B', label: 'Hall B' },
  { value: 'C', label: 'Hall C' },
];

function bookingLink(
  b: Booking,
  todayStr: string,
  path: (segment: string) => string,
  canManageEventDay: boolean,
) {
  if (canManageEventDay && isBookingFinanciallyEditable(b.status) && b.functionDate <= todayStr) {
    return path(`/event-day/${b.id}`);
  }
  return path(`/bookings/${b.id}`);
}

function StatusChip({ status }: { status: 'available' | 'booked' | 'pending' }) {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={12} />
        Available
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock size={12} />
        Inquiry
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <XCircle size={12} />
      Booked
    </span>
  );
}

export default function Calendar() {
  const { bookings, settings } = useApp();
  const { path, can } = useDashboard();
  const blockingStatuses = settings.blockingStatuses;
  const todayStr = new Date().toISOString().split('T')[0];
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [hallFilter, setHallFilter] = useState<'all' | CalendarVenueGroup>('all');

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthName = current.toLocaleString('en', { month: 'long', year: 'numeric' });

  const dayStatuses = useMemo(
    () => getDayHallStatuses(bookings, selectedDate, blockingStatuses),
    [bookings, selectedDate, blockingStatuses],
  );

  const filteredStatuses = useMemo(
    () => filterHallStatuses(dayStatuses, hallFilter),
    [dayStatuses, hallFilter],
  );

  const groupedStatuses = useMemo(() => groupHallStatuses(filteredStatuses), [filteredStatuses]);
  const selectedSummary = useMemo(() => getDaySummary(dayStatuses), [dayStatuses]);

  const monthEvents = useMemo(
    () =>
      bookings
        .filter((b) => b.functionDate.startsWith(monthPrefix))
        .sort((a, b) => a.functionDate.localeCompare(b.functionDate)),
    [bookings, monthPrefix],
  );

  const selectedDayLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Hall Availability Calendar</h1>
          <p className="text-sm text-muted mt-0.5">
            Select a date to see every hall — green means free, red means booked
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHallFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                hallFilter === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Month grid */}
        <div className="card !p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrent(new Date(year, month - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-bold text-primary text-lg">{monthName}</h2>
            <button
              type="button"
              onClick={() => setCurrent(new Date(year, month + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateKey(year, month, day);
              const summary = getDaySummary(getDayHallStatuses(bookings, dateStr, blockingStatuses));
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const allFree = summary.booked === 0 && summary.pending === 0;
              const fullyBooked = summary.available === 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-lg border p-1 text-left transition-all hover:shadow-sm ${
                    isSelected
                      ? 'border-secondary bg-secondary-light ring-2 ring-secondary/30'
                      : isToday
                        ? 'border-secondary/50 bg-secondary-light/40'
                        : allFree
                          ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                          : fullyBooked
                            ? 'border-red-200 bg-red-50/50 hover:bg-red-50'
                            : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'
                  }`}
                >
                  <span
                    className={`block text-xs font-bold leading-none ${
                      isSelected ? 'text-secondary' : isToday ? 'text-secondary' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>
                  <span
                    className={`block text-[9px] font-medium mt-1 leading-tight ${
                      allFree
                        ? 'text-emerald-700'
                        : summary.booked > 0
                          ? 'text-red-600'
                          : 'text-amber-700'
                    }`}
                  >
                    {allFree ? 'All free' : `${summary.booked} booked`}
                  </span>
                  {!allFree && summary.available > 0 && (
                    <span className="block text-[8px] text-emerald-600 leading-tight">
                      {summary.available} free
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> All halls free
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Some booked
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Fully booked
            </span>
          </div>
        </div>

        {/* Selected day — hall list */}
        <div className="card !p-5 xl:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold text-primary">{selectedDayLabel}</h2>
              <p className="text-xs text-muted mt-0.5">
                {selectedSummary.available} available · {selectedSummary.booked} booked
                {selectedSummary.pending > 0 && ` · ${selectedSummary.pending} inquiry`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="text-xs font-semibold text-secondary hover:underline self-start"
            >
              Jump to today
            </button>
          </div>

          <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
            {groupedStatuses.map((group) => (
              <section key={group.key}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.rows.map(({ venue, status, booking }) => (
                    <div
                      key={venue.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                        status === 'available'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : status === 'pending'
                            ? 'border-amber-200 bg-amber-50/50'
                            : 'border-red-200 bg-red-50/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-primary">{venue.name}</p>
                        {booking ? (
                          <Link
                            to={bookingLink(booking, todayStr, path, can('manage_event_day'))}
                            className="text-xs text-gray-600 hover:text-primary hover:underline truncate block"
                          >
                            {booking.customer.name} · {booking.programme || booking.bookingNumber}
                          </Link>
                        ) : (
                          <p className="text-xs text-emerald-700">No booking — open for new events</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {booking && <StatusBadge status={booking.status} />}
                        <StatusChip status={status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* Month event list */}
      <div className="card">
        <h2 className="font-bold text-primary text-sm mb-4">Events in {monthName}</h2>
        {monthEvents.length === 0 ? (
          <p className="text-sm text-muted">No events scheduled this month.</p>
        ) : (
          <div className="space-y-1">
            {monthEvents.map((b) => (
              <Link
                key={b.id}
                to={bookingLink(b, todayStr, path, can('manage_event_day'))}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm hover:bg-gray-50/80 px-2 -mx-2 rounded-lg gap-3"
              >
                <div className="min-w-0">
                  <span className="font-medium text-primary">{b.functionDate}</span>
                  <span className="text-muted mx-2">·</span>
                  <span className="font-semibold">{b.venueName}</span>
                  <span className="text-muted mx-2">·</span>
                  <span>{b.customer.name}</span>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
