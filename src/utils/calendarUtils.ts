import type { Booking, BookingStatus } from '../types';
import { BLOCKING_STATUSES } from './bookingUtils';
import { HALL_GROUP_LABELS, HALL_SUB_VENUES, venuesConflict, type HallGroup } from './venueConfig';

export type CalendarVenueGroup = HallGroup;

export interface CalendarVenue {
  id: string;
  name: string;
  group: CalendarVenueGroup;
  groupLabel: string;
}

export type HallAvailabilityStatus = 'available' | 'booked' | 'pending';

export interface DayHallStatus {
  venue: CalendarVenue;
  status: HallAvailabilityStatus;
  booking?: Booking;
}

const PENDING_STATUSES: BookingStatus[] = ['inquiry', 'pending_review'];

export const ALL_CALENDAR_VENUES: CalendarVenue[] = HALL_SUB_VENUES.map((h) => ({
  id: h.id,
  name: h.name,
  group: h.group,
  groupLabel: HALL_GROUP_LABELS[h.group],
}));

const venueIndex = new Map(ALL_CALENDAR_VENUES.map((v) => [v.id, v]));

export function getCalendarVenue(booking: Booking): CalendarVenue | undefined {
  const byId = venueIndex.get(booking.venueId);
  if (byId) return byId;
  return ALL_CALENDAR_VENUES.find(
    (v) => v.name.toLowerCase() === booking.venueName.trim().toLowerCase(),
  );
}

function bookingMatchesVenue(booking: Booking, venue: CalendarVenue): boolean {
  if (booking.venueId === venue.id) return true;
  if (venuesConflict(booking.venueId, venue.id)) return true;
  return booking.venueName.trim().toLowerCase() === venue.name.toLowerCase();
}

export function getBookingsForVenueDate(
  bookings: Booking[],
  venue: CalendarVenue,
  date: string,
  blockingStatuses: BookingStatus[] = BLOCKING_STATUSES,
): Booking[] {
  return bookings.filter(
    (b) =>
      b.functionDate === date &&
      bookingMatchesVenue(b, venue) &&
      (blockingStatuses.includes(b.status) || PENDING_STATUSES.includes(b.status)),
  );
}

export function getDayHallStatuses(
  bookings: Booking[],
  date: string,
  blockingStatuses: BookingStatus[] = BLOCKING_STATUSES,
): DayHallStatus[] {
  return ALL_CALENDAR_VENUES.map((venue) => {
    const dayBookings = getBookingsForVenueDate(bookings, venue, date, blockingStatuses);
    const blocking = dayBookings.find((b) => blockingStatuses.includes(b.status));
    if (blocking) return { venue, status: 'booked' as const, booking: blocking };
    const pending = dayBookings.find((b) => PENDING_STATUSES.includes(b.status));
    if (pending) return { venue, status: 'pending' as const, booking: pending };
    return { venue, status: 'available' as const };
  });
}

export function getDaySummary(statuses: DayHallStatus[]) {
  const booked = statuses.filter((s) => s.status === 'booked').length;
  const pending = statuses.filter((s) => s.status === 'pending').length;
  const available = statuses.filter((s) => s.status === 'available').length;
  return { total: statuses.length, booked, pending, available };
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function groupHallStatuses(rows: DayHallStatus[]) {
  const groups: { key: string; label: string; rows: DayHallStatus[] }[] = [
    { key: 'A', label: HALL_GROUP_LABELS.A, rows: [] },
    { key: 'B', label: HALL_GROUP_LABELS.B, rows: [] },
    { key: 'C', label: HALL_GROUP_LABELS.C, rows: [] },
  ];
  for (const row of rows) {
    groups.find((g) => g.key === row.venue.group)?.rows.push(row);
  }
  return groups.filter((g) => g.rows.length > 0);
}

export function filterHallStatuses(
  rows: DayHallStatus[],
  filter: 'all' | CalendarVenueGroup,
): DayHallStatus[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.venue.group === filter);
}
