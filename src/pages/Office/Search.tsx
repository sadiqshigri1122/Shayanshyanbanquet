import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, searchCustomers } from '../../utils/bookingUtils';
import StatusBadge from '../../components/StatusBadge';

export default function SearchPage() {
  const { bookings, customers } = useApp();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const bookingResults = useMemo(() => {
    if (q.length < 2) return [];
    return bookings.filter(
      (b) =>
        b.bookingNumber.toLowerCase().includes(q) ||
        b.customer.name.toLowerCase().includes(q) ||
        b.customer.phone.includes(q) ||
        (b.customer.cnic && b.customer.cnic.includes(q)) ||
        b.venueName.toLowerCase().includes(q),
    );
  }, [bookings, q]);

  const customerResults = useMemo(() => {
    if (q.length < 2) return [];
    return searchCustomers(customers, q, bookings);
  }, [customers, bookings, q]);

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Search</h1>
      <p className="text-sm text-muted -mt-4">Tip: use the search bar at the top of every page for quick lookup.</p>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type phone, name, CNIC, or booking number..."
          className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          autoFocus
        />
      </div>

      {q.length >= 2 && (
        <>
          <div>
            <h2 className="font-bold text-primary text-sm mb-3">Bookings ({bookingResults.length})</h2>
            {bookingResults.length === 0 ? <p className="text-gray-400 text-sm">No bookings found</p> : (
              <div className="space-y-2">
                {bookingResults.map((b) => (
                  <Link key={b.id} to={`/office/bookings/${b.id}`} className="block card !py-4 hover:shadow-sm transition-all">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">{b.bookingNumber}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{b.customer.name} · {b.venueName} · {b.functionDate}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(b.grandTotal)} · Balance: {formatCurrency(b.remainingBalance)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-bold text-primary text-sm mb-3">Customers ({customerResults.length})</h2>
            {customerResults.length === 0 ? <p className="text-gray-400 text-sm">No customers found</p> : (
              <div className="grid md:grid-cols-2 gap-3">
                {customerResults.map((c) => (
                  <div key={c.id} className="card !py-4">
                    <p className="font-bold text-primary">{c.name}</p>
                    <p className="text-sm text-gray-600">{c.phone}</p>
                    {c.cnic && <p className="text-xs text-muted">CNIC: {c.cnic}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
