import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { KeyRound, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from '../../components/Modal';
import type { User, UserRole } from '../../types';

const roleLabels: Record<UserRole, string> = {
  booking_office: 'Booking Office',
  inventory_staff: 'Inventory Staff',
  manager: 'Manager',
  super_admin: 'Super Admin',
};

type ModalMode = 'create' | 'edit' | 'password' | 'delete' | null;

interface UserForm {
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  password: string;
  confirmPassword: string;
  isActive: boolean;
}

const emptyForm = (): UserForm => ({
  name: '',
  email: '',
  role: 'booking_office',
  phone: '',
  password: '',
  confirmPassword: '',
  isActive: true,
});

export default function AdminUsers() {
  const { users, currentUser, createUser, updateUser, deleteUser, resetUserPassword } = useApp();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const closeModal = () => {
    setModalMode(null);
    setSelectedUserId(null);
    setForm(emptyForm());
    setError('');
    setSuccess('');
  };

  const openCreate = () => {
    setForm(emptyForm());
    setError('');
    setSuccess('');
    setModalMode('create');
  };

  const openEdit = (user: User) => {
    setSelectedUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? '',
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    });
    setError('');
    setSuccess('');
    setModalMode('edit');
  };

  const openPassword = (user: User) => {
    setSelectedUserId(user.id);
    setForm({ ...emptyForm(), password: '', confirmPassword: '' });
    setError('');
    setSuccess('');
    setModalMode('password');
  };

  const openDelete = (user: User) => {
    setSelectedUserId(user.id);
    setError('');
    setSuccess('');
    setModalMode('delete');
  };

  const handleCreate = async () => {
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await createUser({
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone || undefined,
      password: form.password,
      isActive: form.isActive,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    closeModal();
  };

  const handleEdit = async () => {
    if (!selectedUserId) return;

    setSubmitting(true);
    const result = await updateUser(selectedUserId, {
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone || null,
      isActive: form.isActive,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    closeModal();
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await resetUserPassword(selectedUserId, form.password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(`Password updated for ${selectedUser?.name ?? 'user'}. They will need to sign in again.`);
    setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
  };

  const handleDelete = async () => {
    if (!selectedUserId) return;

    setSubmitting(true);
    const result = await deleteUser(selectedUserId);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    closeModal();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">User Management</h1>
          <p className="text-sm text-muted mt-1">Add, edit, deactivate, or remove staff accounts.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2 !py-2.5">
          <Plus size={16} />
          Add user
        </button>
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
              <tr key={u.id} className={!u.isActive ? 'opacity-60' : undefined}>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openPassword(u)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      <KeyRound size={13} />
                      Password
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => openDelete(u)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:opacity-80"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode === 'create' && (
        <Modal title="Add staff user" onClose={closeModal}>
          <UserFormFields form={form} setForm={setForm} showPassword includeActive error={error} />
          <ModalActions
            onCancel={closeModal}
            onSubmit={() => void handleCreate()}
            submitLabel="Create user"
            submitting={submitting}
          />
        </Modal>
      )}

      {modalMode === 'edit' && selectedUser && (
        <Modal title={`Edit user — ${selectedUser.name}`} onClose={closeModal}>
          <UserFormFields form={form} setForm={setForm} error={error} includeActive disableSelfDeactivate={selectedUser.id === currentUser.id} />
          <ModalActions
            onCancel={closeModal}
            onSubmit={() => void handleEdit()}
            submitLabel="Save changes"
            submitting={submitting}
          />
        </Modal>
      )}

      {modalMode === 'password' && selectedUser && (
        <Modal title={`Reset password — ${selectedUser.name}`} onClose={closeModal}>
          <p className="text-sm text-muted mb-4">
            Set a new password for <span className="font-medium text-text-primary">{selectedUser.email}</span>.
          </p>
          {error && <Alert tone="danger">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
          <div className="space-y-4">
            <PasswordFields form={form} setForm={setForm} />
          </div>
          <ModalActions
            onCancel={closeModal}
            onSubmit={() => void handleResetPassword()}
            submitLabel={success ? 'Close' : 'Update password'}
            submitting={submitting}
            hideSubmit={!!success}
          />
        </Modal>
      )}

      {modalMode === 'delete' && selectedUser && (
        <Modal title={`Delete user — ${selectedUser.name}`} onClose={closeModal}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger-light px-4 py-3">
              <UserCog size={18} className="text-danger mt-0.5 shrink-0" />
              <p className="text-sm text-danger">
                This will permanently remove <strong>{selectedUser.email}</strong> from the system. This action cannot be undone.
              </p>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
          </div>
          <ModalActions
            onCancel={closeModal}
            onSubmit={() => void handleDelete()}
            submitLabel="Delete user"
            submitting={submitting}
            danger
          />
        </Modal>
      )}
    </div>
  );
}

function Alert({ tone, children }: { tone: 'danger' | 'success'; children: ReactNode }) {
  const cls =
    tone === 'danger'
      ? 'border-danger/20 bg-danger-light text-danger'
      : 'border-success/20 bg-success-light text-success';
  return <div className={`rounded-lg border px-4 py-3 text-sm mb-4 ${cls}`}>{children}</div>;
}

function UserFormFields({
  form,
  setForm,
  showPassword = false,
  error,
  includeActive = false,
  disableSelfDeactivate = false,
}: {
  form: UserForm;
  setForm: Dispatch<SetStateAction<UserForm>>;
  showPassword?: boolean;
  error?: string;
  includeActive?: boolean;
  disableSelfDeactivate?: boolean;
}) {
  return (
    <div className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}

      <Field label="Full name">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" required />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full"
          required
        />
      </Field>

      <Field label="Role">
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          className="w-full"
        >
          <option value="booking_office">Booking Office</option>
          <option value="inventory_staff">Inventory Staff</option>
          <option value="manager">Manager</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </Field>

      <Field label="Phone">
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" placeholder="Optional" />
      </Field>

      {showPassword && <PasswordFields form={form} setForm={setForm} />}

      {includeActive && (
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            disabled={disableSelfDeactivate}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-border"
          />
          Account is active
          {disableSelfDeactivate && <span className="text-xs">(you cannot deactivate yourself)</span>}
        </label>
      )}
    </div>
  );
}

function PasswordFields({ form, setForm }: { form: UserForm; setForm: React.Dispatch<React.SetStateAction<UserForm>> }) {
  return (
    <>
      <Field label="Password">
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full"
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
        />
      </Field>
      <Field label="Confirm password">
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          className="w-full"
          autoComplete="new-password"
        />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-text-primary mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  submitting,
  danger = false,
  hideSubmit = false,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
  danger?: boolean;
  hideSubmit?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 pt-6">
      <button type="button" onClick={onCancel} className="btn-secondary !px-4 !py-2">
        Cancel
      </button>
      {!hideSubmit && (
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className={`${danger ? 'bg-danger hover:opacity-90 text-white' : 'btn-primary'} !px-4 !py-2 rounded-lg font-semibold disabled:opacity-60`}
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      )}
    </div>
  );
}
