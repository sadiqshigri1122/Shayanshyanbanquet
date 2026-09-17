import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { dashboardPathForRole } from '../utils/authUtils';

const DEMO_ACCOUNTS = [
  {
    label: 'Booking Office',
    shortLabel: 'Office',
    email: 'ahmed@shayanbanquet.pk',
    description: 'Create bookings, payments & receipts',
    icon: Briefcase,
    accent: 'border-secondary/30 bg-secondary-light/40 hover:bg-secondary-light',
  },
  {
    label: 'Manager',
    shortLabel: 'Manager',
    email: 'ali@shayanbanquet.pk',
    description: 'Approvals, expenses & reports',
    icon: UserCog,
    accent: 'border-primary/20 bg-primary/5 hover:bg-primary/10',
  },
  {
    label: 'Administrator',
    shortLabel: 'Admin',
    email: 'admin@shayanbanquet.pk',
    description: 'Users, settings & audit logs',
    icon: Shield,
    accent: 'border-border bg-white hover:bg-surface-alt',
  },
] as const;

const FEATURES = [
  { icon: CalendarDays, title: 'Live calendar', detail: 'Venue availability at a glance' },
  { icon: CreditCard, title: 'Payment tracking', detail: 'Advances, balances & receipts' },
  { icon: BarChart3, title: 'Manager reports', detail: 'Revenue, expenses & approvals' },
] as const;

export default function Login() {
  const { login, isAuthenticated, currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  if (isAuthenticated && !submitting) {
    const target = from ?? dashboardPathForRole(currentUser.role);
    return <Navigate to={target} replace />;
  }

  const completeLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    setSubmitting(true);
    const result = await login(loginEmail.trim(), loginPassword, remember);
    setSubmitting(false);
    setActiveDemo(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate(from ?? dashboardPathForRole(result.user.role), { replace: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await completeLogin(email, password);
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('shayan123');
    setActiveDemo(demoEmail);
    await completeLogin(demoEmail, 'shayan123');
  };

  return (
    <div className="min-h-screen flex bg-bg-secondary">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden gradient-primary">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519167758481-83f5408596d8?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-primary-dark/95" />
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-secondary/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/15 shadow-lg">
              <Building2 className="h-6 w-6 text-secondary-light" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide">Shayan Banquet</p>
              <p className="text-secondary-light text-[11px] font-semibold tracking-[0.2em] uppercase">& Lawn</p>
            </div>
          </div>

          <div className="max-w-lg space-y-8">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-secondary-light bg-white/10 px-3 py-1.5 rounded-full mb-6 border border-white/10">
                <ShieldCheck size={14} />
                Staff Portal
              </span>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5 text-white">
                Manage events with confidence.
              </h1>
              <p className="text-white/75 text-base leading-relaxed">
                Secure access for booking office, managers, and administrators.
                Track reservations, payments, and event-day operations in one place.
              </p>
            </div>

            <div className="grid gap-3">
              {FEATURES.map(({ icon: Icon, title, detail }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon size={18} className="text-secondary-light" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{title}</p>
                    <p className="text-white/60 text-xs mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-white/55 text-xs">PAF Plot # 2, Shaheed-e-Millat Flyover, Karachi</p>
            <p className="text-white/45 text-xs">
              &copy; {new Date().getFullYear()} Shayan Banquet &amp; Lawn. Internal use only.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-12 relative">
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(15 76 117 / 0.08) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="w-full max-w-md animate-fade-in relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-primary">Shayan Banquet</p>
              <p className="text-[10px] text-secondary font-semibold tracking-wider uppercase">& Lawn</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-primary mb-2">Welcome back</h2>
            <p className="text-muted text-sm">Sign in to your staff account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="card !p-8 shadow-lg border border-border/80 bg-white/95 backdrop-blur-sm">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger animate-fade-in"
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Email address
                </label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@shayanbanquet.pk"
                    className="w-full pl-10 pr-4 py-2.5 bg-white transition-shadow focus:shadow-[0_0_0_3px_rgba(15,76,117,0.12)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 bg-white transition-shadow focus:shadow-[0_0_0_3px_rgba(15,76,117,0.12)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary/30"
                  />
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 !py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Quick demo access
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((demo) => {
                const Icon = demo.icon;
                const isLoading = submitting && activeDemo === demo.email;
                return (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => void quickLogin(demo.email)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all disabled:opacity-60 ${demo.accent}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-border/80 shadow-sm">
                        {isLoading ? (
                          <Loader2 size={18} className="animate-spin text-primary" />
                        ) : (
                          <Icon size={18} className="text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-text-primary">{demo.label}</p>
                        <p className="text-xs text-muted truncate">{demo.description}</p>
                      </div>
                      <span className="hidden sm:inline text-[10px] font-mono text-text-tertiary bg-bg-tertiary px-2 py-1 rounded-md">
                        {demo.shortLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[11px] text-text-tertiary">
              Demo password: <span className="font-mono text-text-secondary">shayan123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
