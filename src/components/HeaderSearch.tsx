import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/bookingUtils';
import type { Booking } from '../types';
import StatusBadge from './StatusBadge';

function SearchResults({
  results,
  onSelect,
}: {
  results: Booking[];
  onSelect: (bookingId: string) => void;
}) {
  if (results.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted">No bookings found</p>;
  }

  return (
    <>
      {results.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onSelect(b.id)}
          className="w-full text-left px-4 py-3 hover:bg-surface-alt border-b border-gray-50 last:border-0 min-h-[44px]"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-primary text-sm">{b.bookingNumber}</span>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-xs text-gray-600 mt-0.5 truncate">
            {b.customer.name} · {b.customer.phone}
          </p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {b.functionDate} · {formatCurrency(b.grandTotal)} · Bal: {formatCurrency(b.remainingBalance)}
          </p>
        </button>
      ))}
    </>
  );
}

export default function HeaderSearch() {
  const { bookings } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const goTo = (bookingId: string) => {
    setQuery('');
    setOpen(false);
    setMobileOpen(false);
    navigate(`/office/bookings/${bookingId}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="sm:hidden touch-target flex items-center justify-center rounded hover:bg-surface-alt text-muted"
        aria-label="Search bookings"
      >
        <Search size={20} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white sm:hidden flex flex-col animate-fade-in">
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search phone, name, booking no..."
                className="w-full pl-9 pr-4 py-2.5 bg-surface-alt border border-border rounded-lg text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setQuery('');
              }}
              className="touch-target flex items-center justify-center rounded-lg hover:bg-surface-alt text-muted shrink-0"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {q.length < 2 ? (
              <p className="p-4 text-sm text-muted text-center">Type at least 2 characters to search</p>
            ) : (
              <SearchResults results={results} onSelect={goTo} />
            )}
          </div>
        </div>
      )}

      <div ref={ref} className="relative hidden sm:block min-w-0 w-full max-w-[11rem] md:max-w-xs lg:w-72">
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
          className="w-full pl-9 pr-4 py-2 bg-surface-alt border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-secondary/30"
        />
        {open && q.length >= 2 && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            <SearchResults results={results} onSelect={goTo} />
          </div>
        )}
      </div>
    </>
  );
}
