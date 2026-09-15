import { useApp } from '../../context/AppContext';

const extraImages = [
  'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=600&q=80',
  'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600&q=80',
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80',
];

export default function Gallery() {
  const { venues } = useApp();
  const images = [...venues.map((v) => v.imageUrl), ...extraImages];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-12">
        <span className="text-secondary text-sm font-medium tracking-[0.2em] uppercase">Gallery</span>
        <h1 className="text-4xl font-bold text-primary mt-2">Our Events & Venues</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((src, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden group cursor-pointer">
            <img src={src} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
