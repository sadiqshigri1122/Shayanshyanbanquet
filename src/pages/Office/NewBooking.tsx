import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, AlertTriangle, CheckCircle2, XCircle, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Customer, Booking } from '../../types';
import {
  formatCurrency, getDayName, needsDiscountApproval, searchCustomers,
} from '../../utils/bookingUtils';
import {
  createDefaultManualRows,
  manualRowsToServices,
  type ManualLineItem,
} from '../../utils/manualPricing';
import ManualPricingTable, { getPricingFromRows } from '../../components/ManualPricingTable';
import Modal from '../../components/Modal';
import PrintBookingSlip from '../../components/PrintBookingSlip';

export default function NewBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillCustomer = (location.state as { customer?: Customer } | null)?.customer;
  const {
    customers, venues, currentUser, settings,
    addCustomer, createBooking, isVenueAvailable, getNextSerial,
  } = useApp();

  const [customerSearch, setCustomerSearch] = useState(prefillCustomer?.name ?? '');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(prefillCustomer ?? null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', cnic: '', address: '', fatherHusbandName: '' });

  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [functionDate, setFunctionDate] = useState('');
  const [programme, setProgramme] = useState('Wedding');
  const [numberOfGuests, setNumberOfGuests] = useState(300);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const [pricingRows, setPricingRows] = useState<ManualLineItem[]>(createDefaultManualRows);
  const [discount, setDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState('');
  const [advancePaid, setAdvancePaid] = useState(0);

  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefillCustomer) {
      setSelectedCustomer(prefillCustomer);
      setCustomerSearch(prefillCustomer.name);
    }
  }, [prefillCustomer]);

  const filteredCustomers = useMemo(
    () => searchCustomers(customers, customerSearch, []),
    [customers, customerSearch],
  );

  const available = functionDate ? isVenueAvailable(venueId, functionDate) : null;
  const { subtotal, grandTotal } = getPricingFromRows(pricingRows, discount, advancePaid);
  const discountWarning = needsDiscountApproval(subtotal, discount, settings.discountApprovalThresholdPercent);
  const bookingNumberPreview = `SB-${1000 + getNextSerial()}`;

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
  };

  const handleCreateCustomer = async () => {
    const c = await addCustomer(newCustomer);
    setSelectedCustomer(c);
    setShowNewCustomer(false);
    setCustomerSearch(c.name);
  };

  const handleSave = async () => {
    setError('');
    if (!selectedCustomer) { setError('Please select or create a customer'); return; }
    if (!functionDate) { setError('Please select function date'); return; }
    if (!available) { setError('Venue is not available on selected date'); return; }

    const services = manualRowsToServices(pricingRows, currentUser.name);
    if (services.length === 0) {
      setError('Enter at least one charge amount');
      return;
    }

    const booking = await createBooking({
      customer: selectedCustomer,
      venueId, functionDate, programme, numberOfGuests,
      specialInstructions, internalNotes,
      services, discount, advancePaid,
      createdBy: currentUser.name,
    });

    if (!booking) { setError('Failed to create booking — venue may be unavailable'); return; }
    setSavedBooking(booking);
  };

  const resetForm = () => {
    setSavedBooking(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setFunctionDate('');
    setDiscount(0);
    setDiscountPercent('');
    setAdvancePaid(0);
    setPricingRows(createDefaultManualRows());
  };

  if (savedBooking) {
    return (
      <div className="animate-fade-in">
        <div className="no-print bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle2 className="text-success" />
          <div>
            <p className="font-bold text-success">Booking Created Successfully!</p>
            <p className="text-sm text-success">Booking Number: {savedBooking.bookingNumber} · Total: {formatCurrency(savedBooking.grandTotal)}</p>
          </div>
        </div>
        <PrintBookingSlip booking={savedBooking} />
        <div className="flex flex-wrap gap-3 mt-4 no-print">
          <button onClick={() => navigate(`/office/bookings/${savedBooking.id}`)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">Open Booking</button>
          {savedBooking.advancePaid > 0 && (
            <button onClick={() => navigate(`/office/payments?tab=receipts`)} className="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-semibold">View Receipt</button>
          )}
          <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">New Booking</h1>
          <p className="text-sm text-muted">Complete booking in 2–5 minutes · Ref: {bookingNumberPreview}</p>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT — Customer */}
        <div className="card space-y-4">
          <h2 className="font-bold text-primary text-sm flex items-center gap-2"><Search size={16} className="text-secondary" /> Customer</h2>
          <input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search by phone, name, CNIC..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {customerSearch && !selectedCustomer && (
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                  <p className="font-medium text-primary">{c.name}</p>
                  <p className="text-xs text-muted">{c.phone}{c.cnic && ` · ${c.cnic}`}</p>
                </button>
              ))}
              {filteredCustomers.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No customers found</p>}
            </div>
          )}
          <button onClick={() => setShowNewCustomer(true)} className="flex items-center gap-1 text-sm text-secondary font-semibold hover:text-secondary-hover">
            <Plus size={14} /> Create New Customer
          </button>
          {selectedCustomer && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-bold text-primary">{selectedCustomer.name}</p>
              <p>{selectedCustomer.phone}</p>
              {selectedCustomer.cnic && <p>CNIC: {selectedCustomer.cnic}</p>}
              <p className="text-muted">{selectedCustomer.address}</p>
              <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-xs text-danger mt-2">Clear</button>
            </div>
          )}
        </div>

        {/* CENTER — Booking Details */}
        <div className="card space-y-4">
          <h2 className="font-bold text-primary text-sm">Booking Details</h2>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Hall</label>
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {venues.filter((v) => v.status === 'active').map((v) => (
                <option key={v.id} value={v.id}>{v.name} (Cap: {v.capacity})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Function Date</label>
            <input type="date" value={functionDate} onChange={(e) => setFunctionDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            {functionDate && <p className="text-xs text-muted mt-1">Day: <strong>{getDayName(functionDate)}</strong></p>}
          </div>
          {available !== null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {available ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {available ? 'AVAILABLE' : 'NOT AVAILABLE'}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Programme</label>
              <select value={programme} onChange={(e) => setProgramme(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {['Wedding', 'Valima', 'Mehndi', 'Engagement', 'Birthday Party', 'Corporate Event', 'Milad', 'Other'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Total Guests (event)</label>
              <input type="number" min={10} value={numberOfGuests} onChange={(e) => setNumberOfGuests(+e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Special Instructions</label>
            <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Internal Notes</label>
            <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-yellow-50/50" placeholder="Staff only" />
          </div>
        </div>

        {/* RIGHT — Manual Pricing (paper slip style) */}
        <div className="card space-y-4">
          <h2 className="font-bold text-primary text-sm">Charges & Payment</h2>

          <ManualPricingTable
            rows={pricingRows}
            onChange={setPricingRows}
            discount={discount}
            onDiscountChange={setDiscount}
            discountPercent={discountPercent}
            onDiscountPercentChange={setDiscountPercent}
            advancePaid={advancePaid}
            onAdvanceChange={setAdvancePaid}
          />

          {discountWarning && (
            <div className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
              <AlertTriangle size={12} /> Discount exceeds {settings.discountApprovalThresholdPercent}% — manager approval required
            </div>
          )}

          <button onClick={handleSave} className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !rounded-lg text-sm">
            <Save size={16} /> Save Booking · {formatCurrency(grandTotal)}
          </button>
        </div>
      </div>

      {showNewCustomer && (
        <Modal title="Create New Customer" onClose={() => setShowNewCustomer(false)}>
          <div className="space-y-3">
            <input placeholder="Full Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone *" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="CNIC" value={newCustomer.cnic} onChange={(e) => setNewCustomer({ ...newCustomer, cnic: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Father/Husband Name" value={newCustomer.fatherHusbandName} onChange={(e) => setNewCustomer({ ...newCustomer, fatherHusbandName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Address *" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleCreateCustomer} disabled={!newCustomer.name || !newCustomer.phone || !newCustomer.address} className="btn-primary w-full !py-2.5 !rounded-lg disabled:opacity-50">Create Customer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
