import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import TodayResult from './pages/TodayResult';
import HistoricalResults from './pages/HistoricalResults';
import CaseStudies from './pages/CaseStudies';
import MomentumStrategy from './pages/MomentumStrategy';
import Methodology from './pages/Methodology';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<TodayResult />} />
            <Route path="/historical" element={<HistoricalResults />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/momentum" element={<MomentumStrategy />} />
            <Route path="/methodology" element={<Methodology />} />
          </Routes>
        </main>
        
        <footer className="bg-gray-900 text-white py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm">🦢 Black Swan Detektor</p>
            <p className="text-xs text-gray-400 mt-1">
              Multi-signal sustav za detekciju ekstremnih događaja u financijskim tržištima
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
