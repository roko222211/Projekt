import { useState } from 'react';
import { analyzeEvent } from '../services/api';


export default function HistoricalResults() {
  const [date, setDate] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);


  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!date || !keyword) {
      setError('Molimo unesite datum i ključnu riječ');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await analyzeEvent(keyword, date);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const getScoreLabel = (score, maxScore = 6) => {
    const ratio = score / maxScore;
    
    if (ratio >= 0.83) { // 5-6/6
      return { 
        text: 'BLACK SWAN! 🔥', 
        color: 'text-red-600', 
        bg: 'bg-red-100', 
        border: 'border-red-500' 
      };
    }
    if (ratio >= 0.67) { // 4/6
      return { 
        text: 'POJAČANA AKTIVNOST ⚠️', 
        color: 'text-orange-600', 
        bg: 'bg-orange-100', 
        border: 'border-orange-500' 
      };
    }
    return { 
      text: 'NORMALNO ✅', 
      color: 'text-green-600', 
      bg: 'bg-green-100', 
      border: 'border-green-500' 
    };
  };


  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Povijesna analiza događaja</h1>
      <p className="text-gray-600 mb-8">Unesite datum i ključnu riječ za analizu Black Swan događaja</p>
      
      {/* Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Datum</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ključna riječ</label>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="npr. 'Trump atentat'" 
              className="w-full border rounded px-3 py-2" 
              required
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Analiziram...' : 'Analiziraj'}
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
        <div className="space-y-6">
          {/* Overall Score */}
          <div className={`bg-white p-8 rounded-lg shadow-lg border-l-4 ${getScoreLabel(result.scores.total, result.scores.maxPossible).border}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Ukupan rezultat: {result.scores.total}/{result.scores.maxPossible}
                </h2>
                <p className={`text-xl font-semibold ${getScoreLabel(result.scores.total, result.scores.maxPossible).color}`}>
                  {getScoreLabel(result.scores.total, result.scores.maxPossible).text}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Datum: {result.date}</p>
                <p>Ključna riječ: "{result.keyword}"</p>
                {result.classification && (
                  <p className="mt-2 font-semibold text-gray-700">
                    {result.classification === 'BLACK_SWAN' && '🔥 BLACK SWAN'}
                    {result.classification === 'ELEVATED' && '⚠️ ELEVATED'}
                    {result.classification === 'NORMAL' && '✅ NORMAL'}
                  </p>
                )}
              </div>
            </div>
          </div>


          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* S&P 500 */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                📈 S&P 500
              </h3>
              <div className="text-4xl font-bold text-red-600 mb-3">
                {result.scores.spx}/2
              </div>
              
              {result.details.spx && result.details.spx.success && (
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Dnevni pomak:</strong> {result.details.spx.dailyReturn.toFixed(2)}%</p>
                  <p><strong>Percentil:</strong> {result.details.spx.percentileRank.toFixed(1)}%</p>
                  <p><strong>Razina:</strong> {
                    result.details.spx.level === 'EXTREME_VOLATILITY' ? '🔥 Ekstremna volatilnost' :
                    result.details.spx.level === 'ELEVATED_VOLATILITY' ? '⚠️ Povišena volatilnost' :
                    '✅ Normalno'
                  }</p>
                  
                  {result.details.spx.details && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <p>Close: ${result.details.spx.details.closePrice?.toFixed(2)}</p>
                      <p>Period: {result.details.spx.details.historicalPeriod}</p>
                    </div>
                  )}
                </div>
              )}
              
              {result.details.spx && !result.details.spx.success && (
                <p className="text-sm text-red-600">❌ {result.details.spx.error}</p>
              )}
            </div>


            {/* Market Card (Polymarket or VIX) */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                {result.scores.marketSource === 'polymarket' ? '📊 Polymarket' : '📉 VIX'}
                {result.scores.marketSource === 'vix_skew' && (
                  <span className="text-xs font-normal text-orange-600 ml-1">(Fallback)</span>
                )}
              </h3>
              <div className="text-4xl font-bold text-blue-600 mb-3">
                {result.scores.market}/2
              </div>
              
              {/* Polymarket display */}
              {result.details.market && result.details.market.source === 'polymarket' && result.details.market.success && (
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="font-semibold truncate" title={result.details.market.market?.question}>
                    {result.details.market.market?.question.substring(0, 50)}...
                  </p>
                  <p><strong>Volumen:</strong> ${result.details.market.volume?.totalVolume.toLocaleString()}</p>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-semibold mb-1 text-xs">Bodovanje:</p>
                    <p className="text-xs">• Volume spike: {result.details.market.scoreDetails?.volumeSpike ? '✅' : '❌'} 
                       {result.details.market.scoreDetails?.volumeRatio && ` (${result.details.market.scoreDetails.volumeRatio}x)`}
                    </p>
                  </div>
                </div>
              )}
              
              {/* VIX display */}
              {result.details.market && result.details.market.source === 'vix_skew' && result.details.market.success && (
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>VIX:</strong> {result.details.market.details?.vixValue?.toFixed(2)}</p>
                  <p><strong>Razina:</strong> {
                    result.details.market.level === 'EXTREME_PANIC' ? '🔥 Ekstremna panika' :
                    result.details.market.level === 'HIGH_FEAR' ? '🔥 Visoki strah' :
                    result.details.market.level === 'ELEVATED_FEAR' ? '⚠️ Povišeni strah' :
                    result.details.market.level === 'MODERATE' ? '⚠️ Umjeren' :
                    '✅ Normalno'
                  }</p>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-semibold mb-1 text-xs">Bodovanje:</p>
                    <p className="text-xs">• VIX razina: {result.details.market.details?.vixSpike ? '✅' : '❌'}</p>
                  </div>
                  
                  {result.details.market.polymarketError && (
                    <div className="mt-3 pt-3 border-t text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      <p><strong>⚠️ Fallback razlog:</strong></p>
                      <p className="italic mt-1">{result.details.market.polymarketError}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Error display */}
              {result.details.market && !result.details.market.success && (
                <p className="text-sm text-red-600">❌ {result.details.market.error}</p>
              )}
            </div>


            {/* Google Trends */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                🔍 Google Trends
              </h3>
              <div className="text-4xl font-bold text-purple-600 mb-3">
                {result.scores.trends}/2
              </div>
              
              {result.details.trends && result.details.trends.scoring && (
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Razlog:</strong> {result.details.trends.scoring.reason}</p>
                  
                  {result.details.trends.scoring.details && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <p><strong>Target:</strong> {result.details.trends.scoring.details.targetValue}</p>
                      {result.details.trends.scoring.details.day7Before && (
                        <p><strong>7 dana prije:</strong> {result.details.trends.scoring.details.day7Before.value}</p>
                      )}
                      {result.details.trends.scoring.details.spikeRatio && (
                        <p><strong>Spike ratio:</strong> {result.details.trends.scoring.details.spikeRatio}x</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* Metadata Footer */}
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Vrijeme izvršavanja: {result.metadata?.executionTime}</span>
              <span>Uspješne metrike: {result.metadata?.successfulMetrics || 3}/3</span>
              <span className="text-xs">{new Date(result.metadata?.timestamp).toLocaleString('hr-HR')}</span>
            </div>
          </div>
        </div>
      )}


      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <span className="text-6xl mb-4 block">🔍</span>
          <p className="text-gray-500 text-lg">Unesite datum i ključnu riječ za analizu</p>
        </div>
      )}
    </div>
  );
}
