import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getDayName } from '../../utils/bookingUtils';

export default function Inquiry() {
  const { venues, submitInquiry, isVenueAvailable } = useApp();
  const [params] = useSearchParams();
  const [submitted, setSubmitted] = useState<{ bookingNumber: string } | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    venueId: params.get('venue') || venues[0]?.id || '',
    functionDate: '', programme: 'Wedding', numberOfGuests: 300, message: '',
  });
  const [availability, setAvailability] = useState<boolean | null>(null);

  const checkAvailability = () => {
    if (form.venueId && form.functionDate) {
      setAvailability(isVenueAvailable(form.venueId, form.functionDate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const booking = await submitInquiry(form);
    setSubmitted({ bookingNumber: booking.bookingNumber });
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center animate-fade-in">
        <CheckCircle2 size={64} className="mx-auto text-success mb-4" />
        <h1 className="text-2xl font-bold text-primary mb-2">Inquiry Submitted!</h1>
        <p className="text-muted mb-4">Your booking reference number is:</p>
        <p className="text-3xl font-bold text-secondary mb-6">{submitted.bookingNumber}</p>
        <p className="text-sm text-muted mb-6">Our team will contact you within 24 hours. You can track status using your booking number.</p>
        <Link to={`/booking-status?ref=${submitted.bookingNumber}`} className="text-secondary font-semibold hover:text-secondary-hover">Check Booking Status →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-secondary text-sm font-medium tracking-[0.2em] uppercase">Book Now</span>
        <h1 className="text-3xl font-bold text-primary mt-2">Submit Booking Inquiry</h1>
      </div>

      <form onSubmit={handleSubmit} className="card !rounded-2xl space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03XX-XXXXXXX" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
            <select required value={form.venueId} onChange={(e) => { setForm({ ...form, venueId: e.target.value }); setAvailability(null); }} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              {venues.filter((v) => v.status === 'active').map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Function Date *</label>
            <input required type="date" value={form.functionDate} onChange={(e) => { setForm({ ...form, functionDate: e.target.value }); setAvailability(null); }} min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {form.functionDate && (
          <p className="text-sm text-muted">Function Day: <strong>{getDayName(form.functionDate)}</strong></p>
        )}

        <button type="button" onClick={checkAvailability} className="text-sm text-secondary font-semibold hover:text-secondary-hover">Check Availability</button>
        {availability !== null && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${availability ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {availability ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {availability ? 'AVAILABLE — You can proceed with inquiry' : 'NOT AVAILABLE — Please choose another date or venue'}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
            <select required value={form.programme} onChange={(e) => setForm({ ...form, programme: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              {['Wedding', 'Valima', 'Mehndi', 'Engagement', 'Birthday Party', 'Corporate Event', 'Milad', 'Other'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests *</label>
            <input required type="number" min={10} value={form.numberOfGuests} onChange={(e) => setForm({ ...form, numberOfGuests: +e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button type="submit" className="btn-secondary w-full !py-3 !rounded-lg">Submit Inquiry</button>
      </form>
    </div>
  );
}
