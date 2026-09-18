import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/bookingUtils';
import { getErrorMessage } from '../../utils/errorMessage';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ModalField, { modalFormClass, modalInputClass, modalSelectClass } from '../../components/ModalField';
import type { PaymentMethod } from '../../types';

const EXPENSE_CATEGORIES = [
  'Electricity',
  'Generator',
  'Staff Salary',
  'Cleaning',
  'Maintenance',
  'Marketing',
  'Other',
] as const;

const emptyForm = () => ({
  category: 'Maintenance' as (typeof EXPENSE_CATEGORIES)[number],
  amount: '',
  description: '',
  method: 'cash' as PaymentMethod,
});

export default function Expenses() {
  const { expenses, addExpense, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeForm = () => {
    if (submitting) return;
    setShowForm(false);
    setForm(emptyForm());
    setError('');
  };

  const handleAdd = async () => {
    setError('');
    const amount = Number(form.amount);
    if (!form.amount.trim() || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        category: form.category,
        amount,
        description: form.description.trim(),
        method: form.method,
        date: new Date().toISOString().split('T')[0],
        addedBy: currentUser.name,
      });
      closeForm();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save expense. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const total = expenses
    .filter((e) => e.approvalStatus === 'approved')
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="animate-fade-in space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary">Expenses</h1>
          <p className="text-sm text-muted">Total approved: {formatCurrency(total)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary !px-4 !py-2.5 !rounded-lg text-sm w-full sm:w-auto shrink-0"
        >
          + Add Expense
        </button>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-border">
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">Added By</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-surface-alt/50">
                <td className="px-4 py-3 whitespace-nowrap">{e.date}</td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{e.category}</td>
                <td className="px-4 py-3 text-gray-600">{e.description}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{e.addedBy}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={e.approvalStatus} type="approval" />
                </td>
                <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{formatCurrency(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-base font-medium">No expenses recorded yet</p>
            <p className="text-sm mt-1">Use Add Expense to log business costs.</p>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="Add Expense" onClose={closeForm}>
          <div className={modalFormClass}>
            <ModalField label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
                className={modalSelectClass}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </ModalField>

            <ModalField label="Amount (Rs.)">
              <input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={modalInputClass}
              />
            </ModalField>

            <ModalField label="Payment Method">
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                className={modalSelectClass}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="other">Other</option>
              </select>
            </ModalField>

            <ModalField label="Description">
              <input
                placeholder="What was this expense for?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={modalInputClass}
              />
            </ModalField>

            {error && (
              <p className="text-sm text-danger bg-danger-light border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <p className="text-xs text-muted">
              Expenses above Rs. 50,000 require approval before they count toward the approved total.
            </p>

            <button
              onClick={handleAdd}
              disabled={submitting}
              className="btn-primary w-full !py-2.5 !rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={submitting}
              className="w-full py-2 text-muted text-sm hover:text-gray-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
