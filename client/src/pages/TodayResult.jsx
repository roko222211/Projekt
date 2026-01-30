import { useState, useEffect } from 'react';
import { analyzeEvent, fetchLiveSPX as fetchLiveSPXAPI } from '../services/api';

export default function TodayResult() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [liveSpxData, setLiveSpxData] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Fetch live S&P 500 data on mount
  useEffect(() => {
    fetchLiveSPX();
    // Refresh every 5 minutes during market hours
    const interval = setInterval(fetchLiveSPX, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveSPX = async () => {
    try {
      const response = await fetchLiveSPXAPI(); // 🔧 Use backend API
      if (response.success) {
        setLiveSpxData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch live SPX:', error);
    }
  };



  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!keyword) {
      setError('Molimo unesite ključnu riječ');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await analyzeEvent(keyword, today);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score, max) => {
    const ratio = score / max;
    if (ratio >= 0.83) return 'text-red-600';
    if (ratio >= 0.67) return 'text-orange-600';
    if (ratio >= 0.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Današnja analiza</h1>
      <p className="text-gray-600 mb-8">
        Real-time detekcija Black Swan događaja za {new Date().toLocaleDateString('hr-HR')}
      </p>

      {/* Live S&P 500 Ticker */}
      {liveSpxData && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">S&P 500 {liveSpxData.isOpen ? '🟢 LIVE' : '🔴 CLOSED'}</p>
              <p className="text-3xl font-bold">${liveSpxData.price}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                parseFloat(liveSpxData.changePercent) >= 0 ? 'text-green-300' : 'text-red-300'
              }`}>
                {parseFloat(liveSpxData.changePercent) >= 0 ? '+' : ''}{liveSpxData.changePercent}%
              </p>
              <p className="text-sm opacity-90">
                {parseFloat(liveSpxData.change) >= 0 ? '+' : ''}{liveSpxData.change} pts
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Input Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <form onSubmit={handleAnalyze} className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Ključna riječ</label>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="npr. 'NATO napad', 'ekonomska kriza'..." 
              className="w-full border rounded px-3 py-2" 
              required
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Analiziram...' : 'Analiziraj danas'}
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          <strong>Greška:</strong> {error}
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* S&P 500 Card */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">📈 S&P 500</h2>
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.scores.spx, 2)}`}>
                {result.scores.spx}/2
              </div>
              {result.details.spx?.success && (
                <p className="text-sm text-gray-500">
                  {result.details.spx.dailyReturn.toFixed(2)}% today
                </p>
              )}
              {!result.details.spx?.success && (
                <p className="text-xs text-red-500">{result.details.spx?.error}</p>
              )}
            </div>

            {/* Market Card (Polymarket or VIX/SKEW) */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                {result.scores.marketSource === 'polymarket' ? '📊 Polymarket' : '📉 VIX'}
                {result.scores.marketSource === 'vix_skew' && (
                  <span className="text-xs font-normal text-orange-600">(FB)</span>
                )}
              </h2>
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.scores.market, 2)}`}>
                {result.scores.market}/2
              </div>
              
              {/* Show relevant metric */}
              {result.details.market?.success && (
                <p className="text-sm text-gray-500">
                  {result.details.market.source === 'polymarket' 
                    ? `$${result.details.market.volume?.totalVolume.toLocaleString()}`
                    : `VIX: ${result.details.market.details?.vixValue?.toFixed(2)}`
                  }
                </p>
              )}
              
              {result.details.market?.polymarketError && (
                <p className="text-xs text-orange-600 mt-2 italic">
                  {result.details.market.polymarketError}
                </p>
              )}
            </div>
            
            {/* Google Trends Card */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">🔍 Google Trends</h2>
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.scores.trends, 2)}`}>
                {result.scores.trends}/2
              </div>
              {result.details.trends?.data && (
                <p className="text-sm text-gray-500">
                  Interest: {result.details.trends.data.target_value || 'N/A'}
                </p>
              )}
            </div>


            {/* Total Score Card */}
            <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-blue-500">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">🎯 UKUPNO</h2>
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.scores.total, result.scores.maxPossible)}`}>
                {result.scores.total}/{result.scores.maxPossible}
              </div>
              <p className="text-sm font-semibold">
                {result.scores.total >= 5 && '🔥 BLACK SWAN'}
                {result.scores.total === 4 && '⚠️ ELEVATED'}
                {result.scores.total < 4 && '✅ NORMAL'}
              </p>
            </div>
          </div>
          
          {/* Summary Card */}
          <div className={`bg-white p-8 rounded-lg shadow-lg border-l-4 ${
            result.scores.total >= 5 ? 'border-red-500' :
            result.scores.total >= 4 ? 'border-orange-500' :
            'border-green-500'
          }`}>
            <h2 className="text-2xl font-bold mb-2">
              {result.scores.total >= 5 && '🔥 BLACK SWAN DETEKTIRAN!'}
              {result.scores.total === 4 && '⚠️ POJAČANA AKTIVNOST'}
              {result.scores.total < 4 && '✅ NORMALNA AKTIVNOST'}
            </h2>
            <p className="text-gray-600 mb-3">
              Ključna riječ: <strong>"{result.keyword}"</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Zadnje ažurirano: {new Date(result.metadata.timestamp).toLocaleString('hr-HR')}
            </p>
            
            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              {/* S&P 500 Details */}
              {result.details.spx?.success && (
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-700 mb-1">📈 S&P 500 Details</p>
                  <p className="text-xs text-gray-600">Return: {result.details.spx.dailyReturn.toFixed(2)}%</p>
                  <p className="text-xs text-gray-600">Percentile: {result.details.spx.percentileRank.toFixed(1)}%</p>
                </div>
              )}
              
              {/* Market Details */}
              {result.details.market?.success && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    {result.details.market.source === 'polymarket' ? '📊 Polymarket' : '📉 VIX'}
                  </p>
                  {result.details.market.source === 'polymarket' && (
                    <>
                      <p className="text-xs text-gray-600 truncate" title={result.details.market.market?.question}>
                        {result.details.market.market?.question.substring(0, 40)}...
                      </p>
                      <p className="text-xs text-gray-600">
                        Vol: ${result.details.market.volume?.totalVolume.toLocaleString()}
                      </p>
                    </>
                  )}
                  {result.details.market.source === 'vix_skew' && (
                    <>
                      <p className="text-xs text-gray-600">VIX: {result.details.market.details?.vixValue?.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">Level: {result.details.market.level}</p>
                    </>
                  )}
                </div>
              )}
              
              {/* Trends Details */}
              {result.details.trends?.scoring && (
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-700 mb-1">🔍 Google Trends</p>
                  <p className="text-xs text-gray-600">{result.details.trends.scoring.reason}</p>
                </div>
              )}
            </div>
            
            {result.scores.total >= 4 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-2">⚠️ TRADING UPOZORENJE:</p>
                <p className="text-sm text-gray-600">
                  Detektirana je {result.scores.total >= 5 ? 'ekstremna' : 'pojačana'} aktivnost. 
                  Preporučene strategije:
                </p>
                <ul className="list-disc pl-5 text-xs text-gray-600 mt-2 space-y-1">
                  {result.scores.total >= 5 && (
                    <>
                      <li>Kupnja VIX call opcija za hedging</li>
                      <li>Smanjenje equity exposure-a (50%+ cash)</li>
                      <li>Long put opcije na SPY/QQQ</li>
                      <li>Povećanje alokacije u zlato i USD</li>
                    </>
                  )}
                  {result.scores.total === 4 && (
                    <>
                      <li>Umjereno smanjenje exposure-a (20-30% cash)</li>
                      <li>Tight stop-loss na postojećim pozicijama</li>
                      <li>Razmotriti protective puts</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <span className="text-6xl mb-4 block">🦢</span>
          <p className="text-gray-500 text-lg mb-2">Nema aktivne analize</p>
          <p className="text-gray-400 text-sm">Unesite ključnu riječ za provjeru današnjeg stanja</p>
        </div>
      )}
    </div>
  );
}
