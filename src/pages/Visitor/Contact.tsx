import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Contact() {
  const { settings } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-12">
        <span className="text-secondary text-sm font-medium tracking-[0.2em] uppercase">Contact</span>
        <h1 className="text-4xl font-bold text-primary mt-2">Get In Touch</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {[
            { icon: Phone, label: 'Phone', value: settings.companyPhone },
            { icon: Mail, label: 'Email', value: settings.companyEmail },
            { icon: MapPin, label: 'Address', value: settings.companyAddress },
            { icon: Clock, label: 'Office Hours', value: 'Mon–Sat: 10 AM – 8 PM' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4 card">
              <div className="w-10 h-10 bg-secondary-light rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
                <p className="font-semibold text-primary mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <form className="card space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent! Our team will contact you shortly.'); }}>
          <h2 className="font-bold text-primary">Send a Message</h2>
          <input type="text" placeholder="Your Name" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <input type="tel" placeholder="Phone Number" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <textarea placeholder="Your Message" rows={4} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <button type="submit" className="btn-secondary w-full !py-3 !rounded-lg">Send Message</button>
        </form>
      </div>
    </div>
  );
}
