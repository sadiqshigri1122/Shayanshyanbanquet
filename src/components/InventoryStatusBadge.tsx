import type { InventoryAction, InventoryStatus, EventInventoryLineStatus } from '../types';
import { normalizeInventoryStatus } from '../utils/inventoryUtils';

type BadgeValue = InventoryStatus | InventoryAction | EventInventoryLineStatus | 'IN';

const styles: Record<string, string> = {
  AVAILABLE: 'bg-success/15 text-success border-success/30',
  RESERVED: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  MISSING: 'bg-danger/15 text-danger border-danger/30',
  DAMAGED: 'bg-warning/15 text-warning border-warning/30',
  OUT: 'bg-secondary/15 text-secondary border-secondary/30',
  IN_TRANSIT: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  UNDER_MAINTENANCE: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  RETIRED: 'bg-muted/15 text-muted border-border',
  REQUIRED: 'bg-surface-alt text-primary border-border',
  ISSUED: 'bg-secondary/15 text-secondary border-secondary/30',
  RETURNED: 'bg-success/15 text-success border-success/30',
  RECONCILED: 'bg-success/15 text-success border-success/30',
  IN: 'bg-success/15 text-success border-success/30',
  TRANSFER: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  MARK_MISSING: 'bg-danger/15 text-danger border-danger/30',
  MARK_DAMAGED: 'bg-warning/15 text-warning border-warning/30',
  RESTORE: 'bg-success/15 text-success border-success/30',
  MAINTENANCE_START: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  RETIRE: 'bg-muted/15 text-muted border-border',
};

const labels: Record<string, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
  OUT: 'Issued',
  IN_TRANSIT: 'In Transit',
  UNDER_MAINTENANCE: 'Maintenance',
  RETIRED: 'Retired',
  REQUIRED: 'Required',
  ISSUED: 'Issued',
  RETURNED: 'Returned',
  RECONCILED: 'Reconciled',
  IN: 'Received',
  TRANSFER: 'Transfer',
  MARK_MISSING: 'Marked Missing',
  MARK_DAMAGED: 'Marked Damaged',
  RESTORE: 'Restored',
  MAINTENANCE_START: 'Maintenance',
  RETIRE: 'Retired',
};

export default function InventoryStatusBadge({ status }: { status: BadgeValue }) {
  const normalized =
    status === 'IN' ? 'IN' : status in labels ? status : normalizeInventoryStatus(status);
  const key = normalized in styles ? normalized : 'AVAILABLE';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${styles[key]}`}>
      {labels[key] ?? normalized}
    </span>
  );
}
