import { useApp } from '../../context/AppContext';

const roleLabels: Record<string, string> = {
  booking_office: 'Booking Office',
  manager: 'Manager',
  super_admin: 'Super Admin',
  visitor: 'Visitor',
};

export default function AdminUsers() {
  const { users } = useApp();

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-primary">User Management</h1>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            {['Name', 'Email', 'Role', 'Phone', 'Status', 'Joined'].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-muted">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-primary">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><span className="bg-secondary-light text-secondary text-xs font-semibold px-2 py-0.5 rounded-full">{roleLabels[u.role]}</span></td>
                <td className="px-4 py-3 text-muted">{u.phone || '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold ${u.isActive ? 'text-success' : 'text-danger'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
                <td className="px-4 py-3 text-gray-400">{u.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
