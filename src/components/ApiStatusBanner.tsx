import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const dashboardPrefixes = ['/office', '/manager', '/admin'];

export default function ApiStatusBanner() {
  const { apiMode, apiLoading, apiError } = useApp();
  const { pathname } = useLocation();

  const isDashboardRoute = dashboardPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!apiMode || !isDashboardRoute) return null;

  if (apiLoading) {
    return (
      <div className="no-print bg-info/10 border-b border-info/20 text-info text-sm px-4 py-2 text-center">
        Loading data from server…
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

  return null;
}
