import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import InventoryStatusBadge from '../../components/InventoryStatusBadge';
import { modalInputClass, modalSelectClass } from '../../components/ModalField';
import { formatInventoryDateTime } from '../../utils/inventoryUtils';

export default function InventoryHistory() {
  const { inventoryTransactions, inventoryItems, bookings } = useApp();
  const [actionFilter, setActionFilter] = useState<'all' | 'IN' | 'OUT' | 'TRANSFER' | 'MARK_MISSING' | 'MARK_DAMAGED' | 'RESTORE'>('all');
  const [serialSearch, setSerialSearch] = useState('');

  const rows = useMemo(() => {
    return [...inventoryTransactions]
      .filter((tx) => {
        if (actionFilter !== 'all' && tx.action !== actionFilter) return false;
        const q = serialSearch.trim().toLowerCase();
        if (q && !tx.serialNumber.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [inventoryTransactions, actionFilter, serialSearch]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Inventory History</h1>
        <p className="text-sm text-muted">Immutable audit trail — transactions cannot be deleted</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className={`${modalInputClass} flex-1`}
          placeholder="Filter by serial number..."
          value={serialSearch}
          onChange={(e) => setSerialSearch(e.target.value)}
        />
        <select className={`${modalSelectClass} sm:w-36`} value={actionFilter} onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}>
          <option value="all">All actions</option>
          <option value="IN">Received / Check In</option>
          <option value="OUT">Checked Out</option>
          <option value="TRANSFER">Transfer</option>
          <option value="MARK_MISSING">Marked Missing</option>
          <option value="MARK_DAMAGED">Marked Damaged</option>
          <option value="RESTORE">Restored</option>
        </select>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold">Date/Time</th>
              <th className="px-4 py-3 text-xs font-semibold">Action</th>
              <th className="px-4 py-3 text-xs font-semibold">Serial</th>
              <th className="px-4 py-3 text-xs font-semibold">Item</th>
              <th className="px-4 py-3 text-xs font-semibold">From → To</th>
              <th className="px-4 py-3 text-xs font-semibold">Person</th>
              <th className="px-4 py-3 text-xs font-semibold">Booking</th>
              <th className="px-4 py-3 text-xs font-semibold">Entered By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No transactions found.</td></tr>
            ) : (
              rows.map((tx) => {
                const item = inventoryItems.find((i) => i.id === tx.inventoryItemId);
                const booking = tx.bookingId ? bookings.find((b) => b.id === tx.bookingId) : undefined;
                return (
                  <tr key={tx.id} className="border-b border-surface-alt">
                    <td className="px-4 py-3 whitespace-nowrap">{formatInventoryDateTime(tx.transactionDate)}</td>
                    <td className="px-4 py-3"><InventoryStatusBadge status={tx.action} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{tx.serialNumber}</td>
                    <td className="px-4 py-3">{item?.itemName ?? '—'}</td>
                    <td className="px-4 py-3">{tx.fromLocation} → {tx.toLocation}</td>
                    <td className="px-4 py-3">{tx.person}</td>
                    <td className="px-4 py-3">{booking?.bookingNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{tx.createdBy}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
