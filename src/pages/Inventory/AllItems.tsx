import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';
import Modal from '../../components/Modal';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_CATEGORIES } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';

export default function AllItems() {
  const { inventoryItems, updateInventoryItemMeta, currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ itemName: '', category: INVENTORY_CATEGORIES[0] as string, supplier: '', notes: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return inventoryItems.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        i.itemName.toLowerCase().includes(q) ||
        i.serialNumber.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        (i.currentHolder?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [inventoryItems, search, statusFilter]);

  const openEdit = (id: string) => {
    const item = inventoryItems.find((i) => i.id === id);
    if (!item) return;
    setEditId(id);
    setForm({
      itemName: item.itemName,
      category: item.category,
      supplier: item.supplier ?? '',
      notes: item.notes ?? '',
    });
    setError('');
  };

  const saveEdit = async () => {
    if (!editId || !form.itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await updateInventoryItemMeta(editId, {
        itemName: form.itemName.trim(),
        category: form.category,
        supplier: form.supplier.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setEditId(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update item.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">All Items</h1>
        <p className="text-sm text-muted">Serialized equipment inventory</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className={`${modalInputClass} flex-1`}
          placeholder="Search by name, serial, location, holder..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${modalSelectClass} sm:w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">All status</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold">Serial</th>
              <th className="px-4 py-3 text-xs font-semibold">Item</th>
              <th className="px-4 py-3 text-xs font-semibold">Category</th>
              <th className="px-4 py-3 text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-xs font-semibold">Location</th>
              <th className="px-4 py-3 text-xs font-semibold">Holder</th>
              <th className="px-4 py-3 text-xs font-semibold">Added By</th>
              <th className="px-4 py-3 text-xs font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No items found.</td></tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.id} className="border-b border-surface-alt hover:bg-surface-alt/50">
                  <td className="px-4 py-3 font-mono text-xs">{i.serialNumber}</td>
                  <td className="px-4 py-3 font-medium">{i.itemName}</td>
                  <td className="px-4 py-3 text-muted">{i.category}</td>
                  <td className="px-4 py-3"><InventoryStatusBadge status={i.status} /></td>
                  <td className="px-4 py-3">{i.location}</td>
                  <td className="px-4 py-3">{i.currentHolder ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{i.createdBy}</td>
                  <td className="px-4 py-3">
                    {currentUser.role === 'inventory_staff' && (
                      <button type="button" className="text-secondary text-xs font-semibold" onClick={() => openEdit(i.id)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editId && (
      <Modal onClose={() => !submitting && setEditId(null)} title="Edit Item">
        <div className={modalFormClass}>
          {error && <p className="text-danger text-sm">{error}</p>}
          <ModalField label="Item Name">
            <input className={modalInputClass} value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
          </ModalField>
          <ModalField label="Category">
            <select className={modalSelectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </ModalField>
          <ModalField label="Supplier">
            <input className={modalInputClass} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </ModalField>
          <ModalField label="Notes">
            <textarea className={modalTextareaClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </ModalField>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditId(null)} disabled={submitting}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void saveEdit()} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}
