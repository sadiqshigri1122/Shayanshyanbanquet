import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_LOCATIONS } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';

export default function StockOut() {
  const { inventoryItems, bookings, performStockOut } = useApp();
  const [form, setForm] = useState({
    serialNumber: '',
    fromLocation: INVENTORY_LOCATIONS[0] as string,
    toLocation: INVENTORY_LOCATIONS[1] as string,
    givenTo: '',
    reason: 'Event / Kitchen Use',
    bookingId: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedItem = useMemo(
    () => inventoryItems.find((i) => i.serialNumber === form.serialNumber.trim()),
    [inventoryItems, form.serialNumber],
  );

  const availableItems = inventoryItems.filter((i) => i.status === 'IN');
  const activeBookings = bookings.filter((b) => !['cancelled', 'rejected'].includes(b.status));

  const onSerialChange = (serial: string) => {
    const item = inventoryItems.find((i) => i.serialNumber === serial);
    setForm((f) => ({
      ...f,
      serialNumber: serial,
      fromLocation: item?.location ?? f.fromLocation,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.serialNumber.trim() || !form.givenTo.trim() || !form.reason.trim()) {
      setError('Serial number, holder, and reason are required.');
      return;
    }
    setSubmitting(true);
    try {
      await performStockOut({
        serialNumber: form.serialNumber.trim(),
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        givenTo: form.givenTo.trim(),
        reason: form.reason.trim(),
        bookingId: form.bookingId || undefined,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(`Stock OUT recorded for ${form.serialNumber}.`);
      setForm({
        serialNumber: '',
        fromLocation: INVENTORY_LOCATIONS[0] as string,
        toLocation: INVENTORY_LOCATIONS[1] as string,
        givenTo: '',
        reason: 'Event / Kitchen Use',
        bookingId: '',
        notes: '',
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record stock OUT.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Stock OUT</h1>
        <p className="text-sm text-muted">Check out equipment to staff or events</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="card">
        <div className={modalFormClass}>
          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-success text-sm">{success}</p>}

          <ModalField label="Serial Number *">
            <select className={modalSelectClass} value={form.serialNumber} onChange={(e) => onSerialChange(e.target.value)} required>
              <option value="">Select item (IN only)</option>
              {availableItems.map((i) => (
                <option key={i.id} value={i.serialNumber}>{i.serialNumber} — {i.itemName}</option>
              ))}
            </select>
          </ModalField>

          {selectedItem && (
            <div className="rounded-lg bg-surface-alt p-3 text-sm space-y-1">
              <p><span className="text-muted">Item:</span> {selectedItem.itemName}</p>
              <p className="flex items-center gap-2"><span className="text-muted">Status:</span> <InventoryStatusBadge status={selectedItem.status} /></p>
              <p><span className="text-muted">Current Location:</span> {selectedItem.location}</p>
            </div>
          )}

          <ModalField label="From Location *">
            <select className={modalSelectClass} value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}>
              {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
          <ModalField label="To Location *">
            <select className={modalSelectClass} value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })}>
              {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
          <ModalField label="Given To / Holder *">
            <input className={modalInputClass} value={form.givenTo} onChange={(e) => setForm({ ...form, givenTo: e.target.value })} placeholder="Chef Ahmed" required />
          </ModalField>
          <ModalField label="Reason *">
            <input className={modalInputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </ModalField>
          <ModalField label="Related Booking (optional)">
            <select className={modalSelectClass} value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })}>
              <option value="">None</option>
              {activeBookings.map((b) => (
                <option key={b.id} value={b.id}>{b.bookingNumber} — {b.customer.name} ({b.functionDate})</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Notes">
            <textarea className={modalTextareaClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </ModalField>

          <button type="submit" className="btn-primary" disabled={submitting || !selectedItem}>
            {submitting ? 'Processing…' : 'Record Stock OUT'}
          </button>
        </div>
      </form>
    </div>
  );
}
