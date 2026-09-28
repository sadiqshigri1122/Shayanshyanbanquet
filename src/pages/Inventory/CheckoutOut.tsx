import { useMemo, useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { getErrorMessage } from '../../utils/errorMessage';
import { validatePositiveInt } from '../../utils/formValidation';

export default function CheckoutOut() {
  const { inventoryItemTypes, inventoryStockBalances, createOutsideCheckout } = useApp();
  const [form, setForm] = useState({
    itemTypeId: '',
    issuedTo: '',
    issuedQty: 1,
    purpose: '',
    expectedReturnAt: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quantityTypes = inventoryItemTypes.filter((t) => !t.serialTracking);

  const goodQty = useMemo(() => {
    if (!form.itemTypeId) return 0;
    return inventoryStockBalances
      .filter((b) => b.itemTypeId === form.itemTypeId)
      .reduce((sum, b) => sum + (b.goodQty ?? b.quantity ?? 0), 0);
  }, [form.itemTypeId, inventoryStockBalances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.itemTypeId || !form.issuedTo.trim() || !form.purpose.trim()) {
      setError('Item, who took it, and purpose are required.');
      return;
    }
    const qtyError = validatePositiveInt(form.issuedQty, 'Issued quantity');
    if (qtyError) {
      setError(qtyError);
      return;
    }
    setSubmitting(true);
    try {
      await createOutsideCheckout({
        ...form,
        issuedTo: form.issuedTo.trim(),
        purpose: form.purpose.trim(),
        expectedReturnAt: form.expectedReturnAt || undefined,
        notes: form.notes.trim() || undefined,
      });
      setSuccess('Items checked out successfully.');
      setForm({
        itemTypeId: '',
        issuedTo: '',
        issuedQty: 1,
        purpose: '',
        expectedReturnAt: '',
        notes: '',
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not check out items.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <ArrowUpCircle size={24} /> Check Out (Outside)
        </h1>
        <p className="text-sm text-muted mt-1">
          Record items taken outside the hall — who took them, how many, and when they are expected back.
        </p>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}

      <form className={`card ${modalFormClass}`} onSubmit={handleSubmit}>
        <ModalField label="Item *">
          <select
            className={modalSelectClass}
            value={form.itemTypeId}
            onChange={(e) => setForm((f) => ({ ...f, itemTypeId: e.target.value }))}
            required
          >
            <option value="">Select item…</option>
            {quantityTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {form.itemTypeId && <p className="text-xs text-muted mt-1">Available: {goodQty}</p>}
        </ModalField>

        <ModalField label="Who took it *">
          <input
            className={modalInputClass}
            value={form.issuedTo}
            onChange={(e) => setForm((f) => ({ ...f, issuedTo: e.target.value }))}
            placeholder="Name or company"
            required
          />
        </ModalField>

        <ModalField label="Quantity *">
          <input
            type="number"
            min={1}
            max={goodQty || undefined}
            className={modalInputClass}
            value={form.issuedQty}
            onChange={(e) => setForm((f) => ({ ...f, issuedQty: Number(e.target.value) }))}
          />
        </ModalField>

        <ModalField label="Purpose / destination *">
          <input
            className={modalInputClass}
            value={form.purpose}
            onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
            placeholder="Where and why"
            required
          />
        </ModalField>

        <ModalField label="Expected return">
          <input
            type="datetime-local"
            className={modalInputClass}
            value={form.expectedReturnAt}
            onChange={(e) => setForm((f) => ({ ...f, expectedReturnAt: e.target.value }))}
          />
        </ModalField>

        <ModalField label="Notes">
          <textarea
            className={modalTextareaClass}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </ModalField>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Check out items'}
        </button>
      </form>
    </div>
  );
}
