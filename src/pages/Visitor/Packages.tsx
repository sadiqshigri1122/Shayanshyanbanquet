import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Packages() {
  const { packages, venues } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-12">
        <span className="text-secondary text-sm font-medium tracking-[0.2em] uppercase">Packages</span>
        <h1 className="text-4xl font-bold text-primary mt-2">Event Packages</h1>
        <p className="text-muted mt-3">Pre-designed bundles with transparent pricing for weddings, mehndi, and corporate events.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {packages.filter((p) => p.isActive).map((pkg) => (
          <div key={pkg.id} className="card !p-0 !rounded-2xl hover:shadow-premium transition-all overflow-hidden">
            <div className="gradient-primary p-6 text-white">
              <h2 className="text-xl font-bold">{pkg.name}</h2>
              <p className="text-white/70 text-sm mt-2">Pricing negotiated per booking</p>
            </div>
            <div className="p-6">
              <p className="text-muted text-sm mb-4">{pkg.description}</p>
              <p className="text-xs text-gray-400 mb-3">Compatible venues: {pkg.venueIds.map((id) => venues.find((v) => v.id === id)?.name).filter(Boolean).join(', ')}</p>
              <ul className="space-y-2 mb-6">
                {pkg.includedServices.map((s) => (
                  <li key={s.serviceId} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={14} className="text-secondary flex-shrink-0" />
                    {s.serviceName} {s.quantity > 1 && `(×${s.quantity})`}
                  </li>
                ))}
              </ul>
              <Link to={`/inquiry?package=${pkg.id}`} className="btn-secondary flex items-center justify-center gap-2 w-full !py-3 !rounded-lg">
                Request Quote <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
