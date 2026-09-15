import { Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, Phone, Mail, MapPin, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Venues', path: '/venues' },
  { label: 'Packages', path: '/packages' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Contact', path: '/contact' },
  { label: 'Track Booking', path: '/booking-status' },
  { label: 'Book Now', path: '/inquiry', highlight: true },
];

export default function PublicLayout() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-bg-secondary">
      {/* Top bar */}
      <div className="app-chrome no-print bg-primary-dark text-white/80 text-xs py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone size={11} /> 0300-2033224</span>
            <span className="flex items-center gap-1"><Mail size={11} /> info@shayanbanquet.pk</span>
            <span className="flex items-center gap-1"><MapPin size={11} /> Karachi, Pakistan</span>
          </div>
          <Link to="/login" className="text-secondary-light hover:text-white transition-colors font-medium">Staff Login →</Link>
        </div>
      </div>

      {/* Main nav */}
      <header className="app-chrome no-print sticky top-0 z-50 bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-primary leading-tight">Shayan Banquet</h1>
                <p className="text-[10px] text-secondary font-semibold tracking-wider uppercase">& Lawn</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`
                    px-4 py-2 rounded text-sm font-medium transition-all duration-200
                    ${link.highlight
                      ? 'btn-secondary !py-2 !px-4 !rounded'
                      : location.pathname === link.path
                        ? 'text-primary bg-secondary-light'
                        : 'text-muted hover:text-primary hover:bg-surface-alt'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-muted">
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="lg:hidden border-t border-border bg-white animate-fade-in">
            <nav className="flex flex-col p-4 gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenu(false)}
                  className={`
                    px-4 py-3 rounded text-sm font-medium
                    ${link.highlight
                      ? 'btn-secondary text-center mt-2'
                      : location.pathname === link.path
                        ? 'text-primary bg-secondary-light'
                        : 'text-muted hover:bg-surface-alt'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="public-main flex-1">
        <Outlet />
      </main>

      <footer className="app-chrome no-print gradient-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-secondary-light" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Shayan Banquet</h3>
                  <p className="text-secondary-light text-xs tracking-widest font-semibold">& LAWN</p>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Professional banquet and lawn management for weddings, receptions, and corporate events in Karachi.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-secondary-light mb-4 text-sm tracking-wider uppercase">Quick Links</h4>
              <div className="space-y-2">
                {['Venues', 'Packages', 'Gallery', 'Contact', 'Book Now'].map(label => (
                  <Link key={label} to={`/${label.toLowerCase().replace(' ', '-')}`} className="block text-white/70 text-sm hover:text-white transition-colors">{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-secondary-light mb-4 text-sm tracking-wider uppercase">Contact Us</h4>
              <div className="space-y-3 text-white/70 text-sm">
                <p className="flex items-center gap-2"><Phone size={14} className="text-secondary-light" /> 0300-2033224</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-secondary-light" /> PAF Plot # 2, Shaheed-e-Millat Flyover, Baloch Colony, Karachi</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/15 mt-8 pt-6 text-center text-white/50 text-xs">
            <p>&copy; {new Date().getFullYear()} Shayan Banquet & Lawn. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
