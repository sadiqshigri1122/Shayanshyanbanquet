import { useApp } from '../../context/AppContext';

export default function Approvals() {
  const { approvals, approveRequest, currentUser } = useApp();
  const pending = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-primary">Approval Queue</h1>
      <p className="text-sm text-muted">{pending.length} pending approval(s)</p>

      <div className="space-y-4">
        {pending.map((a) => (
          <div key={a.id} className="card">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-bold text-primary capitalize">{a.requestType.replace('_', ' ')} Approval</p>
                <p className="text-sm text-gray-600">{a.details}</p>
                <p className="text-xs text-gray-400 mt-1">Requested by {a.requestedBy} · {new Date(a.createdAt).toLocaleString()}</p>
              </div>
              <span className="bg-warning/15 text-warning text-xs font-semibold px-2 py-0.5 rounded-full self-start shrink-0">Pending</span>
            </div>
            <p className="text-sm text-muted mb-4">{a.reason}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => approveRequest(a.id, true, 'Approved by manager', currentUser.name)} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/90">Approve</button>
              <button onClick={() => approveRequest(a.id, false, 'Rejected by manager', currentUser.name)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200">Reject</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">All caught up!</p>
            <p className="text-sm">No pending approvals</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold text-primary text-sm mb-4">Approval History</h2>
        <div className="space-y-2">
          {approvals.filter((a) => a.status !== 'pending').map((a) => (
            <div key={a.id} className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm py-2 border-b border-gray-50">
              <span className="min-w-0">{a.details} — {a.requestType}</span>
              <span className={`shrink-0 ${a.status === 'approved' ? 'text-success font-semibold' : 'text-danger font-semibold'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
