import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { dashboardPathForRole, roleCanAccessDashboard } from '../utils/authUtils';
import {
  dashboardRoleFromPath,
  resolveStaffLink,
  type DashboardRole,
} from '../utils/staffRoutes';

interface Props {
  dashboard?: DashboardRole;
}

function redirectTarget(role: import('../types').UserRole, pathname: string): string {
  const home = dashboardPathForRole(role);
  const fromDashboard = dashboardRoleFromPath(pathname);
  if (role === 'inventory_staff') return home;
  if (!fromDashboard || fromDashboard === 'office') {
    return resolveStaffLink(pathname, role === 'super_admin' ? 'admin' : 'manager');
  }
  return home;
}

export default function ProtectedRoute({ dashboard }: Props) {
  const { isAuthenticated, currentUser } = useApp();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (dashboard && !roleCanAccessDashboard(currentUser.role, dashboard)) {
    return <Navigate to={redirectTarget(currentUser.role, location.pathname)} replace />;
  }

  return <Outlet />;
}
