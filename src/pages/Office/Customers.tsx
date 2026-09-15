import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import Modal from '../../components/Modal';
import { staffBookingStatus } from '../../utils/staffLabels';

export default function Customers() {
  const { customers, bookings, addCustomer } = useApp();
  const { path, can } = useDashboard();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', cnic: '', address: '', fatherHusbandName: '', email: '' });

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.cnic && c.cnic.includes(search)),
  );

  const getCustomerBookings = (customerId: string) =>
    bookings.filter((b) => b.customer.id === customerId);

  const handleCreate = () => {
    addCustomer(form);
    setShowNew(false);
    setForm({ name: '', phone: '', cnic: '', address: '', fatherHusbandName: '', email: '' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Customers</h1>
          {!can('create_customer') && (
            <p className="text-sm text-muted mt-0.5">Read-only customer directory for oversight</p>
          )}
        </div>
        {can('create_customer') && (
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1 !px-4 !py-2 !rounded-lg text-sm"><Plus size={16} /> New Customer</button>
        )}
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, CNIC..." className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const customerBookings = getCustomerBookings(c.id);
          return (
            <div key={c.id} className="card hover:shadow-premium transition-all">
              <h3 className="font-bold text-primary">{c.name}</h3>
              {c.fatherHusbandName && <p className="text-xs text-gray-400">S/O {c.fatherHusbandName}</p>}
              <p className="text-sm text-gray-600 mt-2">{c.phone}</p>
              {c.cnic && <p className="text-xs text-muted">CNIC: {c.cnic}</p>}
              <p className="text-xs text-gray-400 mt-1 truncate">{c.address}</p>
              <p className="text-xs text-secondary font-semibold mt-3">{customerBookings.length} booking(s)</p>
              {customerBookings.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-gray-50 pt-2">
                  {customerBookings.slice(0, 3).map((b) => (
                    <Link key={b.id} to={path(`/bookings/${b.id}`)} className="block text-xs text-primary hover:text-secondary">
                      {b.bookingNumber} · {b.functionDate} · {staffBookingStatus(b.status)}
                    </Link>
                  ))}
                </div>
              )}
              {can('create_booking') && (
                <button
                  type="button"
                  onClick={() => navigate(path('/new-booking'), { state: { customer: c } })}
                  className="mt-3 text-xs font-semibold text-secondary hover:text-secondary-hover"
                >
                  + New booking for this customer
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <Modal title="New Customer" onClose={() => setShowNew(false)}>
          <div className="space-y-3">
            {(['name', 'phone', 'cnic', 'fatherHusbandName', 'address', 'email'] as const).map((field) => (
              <input key={field} placeholder={field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            ))}
            <button onClick={handleCreate} disabled={!form.name || !form.phone || !form.address} className="btn-primary w-full !py-2.5 !rounded-lg disabled:opacity-50">Create</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
