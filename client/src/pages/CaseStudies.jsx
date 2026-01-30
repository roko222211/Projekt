import { useState } from 'react';
import { analyzeEvent } from '../services/api';



const CASE_STUDIES = [
  // ============================================================================
  // BLACK SWAN DOGAĐAJI (Score 5-6/6 - EKSTREMNI DOGAĐAJI)
  // ============================================================================
  {
    id: 1,
    date: '2020-03-16',
    keyword: 'COVID-19',
    title: 'COVID-19 Market Crash',
    description: 'WHO proglašava globalnu pandemiju. S&P 500 pada 12% u jednom danu - najveći pad od 1987.',
    expectedScore: 6,
    category: 'black-swan',
    details: 'S&P 500 pad -11.98%, VIX dostiže 82.69 (rekord), globalni lockdown, masovna panika.'
  },
  {
    id: 2,
    date: '2025-04-03',
    keyword: 'tariffs',
    title: 'Trump "Liberation Day" carinske tarife',
    description: 'Trump najavljuje masivne carine na sve zemlje, S&P 500 pada 4.84% - najveći pad u 2025.',
    expectedScore: 5,
    category: 'black-swan',
    details: 'S&P 500 pad -4.84% (100. percentil), VIX skok na 21.5, Google Trends eksplozija (7.69x spike).'
  },
  {
    id: 3,
    date: '2022-11-30',
    keyword: 'ChatGPT',
    title: 'Lansiranje ChatGPT-a',
    description: 'OpenAI lansira ChatGPT, najbrže rastuću aplikaciju u povijesti (100M korisnika za 2 mjeseca).',
    expectedScore: 5,
    category: 'black-swan',
    details: 'AI boom na tržištu, MSFT rally, tehnološka revolucija, masivno zanimanje na Google Trends.'
  },
  
  // ============================================================================
  // NON-BLACK SWAN DOGAĐAJI (Score 2-4/6 - UMJERENI I RUTINSKI)
  // ============================================================================
  {
    id: 4,
    date: '2024-11-06',
    keyword: 'Trump presidential election victory',
    title: 'Trump pobjeđuje na izborima 2024',
    description: 'Donald Trump pobjeđuje Kamalu Harris i postaje 47. predsjednik SAD-a.',
    expectedScore: 4,
    category: 'non-black-swan',
    details: 'S&P 500 rally +2.53% (99.6 percentil), ali događaj predviđen (Polymarket 60%+). Umjerena volatilnost.'
  },
  {
    id: 5,
    date: '2022-02-24',
    keyword: 'Russia Ukraine war invasion',
    title: 'Ruska invazija na Ukrajinu',
    description: 'Rusija pokreće vojnu invaziju na Ukrajinu 24. veljače 2022. Početak rata.',
    expectedScore: 4,
    category: 'non-black-swan',
    details: 'Geopolitički šok, energetska kriza, commodities spike, S&P 500 pad -1.8%, VIX skok na 36.'
  },
  {
    id: 6,
    date: '2023-03-10',
    keyword: 'Silicon Valley Bank collapse SVB',
    title: 'Kolaps Silicon Valley Bank',
    description: 'Drugi najveći bankrot banke u SAD-u. Panični run na banke, sistemska kriza.',
    expectedScore: 3,
    category: 'non-black-swan',
    details: 'Financijski sektor pada -5%, VIX skok na 27, Fed reagira hitnim mjerama, ali brz oporavak.'
  },
  {
    id: 7,
    date: '2024-07-13',
    keyword: 'Trump assassination',
    title: 'Pokušaj atentata na Trumpa',
    description: 'Pokušaj atentata na Donald Trumpa tijekom predizbornog skupa u Pennsylvaniji.',
    expectedScore: 2,
    category: 'non-black-swan',
    details: 'Volume spike na Polymarket ($400M+), Google Trends eksplozija, ali S&P 500 stabilan (+0.3%).'
  },
  {
    id: 8,
    date: '2023-10-07',
    keyword: 'Hamas attack Israel October',
    title: 'Početak Izraelsko-Palestinskog rata',
    description: 'Hamas pokreće iznenadni napad na Izrael 7. listopada 2023. Početak rata u Gazi.',
    expectedScore: 2,
    category: 'non-black-swan',
    details: 'Geopolitička kriza, oil spike +4%, ali ograničen market impact. S&P 500 -0.5%, brz oporavak.'
  },
  {
    id: 9,
    date: '2024-09-18',
    keyword: 'Federal Reserve interest rate cut',
    title: 'Fed smanjuje kamatne stope',
    description: 'Federal Reserve smanjuje kamatne stope za 0.5% (50 baznih poena) - prvo smanjenje od 2020.',
    expectedScore: 2,
    category: 'non-black-swan',
    details: 'Najavljeno smanjenje, tržište reagiralo pozitivno ali bez šoka. S&P 500 -0.29%.'
  },
  {
    id: 10,
    date: '2024-06-27',
    keyword: 'Biden Trump presidential debate',
    title: 'Biden-Trump debata',
    description: 'Prva predsjednička debata između Biden i Trumpa. Katastrofalna Bidenova izvedba.',
    expectedScore: 2,
    category: 'non-black-swan',
    details: 'Politički događaj, Polymarket reagirala (Trumpove šanse +15%), ali S&P 500 stabilan (+0.09%).'
  },
  {
    id: 11,
    date: '2024-03-05',
    keyword: 'Super Tuesday primary election',
    title: 'Super Tuesday primarni izbori',
    description: 'Super Tuesday - 15 država glasa istovremeno. Biden i Trump osiguravaju nominacije.',
    expectedScore: 2,
    category: 'non-black-swan',
    details: 'Rutinski politički događaj, predvidljiv ishod. S&P 500 -1.02%, ali više zbog drugih faktora.'
  }
];



