import type { Booking, BookingService } from '../types';
import { printDocument } from '../utils/printDocument';
import { useApp } from '../context/AppContext';

/** Standard line items pre-printed on the physical booking slip */
const STANDARD_SLIP_ITEMS = [
  'Booking Charges',
  'Sound System',
  'Entry',
  'Coldrink',
  'Mineral Water',
];

interface PrintBookingSlipProps {
  booking: Booking;
  onClose?: () => void;
}

function formatAmount(amount: number): string {
  if (amount <= 0) return '';
  return amount.toLocaleString('en-PK');
}

function matchServiceToSlipRow(serviceName: string, slipLabel: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const s = norm(serviceName);
  const l = norm(slipLabel);
  if (l === 'coldrink') return s.includes('cold');
  return s.includes(l.replace('charges', '')) || l.includes(s);
}

function getSlipRowData(booking: Booking, label: string): { guests: string; amount: number } {
  const service = booking.services.find((s) => matchServiceToSlipRow(s.serviceName, label));
  if (!service) return { guests: '', amount: 0 };

  return {
    guests: service.guestCount != null ? String(service.guestCount) : '',
    amount: service.total,
  };
}

function getExtraServices(booking: Booking): BookingService[] {
  return booking.services.filter(
    (s) => !STANDARD_SLIP_ITEMS.some((label) => matchServiceToSlipRow(s.serviceName, label)),
  );
}

function FieldRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${wide ? 'col-span-2' : ''}`}>
      <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap shrink-0">{label}</span>
      <span className="flex-1 border-b border-gray-700 border-dotted text-[12px] font-medium text-gray-900 pb-0.5 min-h-[18px]">
        {value}
      </span>
    </div>
  );
}

export default function PrintBookingSlip({ booking, onClose }: PrintBookingSlipProps) {
  const { settings } = useApp();
  const extraServices = getExtraServices(booking);
  const blankRows = Math.max(0, 3 - extraServices.length);

  const handlePrint = () => printDocument();

  return (
    <div>
      <div className="no-print flex gap-2 mb-4">
        <button onClick={handlePrint} className="px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-gold-dark">
          Print / Save PDF
        </button>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
            Close
          </button>
        )}
      </div>

      {/* Matches physical pink duplicate-book slip */}
      <div
        id="print-area"
        className="relative mx-auto max-w-[210mm] bg-[#f8d7da] text-gray-900 p-6 print:p-4 print:shadow-none shadow-md border border-pink-200 print:border-0"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        {/* Watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-28 w-28 items-center justify-center rounded-full border-4 border-gray-800">
              <span className="text-5xl font-bold tracking-tight">SB</span>
            </div>
            <p className="text-sm font-bold tracking-wider">SHAYAN BANQUET / LAWN</p>
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
          <div className="shrink-0 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-800 bg-white/40">
              <span className="text-xl font-bold">SB</span>
            </div>
            <p className="mt-1 text-[8px] font-bold leading-tight tracking-wide">SHAYAN<br />BANQUET / LAWN</p>
          </div>

          <div className="flex-1 text-center pt-1">
            <h1 className="text-xl font-bold tracking-wide uppercase">{settings.companyName}</h1>
            <p className="mt-1 text-[10px] leading-snug">{settings.companyAddress}</p>
            <div className="mt-2 inline-block rounded-full bg-gray-900 px-5 py-1">
              <span className="text-[11px] font-bold tracking-[0.25em] text-white">BOOKING SLIP</span>
            </div>
          </div>

          <div className="shrink-0 pt-2 text-right text-[10px] font-semibold">
            Contact: {settings.companyPhone}
          </div>
        </div>

        {/* Customer & event fields — two-column layout like paper slip */}
        <div className="relative z-10 mb-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <FieldRow label="Sr. No." value={String(booking.serialNumber)} />
          <FieldRow label="Booking Date" value={booking.bookingDate} />
          <FieldRow label="Name" value={booking.customer.name} wide />
          <FieldRow label="Booked Lawn" value={booking.venueName} />
          <FieldRow label="Address" value={booking.customer.address} wide />
          <FieldRow label="Function Date" value={booking.functionDate} />
          <FieldRow label="Contact No." value={booking.customer.phone} />
          <FieldRow label="Function Day" value={booking.functionDay} />
          <div />
          <FieldRow label="Programme" value={booking.programme} />
        </div>

        {/* Charges table — NO. OF GUESTS | PARTICULARS | AMOUNT Rs. */}
        <div className="relative z-10 mb-3 overflow-hidden rounded-lg border-2 border-gray-800 bg-white/30">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-gray-800 bg-white/50">
                <th className="w-[22%] border-r border-gray-800 px-2 py-1.5 text-center font-bold uppercase">No. of Guests</th>
                <th className="w-[48%] border-r border-gray-800 px-2 py-1.5 text-center font-bold uppercase">Particulars</th>
                <th className="w-[30%] px-2 py-1.5 text-center font-bold uppercase">Amount Rs.</th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_SLIP_ITEMS.map((label) => {
                const row = getSlipRowData(booking, label);
                return (
                  <tr key={label} className="border-b border-gray-600">
                    <td className="border-r border-gray-600 px-2 py-2 text-center">{row.guests}</td>
                    <td className="border-r border-gray-600 px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatAmount(row.amount)}</td>
                  </tr>
                );
              })}

              {extraServices.map((s) => (
                <tr key={s.serviceId + s.serviceName} className="border-b border-gray-600">
                  <td className="border-r border-gray-600 px-2 py-2 text-center">
                    {s.serviceName.toLowerCase().includes('person') || s.quantity > 1 ? s.quantity : ''}
                  </td>
                  <td className="border-r border-gray-600 px-3 py-2">{s.serviceName}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatAmount(s.total)}</td>
                </tr>
              ))}

              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`} className="border-b border-gray-600">
                  <td className="border-r border-gray-600 px-2 py-3">&nbsp;</td>
                  <td className="border-r border-gray-600 px-3 py-3">&nbsp;</td>
                  <td className="px-3 py-3">&nbsp;</td>
                </tr>
              ))}

              {/* TOTAL / ADVANCE / BALANCE — right column like paper slip */}
              <tr className="border-b border-gray-800">
                <td colSpan={2} className="border-r border-gray-800 px-3 py-1.5 text-right font-bold">TOTAL</td>
                <td className="px-3 py-1.5 text-right font-bold">{formatAmount(booking.grandTotal)}</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td colSpan={2} className="border-r border-gray-800 px-3 py-1.5 text-right font-bold">ADVANCE</td>
                <td className="px-3 py-1.5 text-right font-bold">{formatAmount(booking.advancePaid)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="border-r border-gray-800 px-3 py-1.5 text-right font-bold">BALANCE</td>
                <td className="px-3 py-1.5 text-right font-bold">{formatAmount(booking.remainingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="relative z-10 mb-4 grid grid-cols-2 gap-8 px-2 text-[11px]">
          <div>
            <p className="font-semibold">Party Signature</p>
            <div className="mt-8 border-b border-gray-800" />
          </div>
          <div>
            <p className="font-semibold">For Shayan Banquet / Lawn</p>
            <div className="mt-8 border-b border-gray-800" />
            <p className="mt-1 text-[10px] text-gray-700">{booking.createdBy}</p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="relative z-10 border-t border-gray-700 pt-2 text-[9px] leading-relaxed text-gray-800">
          <p className="mb-1 font-bold text-[10px]">Terms & Conditions</p>
          {settings.termsAndConditions.split('\n').map((line, i) => (
            <p key={i} className="mb-0.5">{line}</p>
          ))}
        </div>

        {/* System reference — screen only subtle */}
        <p className="relative z-10 mt-2 text-center text-[8px] text-gray-600 print:text-gray-500">
          Ref: {booking.bookingNumber}
          {booking.discount > 0 && ` · Discount: Rs. ${formatAmount(booking.discount)}`}
        </p>
      </div>
    </div>
  );
}
