import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboard } from '../../context/DashboardContext';
import {
  buildQuantityInventoryTemplateCsv,
  parseQuantityInventoryCsv,
  type ParsedQuantityBulkRow,
} from '../../utils/inventoryUtils';
import { getErrorMessage } from '../../utils/errorMessage';

export default function BulkAddItems() {
  const { bulkAddInventoryStock } = useApp();
  const { path } = useDashboard();
  const navigate = useNavigate();
  const [previewRows, setPreviewRows] = useState<ParsedQuantityBulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { itemName: string; error: string }[] } | null>(null);
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + buildQuantityInventoryTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-quantity-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    const text = await file.text();
    const { rows, parseErrors: errs } = parseQuantityInventoryCsv(text);
    setPreviewRows(rows);
    setParseErrors(errs);
  };

  const validRows = previewRows.filter((r) => r.errors.length === 0);
  const invalidRows = previewRows.filter((r) => r.errors.length > 0);
  const totalQty = validRows.reduce((sum, r) => sum + r.quantity, 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      setError('No valid rows to import. Fix errors in the preview first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await bulkAddInventoryStock(
        validRows.map((r) => ({
          itemName: r.itemName,
          category: r.category,
          quantity: r.quantity,
          unit: r.unit,
          supplier: r.supplier,
          notes: r.notes,
          purchaseReference: r.purchaseReference,
        })),
      );
      setResult({
        created: res.created,
        errors: res.errors.map((e) => ({ itemName: e.itemName, error: e.error ?? 'Failed' })),
      });
      if (res.created > 0 && res.errors.length === 0) {
        setTimeout(() => navigate(path('/master')), 1500);
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
        <h1 className="text-2xl font-bold text-primary">Bulk Upload Inventory</h1>
        <p className="text-sm text-muted mt-1">
          Add many item types and quantities at once using a CSV file — ideal for initial setup or large stock receipts.
        </p>
        <Link to={path('/add-item')} className="text-sm text-secondary font-semibold mt-2 inline-block">
          ← Add single item instead
        </Link>
      </div>

      <div className="card space-y-4">
        <p className="text-sm text-muted">
          Required columns: <strong>itemName</strong>, <strong>quantity</strong>. Optional: category, unit, supplier, notes, purchaseReference.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary flex items-center gap-2" onClick={downloadTemplate}>
            <Download size={16} /> Download Template
          </button>
          <label className="btn-primary flex items-center gap-2 cursor-pointer">
            <Upload size={16} /> Choose CSV File
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {parseErrors.length > 0 && (
        <div className="card border-l-4 border-l-danger">
          {parseErrors.map((e) => (
            <p key={e} className="text-danger text-sm">{e}</p>
          ))}
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Preview: {validRows.length} row(s) · {totalQty} total units · {invalidRows.length} with errors
            </p>
            <button
              type="button"
              className="btn-primary !text-sm"
              disabled={submitting || validRows.length === 0}
              onClick={() => void handleImport()}
            >
              {submitting ? 'Importing…' : `Import ${validRows.length} item type(s)`}
            </button>
          </div>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-gray-100 text-left border-b border-border">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r) => (
                <tr key={r.rowNumber} className={`border-b border-surface-alt ${r.errors.length ? 'bg-danger/5' : ''}`}>
                  <td className="px-3 py-2">{r.rowNumber}</td>
                  <td className="px-3 py-2 font-medium">{r.itemName}</td>
                  <td className="px-3 py-2 text-muted">{r.category}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.quantity || '—'}</td>
                  <td className="px-3 py-2">{r.unit ?? 'unit'}</td>
                  <td className="px-3 py-2 text-xs">{r.errors.length ? r.errors.join('; ') : 'OK'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      {result && (
        <div className={`card ${result.errors.length ? 'border-l-4 border-l-warning' : 'border-l-4 border-l-success'}`}>
          <p className="text-sm font-semibold">{result.created} item type(s) added successfully.</p>
          {result.errors.length > 0 && (
            <ul className="text-sm text-danger mt-2 space-y-1">
              {result.errors.map((e) => (
                <li key={e.itemName}>{e.itemName}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
