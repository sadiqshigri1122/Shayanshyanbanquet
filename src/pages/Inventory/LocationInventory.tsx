import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import { INVENTORY_LOCATIONS } from '../../types';
import { normalizeInventoryStatus } from '../../utils/inventoryUtils';

export default function LocationInventory() {
  const { inventoryItems, inventoryStockBalances, inventoryItemTypes } = useApp();
  const { path } = useDashboard();
  const [selectedLocation, setSelectedLocation] = useState<string>(INVENTORY_LOCATIONS[0]);

  const locationRows = useMemo(() => {
    const normalized = inventoryItems.map((i) => ({ ...i, status: normalizeInventoryStatus(i.status) }));
    const rows: Array<{
      itemName: string;
      category: string;
      quantity: number;
      available: number;
      reserved: number;
      issued: number;
      serialTracking: boolean;
    }> = [];

    const atLocation = normalized.filter((i) => i.location === selectedLocation && i.status !== 'RETIRED');
    const groups = new Map<string, typeof atLocation>();
    for (const item of atLocation) {
      const key = `${item.itemName}|${item.category}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    for (const [, items] of groups) {
      const sample = items[0];
      rows.push({
        itemName: sample.itemName,
        category: sample.category,
        quantity: items.length,
        available: items.filter((i) => i.status === 'AVAILABLE').length,
        reserved: items.filter((i) => i.status === 'RESERVED').length,
        issued: items.filter((i) => i.status === 'OUT').length,
        serialTracking: true,
      });
    }

    for (const balance of inventoryStockBalances.filter((b) => b.location === selectedLocation && b.quantity > 0)) {
      const type = inventoryItemTypes.find((t) => t.id === balance.itemTypeId);
      rows.push({
        itemName: type?.name ?? 'Unknown',
        category: type?.category ?? 'Other',
        quantity: balance.quantity,
        available: balance.quantity,
        reserved: 0,
        issued: 0,
        serialTracking: false,
      });
    }

    return rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [inventoryItems, inventoryStockBalances, inventoryItemTypes, selectedLocation]);

  const totalAtLocation = locationRows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Location Inventory</h1>
        <p className="text-sm text-muted mt-0.5">Quantities assigned to each hall or storage area</p>
      </div>

      <div className="card flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted block mb-1">Select location</label>
          <select
            className="input w-full"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {INVENTORY_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div className="card bg-surface-alt border-0 py-3 px-4 min-w-[140px]">
          <p className="text-xs text-muted">Total units</p>
          <p className="text-2xl font-bold text-primary">{totalAtLocation}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-secondary" />
          <h2 className="font-semibold text-primary">{selectedLocation}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 px-2">Category</th>
              <th className="py-2 px-2 text-right">Quantity</th>
              <th className="py-2 px-2 text-right">Available</th>
              <th className="py-2 px-2 text-right">Reserved</th>
              <th className="py-2 px-2 text-right">Issued</th>
              <th className="py-2 pl-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {locationRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">No inventory at this location.</td>
              </tr>
            ) : (
              locationRows.map((row) => (
                <tr key={`${row.itemName}-${row.serialTracking}`} className="border-b border-border/60">
                  <td className="py-3 pr-3 font-medium">{row.itemName}</td>
                  <td className="py-3 px-2 text-muted">{row.category}</td>
                  <td className="py-3 px-2 text-right font-semibold">{row.quantity}</td>
                  <td className="py-3 px-2 text-right text-success">{row.available}</td>
                  <td className="py-3 px-2 text-right">{row.reserved || '—'}</td>
                  <td className="py-3 px-2 text-right">{row.issued || '—'}</td>
                  <td className="py-3 pl-2 text-xs text-muted">{row.serialTracking ? 'Serial' : 'Quantity'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Link to={path('/master')} className="text-sm text-secondary font-semibold">← Back to Inventory Master</Link>
    </div>
  );
}
