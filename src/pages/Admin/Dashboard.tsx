import { Link } from 'react-router-dom';
import { Users, Settings, Shield, BarChart3 } from 'lucide-react';
import { useApp, computeKPIs } from '../../context/AppContext';

export default function AdminDashboard() {
  const { users, auditLogs, bookings, payments, expenses } = useApp();
  const kpis = computeKPIs(bookings, payments, expenses);

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-primary">Super Admin Dashboard</h1>
      <p className="text-sm text-muted">System control & configuration</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Users', value: users.filter((u) => u.isActive).length, icon: Users, path: '/admin/users' },
          { label: 'Total Bookings', value: kpis.totalBookings, icon: BarChart3, path: '/admin/reports' },
          { label: 'Audit Logs', value: auditLogs.length, icon: Shield, path: '/admin/audit' },
          { label: 'Settings', value: 'Configure', icon: Settings, path: '/admin/settings' },
        ].map(({ label, value, icon: Icon, path }) => (
          <Link key={label} to={path} className="card hover:shadow-premium transition-all group">
            <Icon size={22} className="text-secondary mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-muted">{label}</p>
            <p className="text-2xl font-bold text-primary">{value}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="font-bold text-primary text-sm mb-4">Recent Audit Activity</h2>
        <div className="space-y-2">
          {auditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex justify-between text-sm py-2 border-b border-gray-50">
              <div>
                <span className="font-medium text-primary">{log.action}</span> — {log.entity} {log.entityId}
                <p className="text-xs text-muted">{log.details}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
