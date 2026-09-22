import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';

export default function AddItem() {
  const { createInventoryItem } = useApp();
  const { path } = useDashboard();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemName: '',
    category: INVENTORY_CATEGORIES[0],
    serialNumber: '',
    location: INVENTORY_LOCATIONS[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseReference: '',
    supplier: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.itemName.trim() || !form.serialNumber.trim()) {
      setError('Item name and serial number are required.');
      return;
    }
    setSubmitting(true);
    try {
      await createInventoryItem({
        itemName: form.itemName.trim(),
        category: form.category,
        serialNumber: form.serialNumber.trim(),
        location: form.location,
        purchaseDate: form.purchaseDate,
        purchaseReference: form.purchaseReference.trim() || undefined,
        supplier: form.supplier.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(`Item ${form.serialNumber} added successfully.`);
      setTimeout(() => navigate(path('/items')), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add item.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Add Item</h1>
        <p className="text-sm text-muted">Register a new serialized asset</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="card">
        <div className={modalFormClass}>
          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-success text-sm">{success}</p>}

          <ModalField label="Item Name *">
            <input className={modalInputClass} value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required />
          </ModalField>
          <ModalField label="Category *">
            <select className={modalSelectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
              {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </ModalField>
          <ModalField label="Serial Number *">
            <input className={modalInputClass} value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="SN-KIT-1001" required />
          </ModalField>
          <ModalField label="Location *">
            <select className={modalSelectClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as typeof form.location })}>
              {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
          <ModalField label="Purchase Date">
            <input type="date" className={modalInputClass} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </ModalField>
          <ModalField label="Purchase Reference">
            <input className={modalInputClass} value={form.purchaseReference} onChange={(e) => setForm({ ...form, purchaseReference: e.target.value })} />
          </ModalField>
          <ModalField label="Supplier">
            <input className={modalInputClass} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </ModalField>
          <ModalField label="Notes">
            <textarea className={modalTextareaClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </ModalField>

          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
