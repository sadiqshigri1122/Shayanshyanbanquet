import { Link } from 'react-router-dom';
import { Users, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Venues() {
  const { venues } = useApp();
  const activeVenues = venues.filter((v) => v.status === 'active');

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-12">
        <span className="text-secondary text-sm font-medium tracking-[0.2em] uppercase">Our Venues</span>
        <h1 className="text-4xl font-bold text-primary mt-2">Premium Event Spaces</h1>
        <p className="text-muted mt-3 max-w-lg mx-auto">Browse our banquet halls and lawns. Pricing is negotiated per booking.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {activeVenues.map((venue) => (
          <div key={venue.id} className="card !p-0 !rounded-2xl overflow-hidden hover:shadow-premium transition-all">
            <div className="relative h-64">
              <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
                Up to {venue.capacity.toLocaleString()} guests
              </div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-primary mb-2">{venue.name}</h2>
              <p className="text-muted text-sm mb-4">{venue.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1"><Users size={14} className="text-secondary" /> {venue.capacity.toLocaleString()} guests</span>
                <span className="flex items-center gap-1"><MapPin size={14} className="text-secondary" /> {venue.location}</span>
              </div>
              <Link to={`/inquiry?venue=${venue.id}`} className="inline-flex items-center gap-2 text-secondary font-semibold hover:text-secondary-hover">
                Book This Venue <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
