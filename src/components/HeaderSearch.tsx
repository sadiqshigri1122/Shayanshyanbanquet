import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/bookingUtils';
import StatusBadge from './StatusBadge';

export default function HeaderSearch() {
  const { bookings } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    return bookings
      .filter(
        (b) =>
          b.bookingNumber.toLowerCase().includes(q) ||
          b.customer.name.toLowerCase().includes(q) ||
          b.customer.phone.includes(q) ||
          (b.customer.cnic && b.customer.cnic.includes(q)),
      )
      .slice(0, 8);
  }, [bookings, q]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goTo = (bookingId: string) => {
    setQuery('');
    setOpen(false);
    navigate(`/office/bookings/${bookingId}`);
  };

  return (
    <div ref={ref} className="relative hidden sm:block">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search phone, name, booking no..."
        className="pl-9 pr-4 py-2 w-72 bg-surface-alt border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-secondary/30"
      />
      {open && q.length >= 2 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No bookings found</p>
          ) : (
            results.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(b.id)}
                className="w-full text-left px-4 py-3 hover:bg-surface-alt border-b border-gray-50 last:border-0"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-primary text-sm">{b.bookingNumber}</span>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {b.customer.name} · {b.customer.phone}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {b.functionDate} · {formatCurrency(b.grandTotal)} · Bal: {formatCurrency(b.remainingBalance)}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
