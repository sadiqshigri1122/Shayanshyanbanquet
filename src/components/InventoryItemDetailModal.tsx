import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import InventoryStatusBadge from './InventoryStatusBadge';
import ModalField, { modalInputClass, modalTextareaClass } from './ModalField';
import {
  formatInventoryDate,
  formatInventoryDateTime,
  formatTransactionLine,
  getDaysOut,
  getLastMovementTransaction,
  isAvailableItem,
  isOverdueOut,
  INVENTORY_OVERDUE_DAYS,
  normalizeInventoryStatus,
} from '../utils/inventoryUtils';
import { getErrorMessage } from '../utils/errorMessage';
import type { InventoryItem, InventoryTransaction } from '../types';

interface Props {
  item: InventoryItem;
  transactions: InventoryTransaction[];
  onClose: () => void;
  stockOutPath?: string;
  stockInPath?: string;
  showActions?: boolean;
  canUpdateStatus?: boolean;
  onStatusUpdated?: () => void;
  onUpdateStatus?: (data: {
    serialNumber: string;
    status: 'MISSING' | 'DAMAGED' | 'AVAILABLE';
    reason: string;
    notes?: string;
  }) => Promise<unknown>;
}

export default function InventoryItemDetailModal({
  item: rawItem,
  transactions,
  onClose,
  stockOutPath,
  stockInPath,
  showActions = false,
  canUpdateStatus = false,
  onStatusUpdated,
  onUpdateStatus,
}: Props) {
  const item = { ...rawItem, status: normalizeInventoryStatus(rawItem.status) };
  const history = transactions
    .filter((t) => t.inventoryItemId === item.id)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  const daysOut = getDaysOut(item, transactions);
  const overdue = isOverdueOut(item, transactions);
  const lastMovement = getLastMovementTransaction(item.id, transactions);

  const [statusAction, setStatusAction] = useState<'MISSING' | 'DAMAGED' | 'AVAILABLE' | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitStatus = async () => {
    if (!statusAction || !onUpdateStatus || !reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onUpdateStatus({
        serialNumber: item.serialNumber,
        status: statusAction,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      onStatusUpdated?.();
      setStatusAction(null);
      setReason('');
      setNotes('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update status.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`${item.itemName} (${item.serialNumber})`}>
      <div className="space-y-4 text-sm">
        {overdue && (
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-warning font-medium">
            Overdue — checked out {daysOut} days ago (limit: {INVENTORY_OVERDUE_DAYS} days). Follow up with {item.currentHolder ?? 'holder'}.
          </div>
        )}

        {item.status === 'MISSING' && (
          <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-danger">
            <p className="font-semibold">Missing item</p>
            <p className="mt-1">Last known location: {item.lastKnownLocation ?? 'Unknown'}</p>
            {lastMovement && (
              <p className="mt-1 text-xs">
                Last movement: {lastMovement.fromLocation} → {lastMovement.toLocation} ·{' '}
                {formatInventoryDateTime(lastMovement.transactionDate)} · {lastMovement.createdBy}
              </p>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2">
          <p><span className="text-muted">Category:</span> {item.category}</p>
          <p className="flex items-center gap-2">
            <span className="text-muted">Status:</span>
            <InventoryStatusBadge status={item.status} />
          </p>
          <p><span className="text-muted">Location:</span> {item.location}</p>
          {item.lastKnownLocation && item.status !== 'AVAILABLE' && (
            <p><span className="text-muted">Last known:</span> {item.lastKnownLocation}</p>
          )}
          <p><span className="text-muted">Holder:</span> {item.currentHolder ?? '—'}</p>
          <p><span className="text-muted">Added by:</span> {item.createdBy}</p>
          {item.purchaseDate && <p><span className="text-muted">Purchase date:</span> {formatInventoryDate(item.purchaseDate)}</p>}
          {item.supplier && <p><span className="text-muted">Supplier:</span> {item.supplier}</p>}
          {item.notes && <p className="sm:col-span-2"><span className="text-muted">Notes:</span> {item.notes}</p>}
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-2">
            {isAvailableItem(item) && stockOutPath && (
              <Link to={stockOutPath} className="btn-primary !text-xs !py-2 !px-3" state={{ serial: item.serialNumber }}>
                Check OUT
              </Link>
            )}
            {item.status === 'OUT' && stockInPath && (
              <Link to={stockInPath} className="btn-primary !text-xs !py-2 !px-3" state={{ serial: item.serialNumber }}>
                Check IN
              </Link>
            )}
          </div>
        )}

        {canUpdateStatus && onUpdateStatus && (
          <div className="border-t border-border pt-3">
            <p className="font-semibold mb-2">Update Status</p>
            {!statusAction ? (
              <div className="flex flex-wrap gap-2">
                {isAvailableItem(item) && (
                  <>
                    <button type="button" className="btn-secondary !text-xs" onClick={() => setStatusAction('MISSING')}>
                      Mark Missing
                    </button>
                    <button type="button" className="btn-secondary !text-xs" onClick={() => setStatusAction('DAMAGED')}>
                      Mark Damaged
                    </button>
                  </>
                )}
                {(item.status === 'MISSING' || item.status === 'DAMAGED') && (
                  <button type="button" className="btn-secondary !text-xs" onClick={() => setStatusAction('AVAILABLE')}>
                    Mark Available
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {error && <p className="text-danger text-xs">{error}</p>}
                <p className="text-xs text-muted">Marking as {statusAction.toLowerCase()}</p>
                <ModalField label="Reason *">
                  <input className={modalInputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
                </ModalField>
                <ModalField label="Notes">
                  <textarea className={modalTextareaClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </ModalField>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary !text-xs" disabled={submitting} onClick={() => void submitStatus()}>
                    {submitting ? 'Saving…' : 'Confirm'}
                  </button>
                  <button type="button" className="btn-secondary !text-xs" disabled={submitting} onClick={() => setStatusAction(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2">Movement History</h3>
          {history.length === 0 ? (
            <p className="text-muted">No transactions yet.</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((tx) => (
                <li key={tx.id} className="border-b border-surface-alt pb-2 last:border-0">
                  <p className="flex flex-wrap items-center gap-2">
                    {formatTransactionLine(tx)}
                    <InventoryStatusBadge status={tx.action} />
                  </p>
                  <p className="text-xs text-muted">
                    {tx.reason}
                    {tx.condition ? ` · Condition: ${tx.condition}` : ''}
                    {' · '}Entered by {tx.createdBy} · {formatInventoryDateTime(tx.transactionDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
