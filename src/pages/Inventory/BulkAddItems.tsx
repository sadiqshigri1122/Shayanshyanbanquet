import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass } from '../../components/ModalField';
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '../../types';
import {
  buildInventoryTemplateCsv,
  generateSerialNumbers,
  makeSerialPrefix,
  parseInventoryCsv,
  type ParsedBulkRow,
} from '../../utils/inventoryUtils';
import { getErrorMessage } from '../../utils/errorMessage';

type Tab = 'csv' | 'quantity';

export default function BulkAddItems() {
  const { inventoryItems, bulkCreateInventoryItems } = useApp();
  const { path } = useDashboard();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('quantity');
  const [previewRows, setPreviewRows] = useState<ParsedBulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { serialNumber: string; error: string }[] } | null>(null);
  const [error, setError] = useState('');

  const existingSerials = useMemo(
    () => new Set(inventoryItems.map((i) => i.serialNumber)),
    [inventoryItems],
  );

  const [qtyForm, setQtyForm] = useState({
    itemName: '',
    category: INVENTORY_CATEGORIES[4] as string,
    location: INVENTORY_LOCATIONS.find((l) => l.includes('Hall A')) ?? INVENTORY_LOCATIONS[0],
    quantity: '10',
    serialPrefix: '',
    supplier: '',
    notes: '',
  });

  const autoPrefix = useMemo(
    () => makeSerialPrefix(qtyForm.itemName, qtyForm.location),
    [qtyForm.itemName, qtyForm.location],
  );

  const quantityPreview = useMemo(() => {
    const qty = Number(qtyForm.quantity);
    if (!qtyForm.itemName.trim() || Number.isNaN(qty) || qty < 1 || qty > 200) return [];
    const prefix = (qtyForm.serialPrefix.trim() || autoPrefix).toUpperCase();
    return generateSerialNumbers(prefix, qty, existingSerials).map((row, i) => ({
      rowNumber: i + 1,
      itemName: qtyForm.itemName.trim(),
      category: qtyForm.category,
      serialNumber: row.serialNumber,
      location: qtyForm.location,
      supplier: qtyForm.supplier.trim() || undefined,
      notes: qtyForm.notes.trim() || undefined,
      errors: [
        ...row.errors,
        ...(qtyForm.itemName.trim() ? [] : ['Item name is required.']),
      ],
    }));
  }, [qtyForm, autoPrefix, existingSerials]);

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + buildInventoryTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    const text = await file.text();
    const { rows, parseErrors: errs } = parseInventoryCsv(text, existingSerials);
    setPreviewRows(rows);
    setParseErrors(errs);
  };

  const buildQuantityPreview = () => {
    setError('');
    setResult(null);
    setPreviewRows(quantityPreview);
    setParseErrors([]);
  };

  const validRows = previewRows.filter((r) => r.errors.length === 0);
  const invalidRows = previewRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      setError('No valid rows to import. Fix errors in preview first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await bulkCreateInventoryItems(
        validRows.map((r) => ({
          itemName: r.itemName,
          category: r.category,
          serialNumber: r.serialNumber,
          location: r.location,
          purchaseDate: r.purchaseDate,
          supplier: r.supplier,
          notes: r.notes,
          currentHolder: undefined,
          purchaseReference: undefined,
        })),
      );
      setResult({ created: res.created, errors: res.errors });
      if (res.created > 0 && res.errors.length === 0) {
        setTimeout(() => navigate(path('/items')), 1500);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Bulk import failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Bulk Add Items</h1>
        <p className="text-sm text-muted">
          Register many items at once — per hall chairs, tables, equipment. Every item gets a unique serial for tracking.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('quantity')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${tab === 'quantity' ? 'bg-secondary text-white border-secondary' : 'border-border text-muted'}`}
        >
          <Layers size={16} /> Quick Add by Hall
        </button>
        <button
          type="button"
          onClick={() => setTab('csv')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${tab === 'csv' ? 'bg-secondary text-white border-secondary' : 'border-border text-muted'}`}
        >
          <Upload size={16} /> CSV Upload
        </button>
      </div>

      {tab === 'quantity' && (
        <div className="card">
          <div className={modalFormClass}>
            <p className="text-sm text-muted">
              Example: 30 chairs for Hall A Red → creates CHR-A-RED-001 … 030. Use this when many identical items go to one hall.
            </p>
            <ModalField label="Item Name *">
              <input className={modalInputClass} value={qtyForm.itemName} onChange={(e) => setQtyForm({ ...qtyForm, itemName: e.target.value })} placeholder="Wooden Chair" />
            </ModalField>
            <div className="grid sm:grid-cols-2 gap-3">
              <ModalField label="Category *">
                <select className={modalSelectClass} value={qtyForm.category} onChange={(e) => setQtyForm({ ...qtyForm, category: e.target.value })}>
                  {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </ModalField>
              <ModalField label="Hall / Location *">
                <select className={modalSelectClass} value={qtyForm.location} onChange={(e) => setQtyForm({ ...qtyForm, location: e.target.value })}>
                  {INVENTORY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </ModalField>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <ModalField label="Quantity * (max 200)">
                <input type="number" min={1} max={200} className={modalInputClass} value={qtyForm.quantity} onChange={(e) => setQtyForm({ ...qtyForm, quantity: e.target.value })} />
              </ModalField>
              <ModalField label="Serial Prefix">
                <input className={modalInputClass} value={qtyForm.serialPrefix} onChange={(e) => setQtyForm({ ...qtyForm, serialPrefix: e.target.value })} placeholder={autoPrefix} />
                <p className="text-xs text-muted mt-1">Auto: {autoPrefix}-001</p>
              </ModalField>
            </div>
            <ModalField label="Supplier">
              <input className={modalInputClass} value={qtyForm.supplier} onChange={(e) => setQtyForm({ ...qtyForm, supplier: e.target.value })} />
            </ModalField>
            <button type="button" className="btn-secondary" onClick={buildQuantityPreview}>
              Preview {qtyForm.quantity || '0'} items
            </button>
          </div>
        </div>
      )}

      {tab === 'csv' && (
        <div className="card space-y-4">
          <p className="text-sm text-muted">
            Download the template, fill in Excel, then upload. Required: itemName, serialNumber, location.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={downloadTemplate}>
              <Download size={16} /> Download Template
            </button>
            <label className="btn-primary flex items-center gap-2 cursor-pointer">
              <Upload size={16} /> Choose CSV File
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="card border-l-4 border-l-danger">
          {parseErrors.map((e) => <p key={e} className="text-danger text-sm">{e}</p>)}
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Preview: {validRows.length} ready · {invalidRows.length} with errors
            </p>
            <button type="button" className="btn-primary !text-sm" disabled={submitting || validRows.length === 0} onClick={() => void handleImport()}>
              {submitting ? 'Importing…' : `Import ${validRows.length} items`}
            </button>
          </div>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-gray-100 text-left border-b border-border">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.slice(0, 50).map((r) => (
                <tr key={r.rowNumber} className={`border-b border-surface-alt ${r.errors.length ? 'bg-danger/5' : ''}`}>
                  <td className="px-3 py-2">{r.rowNumber}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.serialNumber}</td>
                  <td className="px-3 py-2">{r.itemName}</td>
                  <td className="px-3 py-2">{r.location}</td>
                  <td className="px-3 py-2 text-xs">{r.errors.length ? r.errors.join('; ') : 'OK'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {previewRows.length > 50 && <p className="px-4 py-2 text-xs text-muted">Showing first 50 of {previewRows.length} rows.</p>}
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      {result && (
        <div className={`card ${result.errors.length ? 'border-l-4 border-l-warning' : 'border-l-4 border-l-success'}`}>
          <p className="text-sm font-semibold">{result.created} item(s) added successfully.</p>
          {result.errors.length > 0 && (
            <ul className="text-sm text-danger mt-2 space-y-1">
              {result.errors.map((e) => <li key={e.serialNumber}>{e.serialNumber}: {e.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
