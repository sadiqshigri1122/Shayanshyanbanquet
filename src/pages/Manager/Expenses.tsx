import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/bookingUtils';
import StatusBadge from '../../components/StatusBadge';

export default function Expenses() {
  const { expenses, addExpense, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'Maintenance', amount: 0, description: '', method: 'cash' as const });

  const handleAdd = async () => {
    if (form.amount <= 0 || !form.description) return;
    await addExpense({ ...form, date: new Date().toISOString().split('T')[0], addedBy: currentUser.name });
    setShowForm(false);
    setForm({ category: 'Maintenance', amount: 0, description: '', method: 'cash' });
  };

  const total = expenses.filter((e) => e.approvalStatus === 'approved').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Expenses</h1>
          <p className="text-sm text-muted">Total approved: {formatCurrency(total)}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !px-4 !py-2.5 !rounded-lg text-sm w-full sm:w-auto">+ Add Expense</button>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 text-xs font-semibold text-muted">Date</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted">Category</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted">Description</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted">Added By</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted text-right">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3">{e.date}</td>
                <td className="px-4 py-3 font-medium">{e.category}</td>
                <td className="px-4 py-3 text-gray-600">{e.description}</td>
                <td className="px-4 py-3 text-muted">{e.addedBy}</td>
                <td className="px-4 py-3"><StatusBadge status={e.approvalStatus} type="approval" /></td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <h2 className="font-bold text-primary">Add Expense</h2>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              {['Electricity', 'Generator', 'Staff Salary', 'Cleaning', 'Maintenance', 'Marketing', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Amount" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleAdd} className="btn-primary w-full !py-2.5 !rounded-lg">Submit</button>
            <button onClick={() => setShowForm(false)} className="w-full py-2 text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
