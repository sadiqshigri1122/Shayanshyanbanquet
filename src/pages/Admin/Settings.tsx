import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AdminSettings() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">System Settings</h1>

      <div className="card !p-6 space-y-4">
        <h2 className="font-bold text-primary text-sm">Company Information</h2>
        {(['companyName', 'companyPhone', 'companyEmail', 'companyAddress'] as const).map((field) => (
          <div key={field}>
            <label className="block text-xs text-muted mb-1 capitalize">{field.replace('company', '').replace(/([A-Z])/g, ' $1')}</label>
            <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        ))}

        <h2 className="font-bold text-primary text-sm pt-4">Policies</h2>
        <div>
          <label className="block text-xs text-muted mb-1">Discount Approval Threshold (%)</label>
          <input type="number" value={form.discountApprovalThresholdPercent} onChange={(e) => setForm({ ...form, discountApprovalThresholdPercent: +e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Terms & Conditions</label>
          <textarea value={form.termsAndConditions} onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })} rows={8} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <button onClick={handleSave} className="btn-primary !px-6 !py-2.5 !rounded-lg">
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
