import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import type { InventoryMasterRow } from '../../types';
import { buildInventorySummaries, normalizeInventoryStatus } from '../../utils/inventoryUtils';
import { INVENTORY_CATEGORIES } from '../../types';

export default function InventoryMaster() {
  const { inventoryItems, getInventoryMaster, apiMode } = useApp();
  const { path } = useDashboard();
  const [rows, setRows] = useState<InventoryMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getInventoryMaster()
      .then((data) => {
        if (active) setRows(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getInventoryMaster, inventoryItems.length]);

  const fallbackRows = useMemo(() => {
    const normalized = inventoryItems.map((i) => ({ ...i, status: normalizeInventoryStatus(i.status) }));
    return buildInventorySummaries(normalized).map((s) => ({
      itemTypeId: `legacy:${s.itemName}|${s.category}`,
      itemName: s.itemName,
      category: s.category,
      unit: 'unit',
      serialTracking: true,
      total: s.total,
      available: s.available,
      reserved: s.reserved,
      issued: s.out,
      missing: s.missing,
      damaged: s.damaged,
      underMaintenance: s.underMaintenance,
      inTransit: 0,
      retired: 0,
      locations: Object.keys(s.byLocation),
      lastUpdated: '',
    }));
  }, [inventoryItems]);

  const displayRows = rows.length > 0 ? rows : fallbackRows;

  const filtered = displayRows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (q && !row.itemName.toLowerCase().includes(q) && !row.category.toLowerCase().includes(q)) return false;
    if (category && row.category !== category) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Inventory Master</h1>
          <p className="text-sm text-muted mt-0.5">
            System-calculated totals — what you own, where it is, and current status breakdown
          </p>
        </div>
        <Link to={path('/add-item')} className="btn-primary inline-flex items-center gap-2">
          <Package size={16} /> Add Inventory
        </Link>
      </div>

      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9 w-full"
            placeholder="Search item or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {INVENTORY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && apiMode && <p className="text-sm text-muted">Loading master view…</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 px-2">Category</th>
              <th className="py-2 px-2 text-right">Total</th>
              <th className="py-2 px-2 text-right">Available</th>
              <th className="py-2 px-2 text-right">Reserved</th>
              <th className="py-2 px-2 text-right">Issued</th>
              <th className="py-2 px-2 text-right">Missing</th>
              <th className="py-2 px-2 text-right">Damaged</th>
              <th className="py-2 px-2">Tracking</th>
              <th className="py-2 pl-2">Locations</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-muted">No inventory items found.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.itemTypeId} className="border-b border-border/60 hover:bg-surface-alt/50">
                  <td className="py-3 pr-3 font-medium text-primary">{row.itemName}</td>
                  <td className="py-3 px-2 text-muted">{row.category}</td>
                  <td className="py-3 px-2 text-right font-semibold">{row.total}</td>
                  <td className="py-3 px-2 text-right text-success">{row.available}</td>
                  <td className="py-3 px-2 text-right">{row.reserved}</td>
                  <td className="py-3 px-2 text-right">{row.issued}</td>
                  <td className="py-3 px-2 text-right text-danger">{row.missing || '—'}</td>
                  <td className="py-3 px-2 text-right text-warning">{row.damaged || '—'}</td>
                  <td className="py-3 px-2 text-xs text-muted">{row.serialTracking ? 'Serial' : 'Quantity'}</td>
                  <td className="py-3 pl-2 text-xs text-muted max-w-[200px] truncate" title={row.locations.join(', ')}>
                    {row.locations.length ? row.locations.slice(0, 2).join(', ') : '—'}
                    {row.locations.length > 2 ? ` +${row.locations.length - 2}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-sm">
        <Link to={path('/locations')} className="text-secondary font-semibold">View by location →</Link>
        <Link to={path('/items')} className="text-secondary font-semibold">All serial assets →</Link>
      </div>
    </div>
  );
}
