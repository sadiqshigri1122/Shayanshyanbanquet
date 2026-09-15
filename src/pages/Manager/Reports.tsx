import { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/bookingUtils';
import {
  buildReportPeriod,
  generateBanquetReport,
  type ReportPeriodType,
} from '../../utils/reportEngine';
import BanquetReportDocument from '../../components/BanquetReportDocument';
import { downloadReportCsv } from '../../utils/reportCsvExport';
import { printDocument } from '../../utils/printDocument';

const PERIOD_OPTIONS: { value: ReportPeriodType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual / Yearly' },
  { value: 'custom', label: 'Custom Date Range' },
];

export default function Reports() {
  const { bookings, payments, expenses, eventExpenses, settings } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const [periodType, setPeriodType] = useState<ReportPeriodType>('daily');
  const [anchorDate, setAnchorDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [showPreview, setShowPreview] = useState(true);

  const period = useMemo(
    () => buildReportPeriod(periodType, anchorDate, customEndDate),
    [periodType, anchorDate, customEndDate],
  );

  const reportData = useMemo(
    () =>
      generateBanquetReport(
        { bookings, payments, expenses, eventExpenses },
        period,
      ),
    [bookings, payments, expenses, eventExpenses, period],
  );

  const handlePrint = () => {
    setShowPreview(true);
    requestAnimationFrame(() => printDocument('banquet-report'));
  };

  const handleDownload = () => {
    downloadReportCsv(reportData, settings.companyName);
  };

  const fs = reportData.financialSummary;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-primary">Business Reports</h1>
          <p className="text-sm text-muted mt-0.5">
            Daily report in the same layout as the paper Excel template — preview, print, or download CSV
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <FileText size={15} />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90"
          >
            <Download size={15} /> Download CSV
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="card !py-4 space-y-4 no-print">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriodType(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                periodType === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">
              {periodType === 'custom' ? 'Start Date' : periodType === 'annual' ? 'Year' : 'Date'}
            </label>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {periodType === 'custom' && (
            <div>
              <label className="block text-xs text-muted mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                min={anchorDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="text-sm">
            <span className="text-muted">Report period: </span>
            <strong className="text-primary">{period.label}</strong>
            <span className="text-muted text-xs ml-2">
              ({period.startDate} to {period.endDate})
            </span>
          </div>

          <button
            onClick={() => {
              setAnchorDate(today);
              if (periodType === 'custom') setCustomEndDate(today);
            }}
            className="text-xs text-secondary font-semibold hover:underline"
          >
            Use today
          </button>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {[
          { label: 'Events in Period', value: String(fs.eventCount), hint: `${fs.bookingsEnteredCount} new booking(s) entered` },
          { label: 'Total Billed', value: formatCurrency(fs.totalBilled), hint: `Outstanding: ${formatCurrency(fs.totalOutstandingOnEvents)}` },
          { label: 'Cash Received', value: formatCurrency(fs.cashReceivedInPeriod), hint: 'All payments in this period' },
          { label: 'Total Expenses', value: formatCurrency(fs.totalExpenses), hint: `Event: ${formatCurrency(fs.totalEventExpenses)} · Office: ${formatCurrency(fs.totalOfficeExpenses)}` },
          { label: 'Event Gross Profit', value: formatCurrency(fs.totalEventGrossProfit), hint: 'Billed − event costs' },
          { label: 'Net Business Profit', value: formatCurrency(fs.netBusinessProfit), hint: 'Event profit − office costs' },
          { label: 'Net Cash Movement', value: formatCurrency(fs.netCashMovement), hint: 'Received − all expenses' },
          { label: 'Closing Balance', value: formatCurrency(fs.closingBalance), hint: 'Previous balance + net cash' },
        ].map((item) => (
          <div key={item.label} className="card !py-4">
            <p className="text-xs text-muted">{item.label}</p>
            <p className="text-xl font-bold text-primary mt-1">{item.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{item.hint}</p>
          </div>
        ))}
      </div>

      {/* Report preview / print area */}
      {showPreview && (
        <div className="card !p-0 overflow-hidden print:border-0 print:shadow-none">
          <div className="p-4 border-b border-border bg-gray-50 no-print">
            <h2 className="font-bold text-primary text-sm">Report Preview</h2>
            <p className="text-xs text-muted mt-0.5">
              This preview matches the downloaded/printed PDF layout
            </p>
          </div>
          <div className="p-4 lg:p-8 bg-gray-100 print:bg-white print:p-0">
            <BanquetReportDocument data={reportData} />
          </div>
        </div>
      )}

      {/* Hidden print-only duplicate when preview is hidden */}
      {!showPreview && (
        <div className="hidden print:block print:p-8">
          <BanquetReportDocument data={reportData} />
        </div>
      )}
    </div>
  );
}
