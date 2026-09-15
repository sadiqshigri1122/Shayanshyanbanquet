import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { formatCurrency } from '../../utils/bookingUtils';
import StatusBadge from '../../components/StatusBadge';

export default function Bookings() {
  const { bookings } = useApp();
  const { path, can } = useDashboard();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = bookings
    .filter((b) => filter === 'all' || b.status === filter)
    .filter((b) =>
      !search ||
      b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.phone.includes(search),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary">All Bookings</h1>
        {can('create_booking') && (
          <Link to={path('/new-booking')} className="btn-primary !px-4 !py-2 !rounded-lg text-sm text-center">+ New Booking</Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search booking, customer, phone..." className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm">
          <option value="all">All Statuses</option>
          {['inquiry', 'pending_review', 'tentative', 'hold', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-muted text-xs">Booking</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs">Customer</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs">Venue</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs">Date</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs">Total</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs">Balance</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs">Status</th>
              <th className="px-4 py-3 font-semibold text-muted text-xs"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-bold text-primary">{b.bookingNumber}</td>
                <td className="px-4 py-3">{b.customer.name}<br /><span className="text-xs text-gray-400">{b.customer.phone}</span></td>
                <td className="px-4 py-3 text-gray-600">{b.venueName}</td>
                <td className="px-4 py-3 text-gray-600">{b.functionDate}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(b.grandTotal)}</td>
                <td className="px-4 py-3 font-bold text-danger">{formatCurrency(b.remainingBalance)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3">
                  <Link to={path(`/bookings/${b.id}`)} className="text-secondary text-xs font-semibold hover:text-secondary-hover">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-12 text-gray-400">No bookings found</p>}
      </div>
    </div>
  );
}
