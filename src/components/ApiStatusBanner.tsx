import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const dashboardPrefixes = ['/office', '/inventory', '/manager', '/admin'];

export default function ApiStatusBanner() {
  const { apiMode, apiLoading, apiError, actionError, clearActionError } = useApp();
  const { pathname } = useLocation();

  const isDashboardRoute = dashboardPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!apiMode || !isDashboardRoute) return null;

  if (apiLoading) {
    return (
      <div className="no-print bg-info/10 border-b border-info/20 text-info text-sm px-4 py-2 text-center flex items-center justify-center gap-2">
        <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-info/30 border-t-info animate-spin" />
        Syncing latest data…
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="no-print bg-danger/10 border-b border-danger/20 text-danger text-sm px-4 py-2 text-center">
        Could not connect to API: {apiError}. Start the backend with{' '}
        <code className="font-mono text-xs">cd server; npm run dev</code>
      </div>
    );
  }

  if (actionError) {
    return (
      <div className="no-print bg-danger/10 border-b border-danger/20 text-danger text-sm px-4 py-2 flex items-center justify-center gap-3">
        <span>{actionError}</span>
        <button
          type="button"
          onClick={clearActionError}
          className="p-1 rounded hover:bg-danger/10"
          aria-label="Dismiss error"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
