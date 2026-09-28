import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalTextareaClass } from '../../components/ModalField';
import { getErrorMessage } from '../../utils/errorMessage';

interface CountLine {
  itemTypeId: string;
  itemName: string;
  systemGoodQty: number;
  actualGoodQty: string;
  remarks: string;
}

export default function StockCount() {
  const { inventoryItemTypes, finalizeStockCount, getInventoryMaster } = useApp();
  const [lines, setLines] = useState<CountLine[]>([]);
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const master = await getInventoryMaster();
      const qtyRows = master.filter((r) => !r.serialTracking);
      setLines(
        qtyRows.map((r) => ({
          itemTypeId: r.itemTypeId,
          itemName: r.itemName,
          systemGoodQty: r.available,
          actualGoodQty: String(r.available),
          remarks: '',
        })),
      );
      setLoaded(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load inventory.'));
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (itemTypeId: string, patch: Partial<CountLine>) => {
    setLines((prev) => prev.map((l) => (l.itemTypeId === itemTypeId ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = lines.map((l) => {
      const actual = Number(l.actualGoodQty);
      const missing = Math.max(0, l.systemGoodQty - actual);
      const surplus = Math.max(0, actual - l.systemGoodQty);
      if ((missing > 0 || surplus > 0) && !l.remarks.trim()) {
        throw new Error(`Remarks required for ${l.itemName} — count differs from system.`);
      }
      return {
        itemTypeId: l.itemTypeId,
        actualGoodQty: actual,
        remarks: l.remarks.trim() || undefined,
      };
    });

    setSubmitting(true);
    try {
      await finalizeStockCount({ lines: payload, notes: notes.trim() || undefined });
      setSuccess('Stock count saved. Inventory updated.');
      setLoaded(false);
      setLines([]);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save stock count.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <ClipboardCheck size={24} /> Physical Stock Count
        </h1>
        <p className="text-sm text-muted mt-1">
          Count items whenever you need — no daily requirement. The system flags missing quantities automatically.
        </p>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}

      {!loaded ? (
        <div className="card">
          <p className="text-sm text-muted mb-4">
            Load all quantity-tracked items ({inventoryItemTypes.filter((t) => !t.serialTracking).length} types) to begin counting.
          </p>
          <button type="button" className="btn-primary" onClick={loadItems} disabled={loading}>
            {loading ? 'Loading…' : 'Start stock count'}
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">System (Good)</th>
                  <th className="py-2 pr-4">Actual count</th>
                  <th className="py-2 pr-4">Variance</th>
                  <th className="py-2">Remarks (if different)</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const actual = Number(line.actualGoodQty) || 0;
                  const missing = Math.max(0, line.systemGoodQty - actual);
                  const surplus = Math.max(0, actual - line.systemGoodQty);
                  return (
                    <tr key={line.itemTypeId} className="border-b border-surface-alt">
                      <td className="py-3 pr-4 font-medium">{line.itemName}</td>
                      <td className="py-3 pr-4">{line.systemGoodQty}</td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min={0}
                          className="input w-24"
                          value={line.actualGoodQty}
                          onChange={(e) => updateLine(line.itemTypeId, { actualGoodQty: e.target.value })}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        {missing > 0 && <span className="text-danger font-medium">{missing} missing</span>}
                        {surplus > 0 && <span className="text-warning font-medium">{surplus} surplus</span>}
                        {missing === 0 && surplus === 0 && <span className="text-success">OK</span>}
                      </td>
                      <td className="py-3">
                        <input
                          className="input w-full min-w-[180px]"
                          placeholder={missing > 0 || surplus > 0 ? 'Required' : 'Optional'}
                          value={line.remarks}
                          onChange={(e) => updateLine(line.itemTypeId, { remarks: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={`card ${modalFormClass}`}>
            <ModalField label="Count session notes">
              <textarea className={modalTextareaClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </ModalField>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Finalize count'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setLoaded(false)}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
