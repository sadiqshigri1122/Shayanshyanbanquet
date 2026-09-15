import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, CreditCard, Building2,
  ChevronLeft, ChevronRight, Bell, Search, Settings, Menu,
  ClipboardList, PlusCircle, CalendarCheck,
  CheckCircle2, BarChart3, Shield, DollarSign, LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DashboardProvider } from '../context/DashboardContext';
import { resolveStaffLink, staffPath, type DashboardRole } from '../utils/staffRoutes';
import HeaderSearch from './HeaderSearch';

const navByRole: Record<DashboardRole, { label: string; icon: typeof LayoutDashboard; path: string }[]> = {
  office: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/office' },
    { label: 'New Booking', icon: PlusCircle, path: '/office/new-booking' },
    { label: 'All Bookings', icon: ClipboardList, path: '/office/bookings' },
    { label: 'Event Day', icon: CalendarCheck, path: '/office/event-day' },
    { label: 'Calendar', icon: CalendarDays, path: '/office/calendar' },
    { label: 'Payments & Receipts', icon: CreditCard, path: '/office/payments' },
    { label: 'Customers', icon: Users, path: '/office/customers' },
  ],
  manager: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/manager' },
    { label: 'Approvals', icon: CheckCircle2, path: '/manager/approvals' },
    { label: 'Expenses', icon: DollarSign, path: '/manager/expenses' },
    { label: 'Reports', icon: BarChart3, path: '/manager/reports' },
    { label: 'All Bookings', icon: ClipboardList, path: '/manager/bookings' },
    { label: 'Calendar', icon: CalendarDays, path: '/manager/calendar' },
    { label: 'Customers', icon: Users, path: '/manager/customers' },
    { label: 'Payments', icon: CreditCard, path: '/manager/payments' },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
    { label: 'Audit Logs', icon: Shield, path: '/admin/audit' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ],
};

const roleTitles: Record<DashboardRole, string> = {
  office: 'Booking Office',
  manager: 'Manager',
  admin: 'Super Admin',
};

interface Props {
  role: DashboardRole;
}

export default function DashboardLayout({ role }: Props) {
  const { notifications, currentUser, users, setCurrentUser, markAllNotificationsRead, markNotificationRead, logout } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const sidebarLinks = navByRole[role];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="dashboard-shell min-h-screen flex bg-surface-alt">
      {mobileOpen && (
        <div className="no-print fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`
          app-chrome no-print
          fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col
          bg-primary text-white transition-all duration-300 shadow-md
          ${collapsed ? 'w-[68px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center h-16 px-4 border-b border-white/15">
          <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <h1 className="text-sm font-bold tracking-wide text-white">SHAYAN</h1>
              <p className="text-[10px] text-secondary-light font-semibold tracking-wider">{roleTitles[role].toUpperCase()}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              location.pathname === link.path ||
              (link.path.endsWith('/event-day') && location.pathname.startsWith(`${link.path}`)) ||
              (link.path.endsWith('/payments') && location.pathname.startsWith(link.path)) ||
              (link.path.endsWith('/bookings') && location.pathname.startsWith(`${link.path}/`));
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center mx-2 my-0.5 px-3 py-2.5 rounded text-sm font-medium
                  transition-all duration-200 relative
                  ${isActive
                    ? 'bg-white/15 text-white border-l-[3px] border-secondary'
                    : 'text-white/75 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent'
                  }
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="ml-3">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-4 py-3 border-t border-white/15 text-[10px] text-white/60">
            <p>Signed in as {roleTitles[role]}. Sign out to switch roles.</p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-white/15 text-white/60 hover:text-white hover:bg-white/5"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="app-chrome no-print sticky top-0 z-30 h-14 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded hover:bg-surface-alt text-muted">
              <Menu size={20} />
            </button>
            {role === 'office' && <HeaderSearch />}
            {role !== 'office' && (
              <div className="relative hidden sm:block">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <Link to={staffPath(role, '/bookings')} className="pl-9 pr-4 py-2 w-72 bg-surface-alt border border-border rounded text-sm text-text-tertiary block">
                  Search bookings...
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded hover:bg-surface-alt text-muted"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-border z-50 animate-fade-in">
                  <div className="p-3 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-text-primary">Notifications</h3>
                    <button onClick={markAllNotificationsRead} className="text-xs text-secondary font-semibold">Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted text-center">No notifications</p>
                    ) : (
                      notifications.slice(0, 8).map((n) => {
                        const content = (
                          <>
                            <p className="text-sm font-medium text-text-primary">{n.title}</p>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                          </>
                        );
                        const className = `block p-3 border-b border-surface-alt hover:bg-surface-alt ${!n.isRead ? 'bg-secondary-light/50' : ''}`;

                        if (n.link) {
                          return (
                            <Link
                              key={n.id}
                              to={resolveStaffLink(n.link, role)}
                              className={className}
                              onClick={() => {
                                if (!n.isRead) void markNotificationRead(n.id);
                                setShowNotifications(false);
                              }}
                            >
                              {content}
                            </Link>
                          );
                        }

                        return (
                          <div
                            key={n.id}
                            className={className}
                            onClick={() => {
                              if (!n.isRead) void markNotificationRead(n.id);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !n.isRead) void markNotificationRead(n.id);
                            }}
                          >
                            {content}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded hover:bg-surface-alt text-muted hidden md:flex items-center gap-1.5 text-xs font-medium"
              title="Sign out"
            >
              <LogOut size={16} />
              Sign out
            </button>

            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
              {users.filter((u) => u.isActive && u.role === currentUser.role).length > 1 && (
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const user = users.find((u) => u.id === e.target.value);
                    if (user) setCurrentUser(user);
                  }}
                  className="hidden lg:block text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-text-primary max-w-[140px]"
                  title="Switch staff member"
                >
                  {users.filter((u) => u.isActive && u.role === currentUser.role).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold">
                {currentUser.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-text-primary">{currentUser.name}</p>
                <p className="text-[10px] text-muted">{roleTitles[role]}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-main flex-1 p-4 lg:p-6 overflow-y-auto max-w-[1400px] w-full mx-auto print:p-0">
          <DashboardProvider dashboard={role}>
            <Outlet />
          </DashboardProvider>
        </main>
      </div>
    </div>
  );
}
