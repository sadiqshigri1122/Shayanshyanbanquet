import { Link } from 'react-router-dom';
import { Building2, Users, CalendarDays, Star, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function VisitorHome() {
  const { venues } = useApp();
  const activeVenues = venues.filter(v => v.status === 'active');

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[75vh] flex items-center gradient-primary overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519167758481-83f5408596d8?w=1600&q=80')" }}
          />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-20 animate-fade-in">
          <span className="inline-block text-secondary-light text-xs font-semibold tracking-[0.25em] uppercase mb-4 bg-white/10 px-4 py-1.5 rounded-full">
            Professional Event Management
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Shayan Banquet <span className="text-secondary-light">&amp; Lawn</span>
          </h1>
          <p className="text-white/75 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Trusted venue management for weddings, corporate events, and celebrations.
            Book with confidence — pricing tailored to your event.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/inquiry" className="btn-secondary inline-flex items-center justify-center gap-2 !px-8 !py-3 !rounded-md">
              Book Your Event <ArrowRight size={18} />
            </Link>
            <Link to="/venues" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/10 text-white font-semibold rounded-md hover:bg-white/20 transition-all border border-white/20">
              Explore Venues
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-10 z-20 max-w-5xl mx-auto px-4">
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-6 !p-6">
          {[
            { icon: Building2, value: '5+', label: 'Premium Venues' },
            { icon: Users, value: '1500+', label: 'Guest Capacity' },
            { icon: CalendarDays, value: '500+', label: 'Events Hosted' },
            { icon: Star, value: '4.9', label: 'Client Rating' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon size={22} className="mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Venues */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <span className="text-secondary text-xs font-semibold tracking-wider uppercase">Our Venues</span>
          <h2 className="text-3xl font-bold text-primary mt-2">Discover Our Spaces</h2>
          <p className="text-muted mt-3 max-w-lg mx-auto text-sm">From grand banquet halls to open-air lawns — pricing negotiated per booking.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeVenues.slice(0, 4).map((venue, i) => (
            <div key={venue.id} className="card !p-0 overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="relative h-52 overflow-hidden">
                <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                <span className="absolute bottom-3 left-3 bg-primary text-white text-xs font-semibold px-3 py-1 rounded">
                  {venue.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-primary mb-1">{venue.name}</h3>
                <p className="text-muted text-sm line-clamp-2 mb-3">{venue.description}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <Users size={14} className="text-secondary" />
                    Up to {venue.capacity.toLocaleString()} guests
                  </span>
                  <Link to="/inquiry" className="text-secondary font-semibold text-sm hover:text-primary flex items-center gap-1">
                    Book <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-surface-alt py-16 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-secondary text-xs font-semibold tracking-wider uppercase">What We Offer</span>
            <h2 className="text-3xl font-bold text-primary mt-2">Complete Event Solutions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Sound System', 'Catering', 'Decoration', 'Photography', 'Lighting', 'Stage Setup', 'Generator', 'Parking'].map((service) => (
              <div key={service} className="card !p-4 text-center hover:border-secondary/30">
                <CheckCircle2 size={18} className="mx-auto mb-2 text-secondary" />
                <p className="text-text-primary font-medium text-sm">{service}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-primary mb-3">Ready to Plan Your Event?</h2>
        <p className="text-muted max-w-xl mx-auto mb-6 text-sm">
          Submit a booking inquiry and our team will contact you within 24 hours.
        </p>
        <Link to="/inquiry" className="btn-primary inline-flex items-center gap-2 !px-8 !py-3">
          Submit Booking Inquiry <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
