import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, isApiEnabled } from '../../api/backend';
import { formatCurrency, formatStatus } from '../../utils/bookingUtils';
import type { Booking } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import PrintBookingSlip from '../../components/PrintBookingSlip';

export default function BookingStatus() {
  const { getBookingByNumber } = useApp();
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get('ref') || '');
  const [booking, setBooking] = useState<Booking | undefined | null>(() => {
    const initial = params.get('ref');
    return initial ? getBookingByNumber(initial) ?? null : null;
  });
  const [showSlip, setShowSlip] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const resolveBooking = async (bookingRef: string): Promise<Booking | undefined> => {
    const trimmed = bookingRef.trim();
    if (!trimmed) return undefined;

    const local = getBookingByNumber(trimmed);
    if (local) return local;

    if (isApiEnabled()) {
      try {
        return await api.lookupBooking(trimmed);
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSearchError('');
    setShowSlip(false);
    try {
      const found = await resolveBooking(ref);
      setBooking(found ?? undefined);
      if (!found && ref.trim()) setSearchError('No booking found for that reference number.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <div className={`text-center mb-8 ${showSlip ? 'no-print' : ''}`}>
        <span className="text-secondary text-sm font-medium tracking-[0.2em] uppercase">Track Booking</span>
        <h1 className="text-3xl font-bold text-primary mt-2">Booking Status Lookup</h1>
      </div>

      <form onSubmit={(e) => void handleSearch(e)} className={`flex gap-2 mb-8 ${showSlip ? 'no-print' : ''}`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Enter booking number (e.g. SB-1001)" className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button type="submit" disabled={searching} className="btn-primary !px-6 !py-3 !rounded-lg disabled:opacity-60">
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchError && (
        <div className="text-center py-8 text-muted">{searchError}</div>
      )}

      {booking === undefined && ref && !searchError && (
        <div className="text-center py-12 text-muted">No booking found for &quot;{ref}&quot;</div>
      )}

      {booking && !showSlip && (
        <div className="card !rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">{booking.bookingNumber}</h2>
            <div className="flex gap-2">
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.paymentStatus} type="payment" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p><span className="text-muted">Customer:</span> <strong>{booking.customer.name}</strong></p>
            <p><span className="text-muted">Phone:</span> {booking.customer.phone}</p>
            <p><span className="text-muted">Venue:</span> {booking.venueName}</p>
            <p><span className="text-muted">Event:</span> {booking.programme}</p>
            <p><span className="text-muted">Date:</span> {booking.functionDate} ({booking.functionDay})</p>
            <p><span className="text-muted">Guests:</span> {booking.numberOfGuests}</p>
          </div>
          <div className="border-t border-border pt-4 grid grid-cols-2 gap-3 text-sm">
            <p><span className="text-muted">Total:</span> <strong>{formatCurrency(booking.grandTotal)}</strong></p>
            <p><span className="text-muted">Paid:</span> {formatCurrency(booking.advancePaid)}</p>
            <p><span className="text-muted">Balance:</span> <strong className="text-secondary">{formatCurrency(booking.remainingBalance)}</strong></p>
            <p><span className="text-muted">Status:</span> {formatStatus(booking.status)}</p>
          </div>
          <button onClick={() => setShowSlip(true)} className="btn-secondary w-full flex items-center justify-center gap-2 !py-3">
            <FileText size={16} /> View Booking Slip
          </button>
        </div>
      )}

      {booking && showSlip && (
        <PrintBookingSlip booking={booking} onClose={() => setShowSlip(false)} />
      )}
    </div>
  );
}
