import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarCheck, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass } from '../../components/ModalField';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';
import { getErrorMessage } from '../../utils/errorMessage';
import type { EventInventoryLineStatus } from '../../types';

export default function EventInventoryPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const {
    bookings,
    inventoryItemTypes,
    eventInventoryLines,
    inventoryItems,
    upsertEventInventoryRequirement,
    reserveEventInventory,
    issueEventInventory,
    returnEventInventory,
    currentUser,
  } = useApp();

  const booking = bookings.find((b) => b.id === bookingId);
  const lines = eventInventoryLines.filter((l) => l.bookingId === bookingId);

  const [requireForm, setRequireForm] = useState({ itemTypeId: '', requiredQty: 1, notes: '' });
  const [actionLineId, setActionLineId] = useState('');
  const [reserveQty, setReserveQty] = useState(1);
  const [issueQty, setIssueQty] = useState(1);
  const [issueTo, setIssueTo] = useState('');
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [returnForm, setReturnForm] = useState({
    returnedQty: 0,
    missingQty: 0,
    damagedQty: 0,
    toLocation: 'Store Room',
    returnedBy: currentUser.name,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const activeLine = lines.find((l) => l.id === actionLineId);
  const availableSerials = useMemo(() => {
    if (!activeLine) return [];
    return inventoryItems.filter(
      (i) =>
        i.itemTypeId === activeLine.itemTypeId &&
        (i.status === 'AVAILABLE' || i.status === 'RESERVED') &&
        (!i.activeBookingId || i.activeBookingId === bookingId),
    );
  }, [activeLine, inventoryItems, bookingId]);

  const reservedSerials = useMemo(() => {
    if (!activeLine?.allocations) return [];
    return activeLine.allocations.filter((a) => a.status === 'RESERVED' || a.status === 'ISSUED');
  }, [activeLine]);

  if (!booking) {
    return <div className="card text-muted">Booking not found.</div>;
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await fn();
      setMessage('Saved successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <CalendarCheck size={24} /> Event Inventory
        </h1>
        <p className="text-sm text-muted mt-1">
          {booking.bookingNumber} — {booking.venueName} — {booking.functionDate}
        </p>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {message && <p className="text-success text-sm">{message}</p>}

      <div className="card">
        <h2 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Package size={18} /> Define requirements
        </h2>
        <form
          className={modalFormClass}
          onSubmit={(e) => {
            e.preventDefault();
            if (!requireForm.itemTypeId) return;
            void runAction(() =>
              upsertEventInventoryRequirement(booking.id, {
                itemTypeId: requireForm.itemTypeId,
                requiredQty: requireForm.requiredQty,
                notes: requireForm.notes || undefined,
              }),
            );
          }}
        >
          <ModalField label="Item type">
            <select
              className={modalSelectClass}
              value={requireForm.itemTypeId}
              onChange={(e) => setRequireForm({ ...requireForm, itemTypeId: e.target.value })}
              required
            >
              <option value="">Select item…</option>
              {inventoryItemTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Required quantity">
            <input
              type="number"
              min={1}
              className={modalInputClass}
              value={requireForm.requiredQty}
              onChange={(e) => setRequireForm({ ...requireForm, requiredQty: Number(e.target.value) })}
            />
          </ModalField>
          <button type="submit" className="btn-primary" disabled={busy}>Add / update requirement</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Required</th>
              <th className="py-2 text-right">Reserved</th>
              <th className="py-2 text-right">Issued</th>
              <th className="py-2 text-right">Returned</th>
              <th className="py-2 text-right">Missing</th>
              <th className="py-2 text-right">Damaged</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={9} className="py-6 text-center text-muted">No inventory requirements yet.</td></tr>
            ) : (
              lines.map((line) => {
                const discrepancy = line.issuedQty - line.returnedQty - line.missingQty - line.damagedQty;
                return (
                  <tr key={line.id} className="border-b border-border/60">
                    <td className="py-3 font-medium">{line.itemName}</td>
                    <td className="py-3 text-right">{line.requiredQty}</td>
                    <td className="py-3 text-right">{line.reservedQty}</td>
                    <td className="py-3 text-right">{line.issuedQty}</td>
                    <td className="py-3 text-right">{line.returnedQty}</td>
                    <td className="py-3 text-right text-danger">{line.missingQty || '—'}</td>
                    <td className="py-3 text-right text-warning">{line.damagedQty || '—'}</td>
                    <td className="py-3">
                      <InventoryStatusBadge status={line.status as EventInventoryLineStatus} />
                    </td>
                    <td className="py-3">
                      <button type="button" className="text-secondary text-xs font-semibold" onClick={() => setActionLineId(line.id)}>
                        Manage
                      </button>
                      {discrepancy > 0 && (
                        <span className="block text-xs text-warning">{discrepancy} outstanding</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {activeLine && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-primary">Manage: {activeLine.itemName}</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Reserve</p>
              <input type="number" min={1} className={modalInputClass} value={reserveQty} onChange={(e) => setReserveQty(Number(e.target.value))} />
              {availableSerials.length > 0 && (
                <div className="max-h-32 overflow-y-auto border border-border rounded p-2 text-xs space-y-1">
                  {availableSerials.map((i) => (
                    <label key={i.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSerials.includes(i.serialNumber)}
                        onChange={(e) => {
                          setSelectedSerials((prev) =>
                            e.target.checked
                              ? [...prev, i.serialNumber]
                              : prev.filter((s) => s !== i.serialNumber),
                          );
                        }}
                      />
                      {i.serialNumber}
                    </label>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={busy}
                onClick={() =>
                  void runAction(() =>
                    reserveEventInventory(activeLine.id, {
                      quantity: reserveQty,
                      serialNumbers: selectedSerials.length ? selectedSerials.slice(0, reserveQty) : undefined,
                    }),
                  )
                }
              >
                Reserve
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Issue</p>
              <input type="number" min={1} className={modalInputClass} value={issueQty} onChange={(e) => setIssueQty(Number(e.target.value))} />
              <input className={modalInputClass} placeholder="Issued to" value={issueTo} onChange={(e) => setIssueTo(e.target.value)} />
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={busy || !issueTo.trim()}
                onClick={() =>
                  void runAction(() =>
                    issueEventInventory(activeLine.id, {
                      quantity: issueQty,
                      serialNumbers: reservedSerials.slice(0, issueQty).map((a) => a.serialNumber!).filter(Boolean),
                      issuedTo: issueTo.trim(),
                    }),
                  )
                }
              >
                Issue to event
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Return / reconcile</p>
              <input type="number" min={0} className={modalInputClass} placeholder="Returned qty" value={returnForm.returnedQty} onChange={(e) => setReturnForm({ ...returnForm, returnedQty: Number(e.target.value) })} />
              <input type="number" min={0} className={modalInputClass} placeholder="Missing qty" value={returnForm.missingQty} onChange={(e) => setReturnForm({ ...returnForm, missingQty: Number(e.target.value) })} />
              <input type="number" min={0} className={modalInputClass} placeholder="Damaged qty" value={returnForm.damagedQty} onChange={(e) => setReturnForm({ ...returnForm, damagedQty: Number(e.target.value) })} />
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={busy}
                onClick={() =>
                  void runAction(() =>
                    returnEventInventory(activeLine.id, {
                      ...returnForm,
                      serialNumbers: [],
                    }),
                  )
                }
              >
                Return & reconcile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