export default function CaseStudies() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);



  const handleAnalyze = async (caseStudy) => {
    setSelectedCase(caseStudy);
    setLoading(true);
    setResult(null);
    
    try {
      const data = await analyzeEvent(caseStudy.keyword, caseStudy.date);
      setResult(data);
    } catch (error) {
      console.error('Greška:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };



  const blackSwans = CASE_STUDIES.filter(c => c.category === 'black-swan');
  const nonBlackSwans = CASE_STUDIES.filter(c => c.category === 'non-black-swan');



  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Studije slučaja</h1>
      <p className="text-gray-600 mb-8">
        Detaljne analize <strong>11 povijesnih događaja</strong>: 3 Black Swan događaja (score 5-6) i 8 rutinskih/umjerenih događaja (score 2-4)
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Case Studies List */}
        <div className="space-y-6">
          {/* BLACK SWAN EVENTS */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">🔥 Black Swan događaji (Score 5-6)</h2>
            <div className="space-y-4">
              {blackSwans.map(caseStudy => (
                <div 
                  key={caseStudy.id}
                  className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-500 cursor-pointer hover:shadow-xl transition"
                  onClick={() => handleAnalyze(caseStudy)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold">{caseStudy.title}</h3>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-bold">
                      {caseStudy.expectedScore}/6
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{caseStudy.date}</p>
                  <p className="text-gray-700 mb-3">{caseStudy.description}</p>
                  <p className="text-sm text-gray-500 italic">{caseStudy.details}</p>
                  <button className="mt-3 text-blue-600 text-sm font-semibold hover:underline">
                    → Analiziraj ovaj događaj
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* NON-BLACK SWAN EVENTS */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-700">✅ Umjereni i rutinski događaji (Score 2-4)</h2>
            <div className="space-y-4">
              {nonBlackSwans.map(caseStudy => (
                <div 
                  key={caseStudy.id}
                  className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-gray-400 cursor-pointer hover:shadow-xl transition"
                  onClick={() => handleAnalyze(caseStudy)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold">{caseStudy.title}</h3>
                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm font-bold">
                      {caseStudy.expectedScore}/6
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{caseStudy.date}</p>
                  <p className="text-gray-700 mb-3">{caseStudy.description}</p>
                  <p className="text-sm text-gray-500 italic">{caseStudy.details}</p>
                  <button className="mt-3 text-blue-600 text-sm font-semibold hover:underline">
                    → Analiziraj ovaj događaj
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>



        {/* Right Column: Analysis Results */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {!selectedCase && (
            <div className="bg-gray-50 p-12 rounded-lg shadow text-center">
              <span className="text-6xl mb-4 block">📊</span>
              <p className="text-gray-500 text-lg">Odaberite događaj za analizu</p>
              <p className="text-gray-400 text-sm mt-2">
                Kliknite na bilo koji događaj s lijeve strane
              </p>
            </div>
          )}



          {loading && (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analiziram "{selectedCase.title}"...</p>
            </div>
          )}



          {result && result.success && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold mb-4">{selectedCase.title}</h3>
              
              {/* Score Badge */}
              <div className={`inline-block px-4 py-2 rounded-lg mb-4 ${
                result.scores.total >= 5 ? 'bg-red-100 text-red-800' :
                result.scores.total === 4 ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                <span className="text-2xl font-bold">
                  {result.scores.total}/{result.scores.maxPossible}
                </span>
                <span className="ml-2">
                  {result.scores.total >= 5 ? '🔥 BLACK SWAN' :
                   result.scores.total === 4 ? '⚠️ POJAČANO' :
                   '✅ NORMALNO'}
                </span>
              </div>



              {/* Breakdown */}
              <div className="space-y-3 mb-4">
                {/* S&P 500 */}
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="font-semibold">📈 S&P 500</span>
                  <span className="text-xl font-bold text-red-600">
                    {result.scores.spx}/2
                  </span>
                </div>
                
                {/* Market (Polymarket or VIX) */}
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="font-semibold">
                    {result.scores.marketSource === 'polymarket' ? '📊 Polymarket' : '📉 VIX'}
                    {result.scores.marketSource === 'vix_skew' && (
                      <span className="text-xs text-orange-600 ml-1">(Fallback)</span>
                    )}
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {result.scores.market}/2
                  </span>
                </div>
                
                {/* Google Trends */}
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="font-semibold">🔍 Google Trends</span>
                  <span className="text-xl font-bold text-purple-600">
                    {result.scores.trends}/2
                  </span>
                </div>
              </div>



              {/* Comparison with Expected */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-2">Usporedba sa očekivanim:</h4>
                <div className="flex items-center gap-3">
                  <span>Očekivano: <strong>{selectedCase.expectedScore}/6</strong></span>
                  <span>→</span>
                  <span>Dobiveno: <strong>{result.scores.total}/{result.scores.maxPossible}</strong></span>
                  {result.scores.total === selectedCase.expectedScore && (
                    <span className="text-green-600 font-semibold">✓ POTVRĐENO</span>
                  )}
                  {Math.abs(result.scores.total - selectedCase.expectedScore) === 1 && (
                    <span className="text-orange-600 font-semibold">≈ BLIZU</span>
                  )}
                </div>
              </div>



              {/* S&P 500 Details */}
              {result.details.spx && result.details.spx.success && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-2">📈 Detalji S&P 500:</h4>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Dnevni return:</strong> {result.details.spx.dailyReturn.toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Percentil:</strong> {result.details.spx.percentileRank.toFixed(1)}%
                  </p>
                </div>
              )}



              {/* Market Details (Polymarket or VIX) */}
              {result.details.market && result.details.market.success && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-2">
                    {result.details.market.source === 'polymarket' ? '📊 Detalji Polymarket:' : '📉 Detalji VIX:'}
                  </h4>
                  
                  {/* Polymarket details */}
                  {result.details.market.source === 'polymarket' && (
                    <>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Market:</strong> {result.details.market.market?.question}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Volumen:</strong> ${result.details.market.volume?.totalVolume.toLocaleString()}
                      </p>
                    </>
                  )}
                  
                  {/* VIX details */}
                  {result.details.market.source === 'vix_skew' && (
                    <>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>VIX:</strong> {result.details.market.details?.vixValue?.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Razina:</strong> {
                          result.details.market.level === 'EXTREME_PANIC' ? '🔥 Ekstremna panika' :
                          result.details.market.level === 'HIGH_FEAR' ? '🔥 Visoki strah' :
                          result.details.market.level === 'ELEVATED_FEAR' ? '⚠️ Povišeni strah' :
                          result.details.market.level === 'MODERATE' ? '⚠️ Umjeren' :
                          '✅ Normalno'
                        }
                      </p>
                      {result.details.market.polymarketError && (
                        <p className="text-xs text-orange-600 mt-2 italic">
                          {result.details.market.polymarketError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}



          {result && !result.success && (
            <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
              <h3 className="text-xl font-bold text-red-800 mb-2">Greška pri analizi</h3>
              <p className="text-red-700">{result.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
