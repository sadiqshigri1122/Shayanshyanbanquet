import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from '../../components/Modal';

const roleLabels: Record<string, string> = {
  booking_office: 'Booking Office',
  manager: 'Manager',
  super_admin: 'Super Admin',
};

export default function AdminUsers() {
  const { users, resetUserPassword } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const closeModal = () => {
    setSelectedUserId(null);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await resetUserPassword(selectedUserId, newPassword);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(`Password updated for ${selectedUser?.name ?? 'user'}. They will need to sign in again.`);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">User Management</h1>
        <p className="text-sm text-muted mt-1">Each staff account has its own password. Reset passwords here when needed.</p>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['Name', 'Email', 'Role', 'Phone', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-primary">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="bg-secondary-light text-secondary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{u.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${u.isActive ? 'text-success' : 'text-danger'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{u.createdAt}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setError('');
                      setSuccess('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
                  >
                    <KeyRound size={14} />
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <Modal title={`Reset password — ${selectedUser.name}`} onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Set a new password for <span className="font-medium text-text-primary">{selectedUser.email}</span>.
              Their active sessions will be signed out.
            </p>

            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-success/20 bg-success-light px-4 py-3 text-sm text-success">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-text-primary mb-1.5">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-text-primary mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full"
                autoComplete="new-password"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="btn-secondary !px-4 !py-2">
                {success ? 'Close' : 'Cancel'}
              </button>
              {!success && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleResetPassword()}
                  className="btn-primary !px-4 !py-2 disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Update password'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
