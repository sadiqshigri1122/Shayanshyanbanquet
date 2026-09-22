import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { KITCHEN_CATEGORIES } from '../../types';
import { formatCurrency } from '../../utils/bookingUtils';
import { getErrorMessage } from '../../utils/errorMessage';

const UNITS = ['KG', 'Litre', 'Piece', 'Pack', 'Dozen'] as const;

export default function KitchenPurchases() {
  const { createKitchenPurchase, currentUser } = useApp();
  const [form, setForm] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    item: '',
    category: KITCHEN_CATEGORIES[0],
    quantity: '',
    unit: UNITS[0],
    unitCost: '',
    supplier: '',
    purchasedBy: currentUser.name,
    receivedBy: currentUser.name,
    invoiceNumber: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalCost = useMemo(() => {
    const q = Number(form.quantity);
    const c = Number(form.unitCost);
    if (Number.isNaN(q) || Number.isNaN(c) || q <= 0 || c < 0) return 0;
    return Math.round(q * c);
  }, [form.quantity, form.unitCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    if (!form.item.trim() || Number.isNaN(quantity) || quantity <= 0) {
      setError('Valid item and quantity are required.');
      return;
    }
    if (Number.isNaN(unitCost) || unitCost < 0) {
      setError('Valid unit cost is required.');
      return;
    }
    setSubmitting(true);
    try {
      await createKitchenPurchase({
        purchaseDate: form.purchaseDate,
        item: form.item.trim(),
        category: form.category,
        quantity,
        unit: form.unit,
        unitCost,
        supplier: form.supplier.trim(),
        purchasedBy: form.purchasedBy.trim(),
        receivedBy: form.receivedBy.trim(),
        invoiceNumber: form.invoiceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(`Purchase recorded — ${formatCurrency(totalCost)}`);
      setForm((f) => ({ ...f, item: '', quantity: '', unitCost: '', invoiceNumber: '', notes: '' }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save purchase.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Kitchen Purchases</h1>
        <p className="text-sm text-muted">Record food & consumable purchases</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="card">
        <div className={modalFormClass}>
          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-success text-sm">{success}</p>}

          <ModalField label="Purchase Date *">
            <input type="date" className={modalInputClass} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required />
          </ModalField>
          <ModalField label="Item *">
            <input className={modalInputClass} value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Chicken" required />
          </ModalField>
          <ModalField label="Category *">
            <select className={modalSelectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
              {KITCHEN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </ModalField>
          <div className="grid sm:grid-cols-2 gap-4">
            <ModalField label="Quantity *">
              <input type="number" min="0.01" step="0.01" className={modalInputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </ModalField>
            <ModalField label="Unit *">
              <select className={modalSelectClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as typeof form.unit })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </ModalField>
          </div>
          <ModalField label="Unit Cost (Rs.) *">
            <input type="number" min="0" className={modalInputClass} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} required />
          </ModalField>
          <div className="rounded-lg bg-secondary-light/50 p-3">
            <p className="text-sm text-muted">Total Cost (auto)</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalCost)}</p>
          </div>
          <ModalField label="Supplier *">
            <input className={modalInputClass} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required />
          </ModalField>
          <div className="grid sm:grid-cols-2 gap-4">
            <ModalField label="Purchased By *">
              <input className={modalInputClass} value={form.purchasedBy} onChange={(e) => setForm({ ...form, purchasedBy: e.target.value })} required />
            </ModalField>
            <ModalField label="Received By *">
              <input className={modalInputClass} value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} required />
            </ModalField>
          </div>
          <ModalField label="Invoice Number">
            <input className={modalInputClass} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          </ModalField>
          <ModalField label="Notes">
            <textarea className={modalTextareaClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </ModalField>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Record Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
}
