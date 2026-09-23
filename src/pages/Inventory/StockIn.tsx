import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_LOCATIONS } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';

const CONDITIONS = ['Good', 'Fair', 'Needs Repair', 'Damaged'] as const;

export default function StockIn() {
  const { inventoryItems, bookings, performStockIn } = useApp();
  const location = useLocation();
  const prefillSerial = (location.state as { serial?: string } | null)?.serial ?? '';
  const [form, setForm] = useState({
    serialNumber: prefillSerial,
    fromLocation: INVENTORY_LOCATIONS[1] as string,
    toLocation: INVENTORY_LOCATIONS[0] as string,
    returnedBy: '',
    condition: CONDITIONS[0] as string,
    reason: 'Returned after use',
    bookingId: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const outItems = inventoryItems.filter((i) => i.status === 'OUT');
  const selectedItem = useMemo(
    () => inventoryItems.find((i) => i.serialNumber === form.serialNumber.trim()),
    [inventoryItems, form.serialNumber],
  );
  const activeBookings = bookings.filter((b) => !['cancelled', 'rejected'].includes(b.status));

  const onSerialChange = (serial: string) => {
    const item = inventoryItems.find((i) => i.serialNumber === serial);
    setForm((f) => ({
      ...f,
      serialNumber: serial,
      fromLocation: item?.location ?? f.fromLocation,
      returnedBy: item?.currentHolder ?? f.returnedBy,
    }));
  };

  useEffect(() => {
    if (prefillSerial) onSerialChange(prefillSerial);
  }, [prefillSerial, inventoryItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.serialNumber.trim() || !form.returnedBy.trim()) {
      setError('Serial number and returned by are required.');
      return;
    }
    setSubmitting(true);
    try {
      await performStockIn({
        serialNumber: form.serialNumber.trim(),
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        returnedBy: form.returnedBy.trim(),
        condition: form.condition,
        reason: form.reason.trim(),
        bookingId: form.bookingId || undefined,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(`Stock IN recorded for ${form.serialNumber}.`);
      setForm({
        serialNumber: '',
        fromLocation: INVENTORY_LOCATIONS[1],
        toLocation: INVENTORY_LOCATIONS[0],
        returnedBy: '',
        condition: CONDITIONS[0] as string,
        reason: 'Returned after use',
        bookingId: '',
        notes: '',
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record stock IN.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Stock IN</h1>
        <p className="text-sm text-muted">Return checked-out equipment to store</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="card">
        <div className={modalFormClass}>
          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-success text-sm">{success}</p>}

          <ModalField label="Serial Number *">
            <select className={modalSelectClass} value={form.serialNumber} onChange={(e) => onSerialChange(e.target.value)} required>
              <option value="">Select item (OUT only)</option>
              {outItems.map((i) => (
                <option key={i.id} value={i.serialNumber}>{i.serialNumber} — {i.itemName} ({i.currentHolder})</option>
              ))}
            </select>
          </ModalField>

          {selectedItem && (
            <div className="rounded-lg bg-surface-alt p-3 text-sm space-y-1">
              <p><span className="text-muted">Item:</span> {selectedItem.itemName}</p>
              <p className="flex items-center gap-2"><span className="text-muted">Status:</span> <InventoryStatusBadge status={selectedItem.status} /></p>
              <p><span className="text-muted">Current Holder:</span> {selectedItem.currentHolder ?? '—'}</p>
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
          <ModalField label="Returned By *">
            <input className={modalInputClass} value={form.returnedBy} onChange={(e) => setForm({ ...form, returnedBy: e.target.value })} required />
          </ModalField>
          <ModalField label="Condition *">
            <select className={modalSelectClass} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </ModalField>
          <ModalField label="Reason *">
            <input className={modalInputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </ModalField>
          <ModalField label="Related Booking (optional)">
            <select className={modalSelectClass} value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })}>
              <option value="">None</option>
              {activeBookings.map((b) => (
                <option key={b.id} value={b.id}>{b.bookingNumber} — {b.customer.name}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Notes">
            <textarea className={modalTextareaClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </ModalField>

          <button type="submit" className="btn-primary" disabled={submitting || !selectedItem}>
            {submitting ? 'Processing…' : 'Record Stock IN'}
          </button>
        </div>
      </form>
    </div>
  );
}
