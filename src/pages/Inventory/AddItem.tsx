import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';
import { previewQuantitySerials } from '../../utils/inventoryUtils';

export default function AddItem() {
  const { createInventoryItem, createInventoryItemsByQuantity, inventoryItems } = useApp();
  const { path } = useDashboard();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemName: '',
    category: INVENTORY_CATEGORIES[0],
    quantity: 1,
    serialTracking: true,
    unit: 'unit',
    condition: 'Good',
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

  const existingSerials = useMemo(
    () => new Set(inventoryItems.map((i) => i.serialNumber)),
    [inventoryItems],
  );

  const serialPreview = useMemo(() => {
    if (!form.serialTracking) return [];
    if (!form.itemName.trim() || form.quantity < 1) return [];
    if (form.quantity === 1 && form.serialNumber.trim()) return [form.serialNumber.trim()];
    return previewQuantitySerials(form.itemName.trim(), form.quantity, existingSerials);
  }, [form.itemName, form.quantity, form.serialNumber, form.serialTracking, existingSerials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    if (form.quantity < 1 || form.quantity > 500) {
      setError('Quantity must be between 1 and 500.');
      return;
    }

    setSubmitting(true);
    try {
      if (form.quantity === 1 && form.serialNumber.trim()) {
        await createInventoryItem({
          itemName: form.itemName.trim(),
          category: form.category,
          serialNumber: form.serialNumber.trim(),
          location: form.location,
          condition: form.condition,
          purchaseDate: form.purchaseDate,
          purchaseReference: form.purchaseReference.trim() || undefined,
          supplier: form.supplier.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
        setSuccess(`Item ${form.serialNumber.trim()} added successfully.`);
      } else {
        const result = await createInventoryItemsByQuantity({
          itemName: form.itemName.trim(),
          category: form.category,
          location: form.location,
          quantity: form.quantity,
          serialTracking: form.serialTracking,
          unit: form.unit,
          condition: form.condition,
          purchaseDate: form.purchaseDate,
          purchaseReference: form.purchaseReference.trim() || undefined,
          supplier: form.supplier.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
        if (result.errors.length > 0) {
          setError(`${result.created} created, ${result.errors.length} failed.`);
        } else {
          setSuccess(
            `${result.created} ${form.itemName} item(s) added (${result.serialNumbers[0]} … ${result.serialNumbers[result.serialNumbers.length - 1]}).`,
          );
        }
      }
      setTimeout(() => navigate(path('/items')), 1500);
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
        <p className="text-sm text-muted">Enter quantity to create individual serial numbers automatically</p>
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
          <ModalField label="Serial Tracking">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.serialTracking}
                onChange={(e) => setForm({ ...form, serialTracking: e.target.checked })}
              />
              Track individual serial numbers (uncheck for quantity-only items like glasses/plates)
            </label>
          </ModalField>
          {form.serialTracking && (
            <ModalField label="Condition">
              <input className={modalInputClass} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
            </ModalField>
          )}
          {!form.serialTracking && (
            <ModalField label="Unit">
              <input className={modalInputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. piece, set" />
            </ModalField>
          )}
          <ModalField label="Total Quantity *">
            <input
              type="number"
              min={1}
              max={500}
              className={modalInputClass}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value) || 1) })}
              required
            />
            <p className="text-xs text-muted mt-1">
              {form.serialTracking
                ? 'Creates one inventory record per unit with a unique serial number.'
                : 'Creates a quantity-based stock balance at the selected location.'}
            </p>
          </ModalField>
          {form.quantity === 1 && form.serialTracking && (
            <ModalField label="Serial Number (optional override)">
              <input
                className={modalInputClass}
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder="Leave blank to auto-generate"
              />
            </ModalField>
          )}
          <ModalField label="Location *">
            <select className={modalSelectClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as typeof form.location })}>
              {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>

          {serialPreview.length > 0 && (
            <div className="rounded-lg bg-surface-alt p-3 text-sm">
              <p className="font-semibold mb-1">Serial numbers to create ({serialPreview.length})</p>
              <p className="font-mono text-xs text-muted break-all">
                {serialPreview.length <= 8
                  ? serialPreview.join(', ')
                  : `${serialPreview.slice(0, 4).join(', ')} … ${serialPreview.slice(-2).join(', ')}`}
              </p>
            </div>
          )}

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
            {submitting ? 'Saving…' : form.quantity > 1 ? `Add ${form.quantity} Items` : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
