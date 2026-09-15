import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { dashboardPathForRole } from '../utils/authUtils';

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

  if (isAuthenticated && !submitting) {
    const target = from ?? dashboardPathForRole(currentUser.role);
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login(email.trim(), password, remember);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate(from ?? dashboardPathForRole(result.user.role), { replace: true });
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('shayan123');
    setError('');
    setSubmitting(true);
    const result = await login(demoEmail, 'shayan123', remember);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(dashboardPathForRole(result.user.role), { replace: true });
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden gradient-primary">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519167758481-83f5408596d8?w=1600&q=80')" }}
        />
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-secondary/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/15">
              <Building2 className="h-6 w-6 text-secondary-light" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide">Shayan Banquet</p>
              <p className="text-secondary-light text-[11px] font-semibold tracking-[0.2em] uppercase">& Lawn</p>
            </div>
          </div>

          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-secondary-light bg-white/10 px-3 py-1.5 rounded-full mb-6">
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

          <p className="text-white/45 text-xs">
            &copy; {new Date().getFullYear()} Shayan Banquet &amp; Lawn. Internal use only.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg-secondary">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-primary">Shayan Banquet</p>
              <p className="text-[10px] text-secondary font-semibold tracking-wider uppercase">& Lawn</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-2">Welcome back</h2>
            <p className="text-muted text-sm">Sign in to your staff account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="card !p-8 shadow-lg border border-border/80">
            {error && (
              <div className="mb-5 rounded-md border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@shayanbanquet.pk"
                    className="w-full pl-10 pr-4 py-2.5 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-primary"
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
                    className="rounded border-border"
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 !py-3 disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
                {!submitting && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-center text-xs text-muted">
              Demo password for all accounts: <span className="font-mono text-text-secondary">shayan123</span>
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Office', email: 'ahmed@shayanbanquet.pk' },
                { label: 'Manager', email: 'ali@shayanbanquet.pk' },
                { label: 'Admin', email: 'admin@shayanbanquet.pk' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => void quickLogin(demo.email)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-white hover:bg-surface-alt font-semibold text-text-secondary disabled:opacity-50"
                >
                  Demo: {demo.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
