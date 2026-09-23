import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalInputClass, modalSelectClass, modalTextareaClass } from '../../components/ModalField';
import { INVENTORY_LOCATIONS } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';
import { isAvailableItem } from '../../utils/inventoryUtils';

export default function TransferItems() {
  const { inventoryItems, performTransfer } = useApp();
  const [fromLocation, setFromLocation] = useState(INVENTORY_LOCATIONS[0] as string);
  const [toLocation, setToLocation] = useState(INVENTORY_LOCATIONS[1] as string);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('Hall relocation');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableAtSource = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventoryItems.filter((i) => {
      if (!isAvailableItem(i) || i.location !== fromLocation) return false;
      if (!q) return true;
      return (
        i.serialNumber.toLowerCase().includes(q) ||
        i.itemName.toLowerCase().includes(q)
      );
    });
  }, [inventoryItems, fromLocation, search]);

  const toggle = (serial: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial);
      else next.add(serial);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(availableAtSource.map((i) => i.serialNumber)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (selected.size === 0) {
      setError('Select at least one serial number.');
      return;
    }
    if (fromLocation === toLocation) {
      setError('From and to locations must differ.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await performTransfer({
        serialNumbers: [...selected],
        fromLocation,
        toLocation,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      setSuccess(`Transferred ${result.transferred} item(s) from ${fromLocation} to ${toLocation}.`);
      setSelected(new Set());
    } catch (err) {
      setError(getErrorMessage(err, 'Transfer failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Transfer Items</h1>
        <p className="text-sm text-muted">Move available items between locations — select the serial numbers being moved</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="card space-y-4">
        {error && <p className="text-danger text-sm">{error}</p>}
        {success && <p className="text-success text-sm">{success}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <ModalField label="From Location *">
            <select
              className={modalSelectClass}
              value={fromLocation}
              onChange={(e) => {
                setFromLocation(e.target.value);
                setSelected(new Set());
              }}
            >
              {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
          <ModalField label="To Location *">
            <select className={modalSelectClass} value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
              {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
        </div>

        <ModalField label="Reason *">
          <input className={modalInputClass} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </ModalField>
        <ModalField label="Notes">
          <textarea className={modalTextareaClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </ModalField>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input
              className={`${modalInputClass} flex-1 min-w-[200px]`}
              placeholder="Search serial or item name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="btn-secondary !text-xs" onClick={selectAll}>
              Select all ({availableAtSource.length})
            </button>
            <button type="button" className="btn-secondary !text-xs" onClick={clearSelection}>
              Clear
            </button>
          </div>
          <p className="text-xs text-muted mb-2">
            {selected.size} selected · {availableAtSource.length} available at {fromLocation}
          </p>
          <div className="border border-border rounded-lg max-h-72 overflow-y-auto">
            {availableAtSource.length === 0 ? (
              <p className="p-4 text-sm text-muted">No available items at this location.</p>
            ) : (
              <ul className="divide-y divide-surface-alt">
                {availableAtSource.map((item) => (
                  <li key={item.id}>
                    <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-alt/50">
                      <input
                        type="checkbox"
                        checked={selected.has(item.serialNumber)}
                        onChange={() => toggle(item.serialNumber)}
                      />
                      <span className="font-mono text-xs">{item.serialNumber}</span>
                      <span className="text-sm">{item.itemName}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting || selected.size === 0}>
          {submitting ? 'Transferring…' : `Transfer ${selected.size} Item(s)`}
        </button>
      </form>
    </div>
  );
}
