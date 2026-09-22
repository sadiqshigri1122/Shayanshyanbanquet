import type { InventoryStatus } from '../types';

const styles: Record<InventoryStatus, string> = {
  IN: 'bg-success/15 text-success border-success/30',
  OUT: 'bg-warning/15 text-warning border-warning/30',
};

export default function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}
