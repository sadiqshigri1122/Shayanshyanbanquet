import { useMemo, useState } from 'react';
import { ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalTextareaClass } from '../../components/ModalField';
import { getErrorMessage } from '../../utils/errorMessage';
import type { InventoryCheckout } from '../../types';

export default function CheckoutReturn() {
  const { inventoryCheckouts, returnOutsideCheckout, currentUser } = useApp();
  const openCheckouts = inventoryCheckouts.filter((c) => c.status === 'OPEN');

  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    returnedQty: 0,
    missingQty: 0,
    damagedQty: 0,
    returnRemarks: '',
    returnedBy: currentUser.name,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<InventoryCheckout | null>(null);

  const selected = useMemo(
    () => openCheckouts.find((c) => c.id === selectedId),
    [openCheckouts, selectedId],
  );

  const outstanding = selected?.outstanding ?? 0;

  const selectCheckout = (id: string) => {
    const checkout = openCheckouts.find((c) => c.id === id);
    setSelectedId(id);
    if (checkout) {
      setForm({
        returnedQty: checkout.outstanding,
        missingQty: 0,
        damagedQty: 0,
        returnRemarks: '',
        returnedBy: currentUser.name,
      });
    }
    setLastResult(null);
    setError('');
    setSuccess('');
  };

  const totalEntered = form.returnedQty + form.missingQty + form.damagedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const result = await returnOutsideCheckout(selectedId, form);
      setLastResult(result);
      setSuccess('Return recorded. Inventory updated.');
      setSelectedId('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record return.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <ArrowDownCircle size={24} /> Check In (Return)
        </h1>
        <p className="text-sm text-muted mt-1">
          Reconcile items returned from outside — compare issued vs returned, missing, and damaged.
        </p>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}

      {lastResult && (
        <div className="card border-l-4 border-l-success">
          <p className="font-semibold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success" /> Return complete — {lastResult.itemName}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
            <div><span className="text-muted">Issued</span><p className="font-bold">{lastResult.issuedQty}</p></div>
            <div><span className="text-muted">Returned</span><p className="font-bold text-success">{lastResult.returnedQty}</p></div>
            <div><span className="text-muted">Missing</span><p className="font-bold text-danger">{lastResult.missingQty}</p></div>
            <div><span className="text-muted">Damaged</span><p className="font-bold text-warning">{lastResult.damagedQty}</p></div>
          </div>
        </div>
      )}

      {openCheckouts.length === 0 ? (
        <div className="card text-muted text-sm">No open checkouts — all items are accounted for.</div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <h2 className="font-semibold text-primary mb-3">Open checkouts</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Issued to</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Issued</th>
                  <th className="py-2 pr-4">Expected back</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {openCheckouts.map((c) => (
                  <tr key={c.id} className={`border-b ${selectedId === c.id ? 'bg-surface-alt' : ''}`}>
                    <td className="py-3 pr-4 font-medium">{c.itemName}</td>
                    <td className="py-3 pr-4">{c.issuedTo}</td>
                    <td className="py-3 pr-4">{c.outstanding}</td>
                    <td className="py-3 pr-4">{new Date(c.issuedAt).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      {c.expectedReturnAt ? new Date(c.expectedReturnAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3">
                      <button type="button" className="text-secondary text-xs font-semibold" onClick={() => selectCheckout(c.id)}>
                        Process return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <form className={`card ${modalFormClass}`} onSubmit={handleSubmit}>
              <p className="text-sm font-medium text-primary mb-2">
                Returning: {selected.itemName} — {outstanding} outstanding (issued {selected.issuedQty} to {selected.issuedTo})
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ModalField label="Returned (good)">
                  <input
                    type="number"
                    min={0}
                    max={outstanding}
                    className={modalInputClass}
                    value={form.returnedQty}
                    onChange={(e) => setForm((f) => ({ ...f, returnedQty: Number(e.target.value) }))}
                  />
                </ModalField>
                <ModalField label="Missing">
                  <input
                    type="number"
                    min={0}
                    className={modalInputClass}
                    value={form.missingQty}
                    onChange={(e) => setForm((f) => ({ ...f, missingQty: Number(e.target.value) }))}
                  />
                </ModalField>
                <ModalField label="Damaged">
                  <input
                    type="number"
                    min={0}
                    className={modalInputClass}
                    value={form.damagedQty}
                    onChange={(e) => setForm((f) => ({ ...f, damagedQty: Number(e.target.value) }))}
                  />
                </ModalField>
              </div>

              <p className={`text-sm ${totalEntered === outstanding ? 'text-success' : 'text-danger'}`}>
                Total: {totalEntered} / {outstanding} required
                {totalEntered === outstanding ? ' ✓' : ' — must match outstanding'}
              </p>

              <ModalField label="Returned by">
                <input
                  className={modalInputClass}
                  value={form.returnedBy}
                  onChange={(e) => setForm((f) => ({ ...f, returnedBy: e.target.value }))}
                />
              </ModalField>

              <ModalField label="Remarks (required if missing/damaged)">
                <textarea
                  className={modalTextareaClass}
                  rows={2}
                  value={form.returnRemarks}
                  onChange={(e) => setForm((f) => ({ ...f, returnRemarks: e.target.value }))}
                />
              </ModalField>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || totalEntered !== outstanding}
              >
                {submitting ? 'Saving…' : 'Complete return'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
