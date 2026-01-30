import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/momentum';

export default function MomentumStrategy() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [momentumDays, setMomentumDays] = useState(5);
  const [portfolioSize, setPortfolioSize] = useState(20);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/results`);
      setResults(response.data.data);
    } catch (error) {
      console.log('No results found yet');
    } finally {
      setLoading(false);
    }
  };

  const runBacktest = async () => {
    if (!window.confirm(`Run backtest with ${momentumDays}d momentum, ${portfolioSize*2} total positions (${portfolioSize} LONG + ${portfolioSize} SHORT)?\n\nThis will clear previous results.`)) {
      return;
    }
    
    setLoading(true);
    setResults(null);
    
    try {
      // 🗑️ STEP 1: Clear old results
      console.log('Clearing old results...');
      await axios.delete(`${API_BASE}/clear-results`);
      
      // ▶ STEP 2: Run new backtest
      console.log(`Running backtest: ${momentumDays}d momentum, ${portfolioSize*2} positions`);
      const response = await axios.post(`${API_BASE}/run-backtest`, {
        momentumDays: parseInt(momentumDays),
        portfolioSize: parseInt(portfolioSize)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Backtest response:', response.data);
      
      // 📊 STEP 3: Load fresh results
      await loadResults();
      
    } catch (error) {
      console.error('Backtest error:', error);
      alert('Backtest failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-[1800px] mx-auto">
        
        {/* Header with Sliders */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg border border-blue-500 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Black Swan Momentum Strategy
              </h1>
              <p className="text-blue-100 text-lg">
                Quantitative long/short equity strategy • Event-driven momentum
              </p>
            </div>
            <button
              onClick={runBacktest}
              disabled={loading}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
            >
              {loading ? '⏳ Running...' : '▶ Run Backtest'}
            </button>
          </div>

          {/* Slider Configuration Panel */}
          <div className="grid grid-cols-2 gap-8 mb-6 bg-white/10 backdrop-blur p-6 rounded-lg border border-white/20">
            
            {/* Momentum Days Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-blue-100 uppercase tracking-wider">
                  Momentum Window
                </label>
                <span className="text-2xl font-bold text-white bg-white/20 px-4 py-1 rounded-lg">
                  {momentumDays}d
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="20"
                step="1"
                value={momentumDays}
                onChange={(e) => setMomentumDays(parseInt(e.target.value))}
                disabled={loading}
                className="w-full h-3 bg-white/30 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, white 0%, white ${((momentumDays - 3) / 17) * 100}%, rgba(255,255,255,0.3) ${((momentumDays - 3) / 17) * 100}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-blue-200 mt-2">
                <span>3 days</span>
                <span>20 days</span>
              </div>
            </div>

            {/* Portfolio Size Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-blue-100 uppercase tracking-wider">
                  Portfolio Size (per side)
                </label>
                <span className="text-2xl font-bold text-white bg-white/20 px-4 py-1 rounded-lg">
                  {portfolioSize}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(parseInt(e.target.value))}
                disabled={loading}
                className="w-full h-3 bg-white/30 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, white 0%, white ${((portfolioSize - 5) / 45) * 100}%, rgba(255,255,255,0.3) ${((portfolioSize - 5) / 45) * 100}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-blue-200 mt-2">
                <span>5 stocks</span>
                <span>50 stocks</span>
              </div>
            </div>
          </div>

          {/* Strategy Specs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur p-4 rounded-lg border border-white/20">
              <p className="text-xs text-blue-100 uppercase tracking-wider mb-1 font-semibold">Universe</p>
              <p className="text-lg font-bold text-white">S&P 100</p>
              <p className="text-sm text-blue-200 mt-1">101 constituents</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-4 rounded-lg border border-white/20">
              <p className="text-xs text-blue-100 uppercase tracking-wider mb-1 font-semibold">Signal</p>
              <p className="text-lg font-bold text-white">{momentumDays}-Day Momentum</p>
              <p className="text-sm text-blue-200 mt-1">Post-event ranking</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-4 rounded-lg border border-white/20">
              <p className="text-xs text-blue-100 uppercase tracking-wider mb-1 font-semibold">Portfolio</p>
              <p className="text-lg font-bold text-white">{portfolioSize * 2} Positions</p>
              <p className="text-sm text-blue-200 mt-1">{portfolioSize} LONG / {portfolioSize} SHORT</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-4 rounded-lg border border-white/20">
              <p className="text-xs text-blue-100 uppercase tracking-wider mb-1 font-semibold">Horizons</p>
              <p className="text-lg font-bold text-white">3M / 6M / 12M</p>
              <p className="text-sm text-blue-200 mt-1">Fixed periods</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 text-lg">
              Running backtest with {momentumDays}d momentum, {portfolioSize*2} positions...
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && results && results.length > 0 && (
          <div className="space-y-6">
            {results.map((event, idx) => (
              <EventResults key={idx} event={event} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && (!results || results.length === 0) && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-16 text-center">
            <div className="text-7xl mb-4">📊</div>
            <p className="text-slate-600 text-xl mb-2">No backtest results available</p>
            <p className="text-slate-500">Configure parameters and click "Run Backtest"</p>
          </div>
        )}
      </div>

      {/* Custom Slider Styling */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        input[type="range"]:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function EventResults({ event }) {
  const [expanded, setExpanded] = useState(true);
  const [activePeriod, setActivePeriod] = useState('3m');
  const [positions, setPositions] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showLongModal, setShowLongModal] = useState(false);
  const [showShortModal, setShowShortModal] = useState(false);

  if (!event.longPositions || !event.shortPositions || !event.performance) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-bold">⚠️ Incomplete data for {event.event}</p>
          <p className="text-yellow-600 text-sm mt-1">Please re-run the backtest to generate complete results.</p>
        </div>
      </div>
    );
  }

  const activePerf = event.performance.find(p => p.period === activePeriod);
  const { momentumDays = 5, portfolioSize = 20 } = event;

  useEffect(() => {
    if (activePerf) {
      loadPositions(activePerf.backtestId);
      loadChartData(activePerf.backtestId);
    }
  }, [activePeriod, activePerf]);

  const loadPositions = async (backtestId) => {
    try {
      const response = await axios.get(`${API_BASE}/positions/${backtestId}`);
      setPositions(response.data.data);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const loadChartData = async (backtestId) => {
    try {
      const response = await axios.get(`${API_BASE}/chart-data/${backtestId}`);
      setChartData(response.data.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData(null);
    }
  };

  const dailyData = chartData || [];

  const getScoreColor = (value) => {
    if (value >= 0) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Event Header */}
        <div 
          className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6 cursor-pointer hover:from-slate-600 hover:to-slate-500 transition"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">{event.event}</h2>
              <p className="text-slate-200 text-sm">
                Event: {event.eventDate} • Entry (T+{momentumDays}): {event.entryDate} • {portfolioSize*2} positions
              </p>
            </div>
            <div className="text-2xl">{expanded ? '▼' : '▶'}</div>
          </div>
        </div>

        {expanded && (
          <div className="p-6">
            
            {/* Period Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
              {['3m', '6m', '12m'].map((period) => (
                <button
                  key={period}
                  onClick={() => setActivePeriod(period)}
                  className={`flex-1 px-4 py-2 rounded-md font-bold transition ${
                    activePeriod === period
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {period.toUpperCase()} HORIZON
                </button>
              ))}
            </div>

            {/* Metrics Cards */}
            {activePerf && (
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 font-semibold">Strategy Return</p>
                  <p className={`text-3xl font-bold ${getScoreColor(parseFloat(activePerf.portfolioReturn))}`}>
                    {parseFloat(activePerf.portfolioReturn) >= 0 ? '+' : ''}{activePerf.portfolioReturn}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 font-semibold">S&P 500</p>
                  <p className="text-3xl font-bold text-slate-700">{activePerf.sp500Return}%</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 font-semibold">Alpha</p>
                  <p className={`text-3xl font-bold ${getScoreColor(parseFloat(activePerf.excessReturn))}`}>
                    {parseFloat(activePerf.excessReturn) >= 0 ? '+' : ''}{activePerf.excessReturn}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 font-semibold">Sharpe Ratio</p>
                  <p className="text-3xl font-bold text-slate-700">{activePerf.sharpeRatio}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 font-semibold">Win Rate</p>
                  <p className="text-3xl font-bold text-slate-700">{activePerf.winRate}%</p>
                </div>
              </div>
            )}

            {/* Daily Chart - 🔥 AŽURIRANO sa % prikazom */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm mb-6">
              <h4 className="font-bold text-slate-700 text-lg mb-4">
                Daily Cumulative Performance ({activePeriod.toUpperCase()})
              </h4>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                        const day = d.getDate().toString().padStart(2, '0');
                        return `${month}/${day}`;
                      }}
                      interval="preserveStartEnd"
                      minTickGap={30}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      label={{ value: 'Cumulative Return (%)', angle: -90, position: 'insideLeft', fill: '#475569', style: { fontWeight: 600 } }}
                      tickFormatter={(value) => {
                        const pct = value - 100;
                        return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
                      }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const pct = value - 100;
                        return [`${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, name];
                      }}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      }}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '2px solid #cbd5e1', 
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontWeight: 600
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '13px', fontWeight: 600 }} 
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="portfolio" 
                      stroke="#10b981" 
                      name="Strategy" 
                      strokeWidth={3} 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sp500" 
                      stroke="#3b82f6" 
                      name="S&P 500" 
                      strokeWidth={3} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div 
                onClick={() => setShowLongModal(true)}
                className="bg-green-50 rounded-lg p-5 border-2 border-green-200 cursor-pointer hover:border-green-400 transition"
              >
                <h4 className="font-bold text-green-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    LONG PORTFOLIO (Top {portfolioSize})
                  </span>
                  <span className="text-sm text-green-600">View all →</span>
                </h4>
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {event.longPositions && event.longPositions.slice(0, 8).map((pos, i) => {
                    const returnValue = pos.returnPct ?? pos.return5d ?? 0;
                    return (
                      <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded border border-green-100">
                        <span className="font-mono font-bold text-slate-700 text-sm">{pos.ticker}</span>
                        <span className="text-green-600 font-bold text-sm">+{returnValue.toFixed(2)}%</span>
                      </div>
                    );
                  })}
                  {event.longPositions.length > 8 && (
                    <p className="text-xs text-slate-500 text-center pt-1">
                      + {event.longPositions.length - 8} more
                    </p>
                  )}
                </div>
              </div>

              <div 
                onClick={() => setShowShortModal(true)}
                className="bg-red-50 rounded-lg p-5 border-2 border-red-200 cursor-pointer hover:border-red-400 transition"
              >
                <h4 className="font-bold text-red-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    SHORT PORTFOLIO (Bottom {portfolioSize})
                  </span>
                  <span className="text-sm text-red-600">View all →</span>
                </h4>
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {event.shortPositions && event.shortPositions.slice(0, 8).map((pos, i) => {
                    const returnValue = pos.returnPct ?? pos.return5d ?? 0;
                    return (
                      <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded border border-red-100">
                        <span className="font-mono font-bold text-slate-700 text-sm">{pos.ticker}</span>
                        <span className="text-red-600 font-bold text-sm">{returnValue.toFixed(2)}%</span>
                      </div>
                    );
                  })}
                  {event.shortPositions.length > 8 && (
                    <p className="text-xs text-slate-500 text-center pt-1">
                      + {event.shortPositions.length - 8} more
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Position Table */}
            {positions && (
              <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4">
                  Position-Level Performance ({activePeriod.toUpperCase()})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 text-left font-bold">Ticker</th>
                        <th className="p-3 text-center font-bold">Side</th>
                        <th className="p-3 text-right font-bold">Return</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-3 font-mono font-bold text-slate-800">{pos.ticker}</td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              pos.side === 'LONG' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {pos.side}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-bold ${parseFloat(pos.return_pct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(pos.return_pct) >= 0 ? '+' : ''}{parseFloat(pos.return_pct).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Modals */}
      {showLongModal && (
        <PositionModal
          title={`LONG Portfolio - Top ${portfolioSize} Momentum Winners`}
          positions={event.longPositions}
          type="long"
          onClose={() => setShowLongModal(false)}
        />
      )}

      {showShortModal && (
        <PositionModal
          title={`SHORT Portfolio - Bottom ${portfolioSize} Momentum Losers`}
          positions={event.shortPositions}
          type="short"
          onClose={() => setShowShortModal(false)}
        />
      )}
    </>
  );
}

function PositionModal({ title, positions, type, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 ${type === 'long' ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500'} text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">{title}</h3>
              <p className="text-sm opacity-90">Momentum ranking at entry</p>
            </div>
            <button onClick={onClose} className="text-3xl hover:opacity-75 transition">×</button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-2">
            {positions && positions.map((pos, i) => {
              const returnValue = pos.returnPct ?? pos.return5d ?? 0;
              return (
                <div key={i} className={`flex justify-between items-center p-3 rounded-lg border-2 ${
                  type === 'long' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-500">#{i + 1}</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{pos.ticker}</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    type === 'long' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {type === 'long' ? '+' : ''}{returnValue.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
