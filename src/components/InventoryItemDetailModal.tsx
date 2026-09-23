import { Link } from 'react-router-dom';
import Modal from './Modal';
import InventoryStatusBadge from './InventoryStatusBadge';
import {
  formatInventoryDate,
  formatInventoryDateTime,
  formatTransactionLine,
  getDaysOut,
  isOverdueOut,
  INVENTORY_OVERDUE_DAYS,
} from '../utils/inventoryUtils';
import type { InventoryItem, InventoryTransaction } from '../types';

interface Props {
  item: InventoryItem;
  transactions: InventoryTransaction[];
  onClose: () => void;
  stockOutPath?: string;
  stockInPath?: string;
  showActions?: boolean;
}

export default function InventoryItemDetailModal({
  item,
  transactions,
  onClose,
  stockOutPath,
  stockInPath,
  showActions = false,
}: Props) {
  const history = transactions
    .filter((t) => t.inventoryItemId === item.id)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  const daysOut = getDaysOut(item, transactions);
  const overdue = isOverdueOut(item, transactions);

  return (
    <Modal onClose={onClose} title={`${item.itemName} (${item.serialNumber})`}>
      <div className="space-y-4 text-sm">
        {overdue && (
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-warning font-medium">
            Overdue — checked out {daysOut} days ago (limit: {INVENTORY_OVERDUE_DAYS} days). Follow up with {item.currentHolder ?? 'holder'}.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2">
          <p><span className="text-muted">Category:</span> {item.category}</p>
          <p className="flex items-center gap-2">
            <span className="text-muted">Status:</span>
            <InventoryStatusBadge status={item.status} />
          </p>
          <p><span className="text-muted">Location:</span> {item.location}</p>
          <p><span className="text-muted">Holder:</span> {item.currentHolder ?? '—'}</p>
          <p><span className="text-muted">Added by:</span> {item.createdBy}</p>
          {item.purchaseDate && <p><span className="text-muted">Purchase date:</span> {formatInventoryDate(item.purchaseDate)}</p>}
          {item.supplier && <p><span className="text-muted">Supplier:</span> {item.supplier}</p>}
          {item.notes && <p className="sm:col-span-2"><span className="text-muted">Notes:</span> {item.notes}</p>}
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-2">
            {item.status === 'IN' && stockOutPath && (
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

        <div>
          <h3 className="font-semibold mb-2">Movement History</h3>
          {history.length === 0 ? (
            <p className="text-muted">No transactions yet.</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((tx) => (
                <li key={tx.id} className="border-b border-surface-alt pb-2 last:border-0">
                  <p>{formatTransactionLine(tx)}</p>
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
