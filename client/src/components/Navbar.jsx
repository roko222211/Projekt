import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">🦢</span>
            Black Swan Detektor
          </Link>
          
          <div className="flex space-x-6">
            <Link to="/" className="hover:text-gray-300 transition">
              Danas
            </Link>
            <Link to="/historical" className="hover:text-gray-300 transition">
              Povijesni podaci
            </Link>
            <Link to="/case-studies" className="hover:text-gray-300 transition">
              Primjeri
            </Link>
            <Link to="/momentum" className="hover:text-gray-300 transition">
              Momentum Strategija
            </Link>
            <Link to="/methodology" className="hover:text-gray-300 transition">
              Dokumentacija
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
