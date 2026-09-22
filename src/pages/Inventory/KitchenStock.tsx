import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/bookingUtils';
import { isLowStock } from '../../utils/inventoryUtils';
import Modal from '../../components/Modal';
import ModalField, { modalFormClass, modalInputClass } from '../../components/ModalField';
import { getErrorMessage } from '../../utils/errorMessage';

export default function KitchenStockPage() {
  const { kitchenStock, kitchenPurchases, kitchenStockUsage, recordKitchenUsage, currentUser } = useApp();
  const [usageItem, setUsageItem] = useState<string | null>(null);
  const [usageForm, setUsageForm] = useState({ quantity: '', usedBy: currentUser.name, reason: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getPurchased = (item: string) =>
    kitchenPurchases.filter((p) => p.item === item).reduce((s, p) => s + p.quantity, 0);

  const getUsed = (item: string) =>
    kitchenStockUsage.filter((u) => u.item === item).reduce((s, u) => s + u.quantity, 0);

  const openUsage = (item: string) => {
    setUsageItem(item);
    setUsageForm({ quantity: '', usedBy: currentUser.name, reason: '' });
    setError('');
  };

  const submitUsage = async () => {
    if (!usageItem) return;
    const quantity = Number(usageForm.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      setError('Enter a valid quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await recordKitchenUsage({
        item: usageItem,
        quantity,
        usedBy: usageForm.usedBy.trim(),
        reason: usageForm.reason.trim() || undefined,
      });
      setUsageItem(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record usage.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Kitchen Stock</h1>
        <p className="text-sm text-muted">Quantity-based consumables</p>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold">Item</th>
              <th className="px-4 py-3 text-xs font-semibold">Purchased</th>
              <th className="px-4 py-3 text-xs font-semibold">Used</th>
              <th className="px-4 py-3 text-xs font-semibold">Current</th>
              <th className="px-4 py-3 text-xs font-semibold">Min</th>
              <th className="px-4 py-3 text-xs font-semibold">Last Purchase</th>
              <th className="px-4 py-3 text-xs font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {kitchenStock.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No stock items yet. Record a purchase first.</td></tr>
            ) : (
              kitchenStock.map((s) => {
                const low = isLowStock(s.currentQuantity, s.minThreshold);
                return (
                  <tr key={s.id} className={`border-b border-surface-alt ${low ? 'bg-warning/5' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{s.item}</span>
                      {low && <span className="ml-2 text-xs text-warning font-semibold">LOW STOCK</span>}
                      <p className="text-xs text-muted">{s.category}</p>
                    </td>
                    <td className="px-4 py-3">{getPurchased(s.item)} {s.unit}</td>
                    <td className="px-4 py-3">{getUsed(s.item)} {s.unit}</td>
                    <td className="px-4 py-3 font-bold">{s.currentQuantity} {s.unit}</td>
                    <td className="px-4 py-3">{s.minThreshold} {s.unit}</td>
                    <td className="px-4 py-3">
                      {s.lastPurchaseDate ?? '—'}
                      {s.lastPurchaseCost != null && <p className="text-xs text-muted">{formatCurrency(s.lastPurchaseCost)}/unit</p>}
                    </td>
                    <td className="px-4 py-3">
                      {currentUser.role === 'inventory_staff' && (
                        <button type="button" className="text-secondary text-xs font-semibold" onClick={() => openUsage(s.item)}>Record Use</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {usageItem && (
      <Modal onClose={() => !submitting && setUsageItem(null)} title={`Record Usage — ${usageItem}`}>
        <div className={modalFormClass}>
          {error && <p className="text-danger text-sm">{error}</p>}
          <ModalField label="Quantity Used *">
            <input type="number" min="0.01" step="0.01" className={modalInputClass} value={usageForm.quantity} onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })} />
          </ModalField>
          <ModalField label="Used By *">
            <input className={modalInputClass} value={usageForm.usedBy} onChange={(e) => setUsageForm({ ...usageForm, usedBy: e.target.value })} />
          </ModalField>
          <ModalField label="Reason">
            <input className={modalInputClass} value={usageForm.reason} onChange={(e) => setUsageForm({ ...usageForm, reason: e.target.value })} />
          </ModalField>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setUsageItem(null)} disabled={submitting}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void submitUsage()} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}
