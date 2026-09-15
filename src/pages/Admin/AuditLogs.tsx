import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AuditLogs() {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');

  const filtered = auditLogs.filter(
    (log) =>
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-primary">Audit Logs</h1>
      <p className="text-sm text-muted">Immutable activity trail — all sensitive changes are logged</p>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            {['Timestamp', 'Action', 'Entity', 'Performed By', 'Details'].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-muted">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3"><span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">{log.action}</span></td>
                <td className="px-4 py-3">{log.entity} <span className="text-gray-400">{log.entityId}</span></td>
                <td className="px-4 py-3 font-medium">{log.performedBy}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
