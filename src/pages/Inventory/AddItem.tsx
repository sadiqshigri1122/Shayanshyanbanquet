import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_CATEGORIES } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';

export default function AddItem() {
  const { addInventoryStock, inventoryItemTypes } = useApp();
  const { path } = useDashboard();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [form, setForm] = useState({
    itemTypeId: '',
    itemName: '',
    category: INVENTORY_CATEGORIES[0] as string,
    quantity: 1,
    unit: 'unit',
    supplier: '',
    purchaseReference: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quantityTypes = inventoryItemTypes.filter((t) => !t.serialTracking);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (mode === 'new' && !form.itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    if (mode === 'existing' && !form.itemTypeId) {
      setError('Select an existing item.');
      return;
    }

    setSubmitting(true);
    try {
      await addInventoryStock(
        mode === 'existing'
          ? { itemTypeId: form.itemTypeId, quantity: form.quantity, notes: form.notes.trim() || undefined }
          : {
              itemName: form.itemName.trim(),
              category: form.category,
              quantity: form.quantity,
              unit: form.unit,
              supplier: form.supplier.trim() || undefined,
              purchaseReference: form.purchaseReference.trim() || undefined,
              notes: form.notes.trim() || undefined,
            },
      );
      setSuccess(`Added ${form.quantity} item(s) to inventory.`);
      setForm((f) => ({ ...f, quantity: 1, notes: '' }));
      if (mode === 'new') {
        setForm((f) => ({ ...f, itemName: '', quantity: 1, notes: '' }));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add inventory.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Add Inventory</h1>
        <p className="text-sm text-muted mt-1">
          Add items and quantities to your banquet inventory — chairs, tables, crockery, equipment, etc.
        </p>
      </div>

      <div className="card flex gap-2">
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'new' ? 'bg-primary text-white' : 'bg-surface-alt text-muted'}`}
          onClick={() => setMode('new')}
        >
          New item type
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'existing' ? 'bg-primary text-white' : 'bg-surface-alt text-muted'}`}
          onClick={() => setMode('existing')}
        >
          Add to existing
        </button>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}

      <form className={`card ${modalFormClass}`} onSubmit={handleSubmit}>
        {mode === 'existing' ? (
          <ModalField label="Existing item *">
            <select
              className={modalSelectClass}
              value={form.itemTypeId}
              onChange={(e) => setForm((f) => ({ ...f, itemTypeId: e.target.value }))}
              required
            >
              <option value="">Select item…</option>
              {quantityTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </ModalField>
        ) : (
          <>
            <ModalField label="Item name *">
              <input
                className={modalInputClass}
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Banquet Chair"
                required
              />
            </ModalField>
            <ModalField label="Category *">
              <select
                className={modalSelectClass}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {INVENTORY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Unit">
              <input
                className={modalInputClass}
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                placeholder="unit, set, piece…"
              />
            </ModalField>
          </>
        )}

        <ModalField label="Quantity *">
          <input
            type="number"
            min={1}
            className={modalInputClass}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
            required
          />
        </ModalField>

        {mode === 'new' && (
          <>
            <ModalField label="Supplier">
              <input
                className={modalInputClass}
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </ModalField>
            <ModalField label="Purchase reference">
              <input
                className={modalInputClass}
                value={form.purchaseReference}
                onChange={(e) => setForm((f) => ({ ...f, purchaseReference: e.target.value }))}
              />
            </ModalField>
          </>
        )}

        <ModalField label="Notes">
          <textarea
            className={modalTextareaClass}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </ModalField>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add to inventory'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(path('/master'))}>
            View master
          </button>
        </div>
      </form>
    </div>
  );
}
