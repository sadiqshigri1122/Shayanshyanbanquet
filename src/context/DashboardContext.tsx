import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApp } from './AppContext';
import {
  dashboardPrefix,
  hasCapability,
  staffPath,
  type DashboardRole,
  type StaffCapability,
} from '../utils/staffRoutes';

interface DashboardContextValue {
  dashboard: DashboardRole;
  basePath: string;
  path: (segment: string) => string;
  can: (capability: StaffCapability) => boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  dashboard,
  children,
}: {
  dashboard: DashboardRole;
  children: ReactNode;
}) {
  const { currentUser } = useApp();

  const value = useMemo<DashboardContextValue>(
    () => ({
      dashboard,
      basePath: dashboardPrefix(dashboard),
      path: (segment: string) => staffPath(dashboard, segment),
      can: (capability: StaffCapability) => hasCapability(currentUser.role, capability),
    }),
    [dashboard, currentUser.role],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return ctx;
}
