import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { getErrorMessage } from '../../utils/errorMessage';
import { validatePositiveInt } from '../../utils/formValidation';

export default function RecordAdjustment() {
  const { inventoryItemTypes, inventoryStockBalances, recordMissingOrDamaged } = useApp();
  const [form, setForm] = useState({
    itemTypeId: '',
    type: 'DAMAGED' as 'MISSING' | 'DAMAGED',
    quantity: 1,
    remarks: '',
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

  const selectedName = quantityTypes.find((t) => t.id === form.itemTypeId)?.name ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.itemTypeId || !form.remarks.trim()) {
      setError('Item and remarks are required.');
      return;
    }
    const qtyError = validatePositiveInt(form.quantity);
    if (qtyError) {
      setError(qtyError);
      return;
    }
    setSubmitting(true);
    try {
      await recordMissingOrDamaged(form);
      setSuccess(`Recorded ${form.quantity} ${selectedName} as ${form.type.toLowerCase()}.`);
      setForm((f) => ({ ...f, quantity: 1, remarks: '' }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record adjustment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <AlertTriangle size={24} /> Record Missing / Damaged
        </h1>
        <p className="text-sm text-muted mt-1">
          Record individual missing or damaged items without a full stock count — e.g. 1 chair damaged during an event.
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
          {form.itemTypeId && (
            <p className="text-xs text-muted mt-1">Good stock available: {goodQty}</p>
          )}
        </ModalField>

        <ModalField label="Type *">
          <select
            className={modalSelectClass}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'MISSING' | 'DAMAGED' }))}
          >
            <option value="DAMAGED">Damaged</option>
            <option value="MISSING">Missing</option>
          </select>
        </ModalField>

        <ModalField label="Quantity *">
          <input
            type="number"
            min={1}
            max={goodQty || undefined}
            className={modalInputClass}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
          />
        </ModalField>

        <ModalField label="Remarks *">
          <textarea
            className={modalTextareaClass}
            rows={3}
            placeholder="What happened and why?"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            required
          />
        </ModalField>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Record adjustment'}
        </button>
      </form>
    </div>
  );
}
