export default function Methodology() {
  return (
    <div className="w-full px-8">
      <h1 className="text-3xl font-bold mb-6">Metodologija & Strategija</h1>
      <p className="text-gray-600 mb-8">
        Kompletan opis istraživanja i trading strategije za Black Swan događaje
      </p>
      
      {/* Abstract */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-semibold mb-4">Sažetak</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          Ovo istraživanje razvija multi-signal sustav za detekciju Black Swan događaja u financijskim tržištima, 
          kombinirajući analizu volatilnosti S&P 500, dinamiku prediction marketa (Polymarket), i pokazatelje javnog 
          interesa (Google Trends).
        </p>
        <p className="text-gray-700 leading-relaxed">
          Događaji sa scorom ≥5/6 klasificiraju se kao Black Swan eventi i aktiviraju momentum strategiju backtestinga 
          za evaluaciju viška prinosa. Cilj je identificirati ekstremne događaje koji stvaraju trading prilike kroz 
          povećanu volatilnost i market dislokaciju.
        </p>
      </section>
      
      {/* Scoring Methodology */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-semibold mb-4">Sustav bodovanja (0-6 bodova)</h2>
        
        <div className="space-y-6">
          {/* S&P 500 */}
          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span>1.</span> 📈 S&P 500 Volatility Signal (0-2 boda)
            </h3>
            <div className="space-y-2 text-gray-700">
              <p className="font-semibold mb-2">Uvjeti za bodovanje:</p>
              <div className="bg-red-50 p-4 rounded-lg space-y-2">
                <p><strong>Extreme volatility (+2 boda):</strong></p>
                <p className="pl-4 text-sm">
                  • Dnevni pomak u top 5% ekstremnih događaja (percentil ≥95%)<br/>
                  • Baziran na 250 trading dana (12 mjeseci) povijesnih podataka<br/>
                  • Pokazuje izuzetnu tržišnu dislokciju
                </p>
                
                <p className="mt-3"><strong>Elevated volatility (+1 bod):</strong></p>
                <p className="pl-4 text-sm">
                  • Dnevni pomak u top 10% (percentil 90-95%)<br/>
                  • Povećana volatilnost ali ne ekstremna
                </p>
                
                <p className="mt-3"><strong>Normal (+0 bodova):</strong></p>
                <p className="pl-4 text-sm">
                  • Percentil &lt; 90%<br/>
                  • Normalna tržišna volatilnost
                </p>
              </div>
              
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <p className="text-sm"><strong>Primjer:</strong> COVID-19 crash (16.3.2020)</p>
                <p className="text-sm text-gray-600">
                  • Dnevni return: -11.98%<br/>
                  • Percentil: 99.6% → <strong>2 boda</strong><br/>
                  • Jedan od najvećih jedodnevnih padova u povijesti
                </p>
              </div>
            </div>
          </div>


          {/* Market Signal (Polymarket or VIX) */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span>2.</span> 📊 Market Sentiment Signal (0-2 boda)
            </h3>
            <div className="space-y-2 text-gray-700">
              <p className="font-semibold mb-2">Primarna metrika: Polymarket (2023+)</p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>Volume spike:</strong></p>
                <p className="pl-4 text-sm">
                  • Dnevni volumen ≥ 3x volumena prethodnog dana: <strong>+1 bod</strong><br/>
                  • Dnevni volumen ≥ 5x volumena prethodnog dana: <strong>+2 boda</strong><br/>
                  • Upućuje na iznenadnu tržišnu aktivnost i pojačano klađenje
                </p>
              </div>
              
              <p className="font-semibold mt-4 mb-2">Fallback metrika: VIX (prije 2023 ili ako Polymarket nedostupan)</p>
              <div className="bg-orange-50 p-4 rounded-lg space-y-2">
                <p><strong>VIX razina:</strong></p>
                <p className="pl-4 text-sm">
                  • VIX ≥ 30: <strong>+2 boda</strong> (ekstremna panika/visoki strah)<br/>
                  • VIX 20-29: <strong>+1 bod</strong> (povišeni strah/umjeren)<br/>
                  • VIX &lt; 20: <strong>0 bodova</strong> (normalno)
                </p>
              </div>
              
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <p className="text-sm"><strong>Primjer 1:</strong> Trump assassination (13.7.2024)</p>
                <p className="text-sm text-gray-600 mb-2">
                  • Polymarket: Volume spike detektiran → <strong>+2 boda</strong><br/>
                  • Ali S&P 500 ostao stabilan (+0.3%), nije sistemski šok
                </p>
                
                <p className="text-sm"><strong>Primjer 2:</strong> COVID-19 (16.3.2020) - VIX fallback</p>
                <p className="text-sm text-gray-600">
                  • VIX: 82.69 (all-time high) → <strong>2 boda</strong><br/>
                  • Pokazuje ekstremnu paniku na tržištima
                </p>
              </div>
            </div>
          </div>


          {/* Google Trends */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span>3.</span> 🔍 Google Trends Signal (0-2 boda)
            </h3>
            <div className="space-y-2 text-gray-700">
              <p className="font-semibold mb-2">Uvjeti za bodovanje:</p>
              <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                <p><strong>Extreme spike (+2 boda):</strong></p>
                <p className="pl-4 text-sm">
                  • Spike ratio &gt; 4x u odnosu na 7 dana prije<br/>
                  • ILI sustained high: vrijednost ≥90 sa peak-om od 100 u zadnjih 7 dana<br/>
                  • Pokazuje masivan porast javnog interesa
                </p>
                
                <p className="mt-3"><strong>Significant spike (+1 bod):</strong></p>
                <p className="pl-4 text-sm">
                  • Spike ratio 2.5x - 4x u odnosu na 7 dana prije<br/>
                  • Umjeren rast javnog interesa
                </p>
                
                <p className="mt-3"><strong>No spike (0 bodova):</strong></p>
                <p className="pl-4 text-sm">
                  • Spike ratio &lt; 2.5x<br/>
                  • Normalna razina zanimanja
                </p>
              </div>
              
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <p className="text-sm"><strong>Primjer:</strong> Trump assassination (13.7.2024)</p>
                <p className="text-sm text-gray-600">
                  • Search interest: 0 → 100 (instant spike)<br/>
                  • 7 dana prije: 0<br/>
                  • Major event detected → <strong>2 boda</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Total Score Interpretation */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-semibold mb-4">Interpretacija ukupnog scorea</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-bold text-red-800 mb-1">Score 5-6/6 → BLACK SWAN!</p>
              <p className="text-sm text-gray-700">
                Ekstremni događaj! Sve tri metrike pokazuju jake signale (ratio ≥83%).
                Sistemska tržišna dislokacija - preporučuje se defensivna pozicija ili hedging strategija.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                <strong>Primjeri:</strong> COVID-19 crash (6/6), 9/11 attacks (6/6), Lehman Brothers collapse (5-6/6)
              </p>
            </div>
          </div>


          <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-800 mb-1">Score 4/6 → POJAČANA AKTIVNOST</p>
              <p className="text-sm text-gray-700">
                Značajan događaj ali ne nužno black swan (ratio 67%). Povećana opreznost potrebna.
                Može biti anticipiran događaj (npr. izbori) ili regionalni šok.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                <strong>Primjeri:</strong> Russia-Ukraine invasion (4/6), Brexit referendum (4/6)
              </p>
            </div>
          </div>


          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-bold text-green-800 mb-1">Score 0-3/6 → NORMALNO</p>
              <p className="text-sm text-gray-700">
                Rutinski događaj ili nema značajnog tržišnog impacta. Standardna trading strategija.
                Event može biti velika vijest (npr. Trump assassination attempt) ali tržišta ostaju mirna.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                <strong>Primjeri:</strong> Fed rate cuts (2/6), Trump election win (3/6), Super Tuesday (1/6)
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Trading Strategy */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-semibold mb-4">Trading strategija</h2>
        
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Ekstremna obrana (Score 5-6/6)</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Kupnja VIX call opcija (hedging protiv volatilnosti)</li>
              <li>Značajno smanjenje equity exposure-a (50%+ cash position)</li>
              <li>Long put opcije na SPY/QQQ (portfolio insurance)</li>
              <li>Povećanje alokacije u zlato, USD i bonds</li>
              <li>Short pozicije na sektorima izloženim šoku (ako identificirani)</li>
            </ul>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-2">2. Oprezno trgovanje (Score 4/6)</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Umjereno smanjenje equity exposure-a (20-30% cash)</li>
              <li>Short-term momentum strategija na sektorima pogođenim događajem</li>
              <li>Prati volume i price action za entry/exit signale</li>
              <li>Tight stop-loss zbog povećane volatilnosti</li>
              <li>Razmotriti protective puts za veće pozicije</li>
            </ul>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-2">3. Normalna alokacija (Score 0-3/6)</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Buy-and-hold strategija (long-term investing)</li>
              <li>Dollar-cost averaging za gradnju pozicija</li>
              <li>Nema potrebe za posebnim hedge pozicijama</li>
              <li>Opportunistic buying na dip-ovima (ako SPX down, ali event nije sistemski)</li>
            </ul>
          </div>
        </div>
      </section>


      {/* Data Sources */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-semibold mb-4">Izvori podataka</h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="font-semibold w-32">S&P 500:</span>
            <div>
              <p className="text-gray-700">Neon PostgreSQL database (Yahoo Finance historical data)</p>
              <p className="text-gray-500 text-xs mt-1">250 trading dana povijesnih podataka za percentil calculation</p>
            </div>
          </div>


          <div className="flex items-start gap-3">
            <span className="font-semibold w-32">Polymarket:</span>
            <div>
              <p className="text-gray-700">Gamma API (market data), The Graph Subgraph (historical volume)</p>
              <p className="text-gray-500 text-xs mt-1">Real-time prediction market data za event-driven analizu (2023+)</p>
            </div>
          </div>


          <div className="flex items-start gap-3">
            <span className="font-semibold w-32">VIX:</span>
            <div>
              <p className="text-gray-700">Yahoo Finance API</p>
              <p className="text-gray-500 text-xs mt-1">Fallback metrika kada Polymarket nedostupan ili prije 2023</p>
            </div>
          </div>


          <div className="flex items-start gap-3">
            <span className="font-semibold w-32">Google Trends:</span>
            <div>
              <p className="text-gray-700">PyTrends API (Python library)</p>
              <p className="text-gray-500 text-xs mt-1">Search interest data sa 9-day window (8 dana prije + target dan)</p>
            </div>
          </div>
        </div>
      </section>


      {/* Limitations */}
      <section className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
        <h2 className="text-2xl font-semibold mb-4 text-yellow-800">Ograničenja sustava</h2>
        
        <ul className="list-disc pl-6 space-y-2 text-gray-700 text-sm">
          <li>
            <strong>Polymarket coverage:</strong> Gemini AI može odbiti markete koji nisu direktno povezani 
            s keywordom, čak i ako postoje povezani eventi. U tom slučaju VIX služi kao fallback.
          </li>
          <li>
            <strong>Weekend events:</strong> Eventi koji se dogode vikendom (npr. Trump assassination u subotu) 
            neće imati SPX podatke za taj dan - sustav koristi najbliži trading dan.
          </li>
          <li>
            <strong>Anticipirani događaji:</strong> Sustav može dati lažno pozitivne signale za velike ali 
            očekivane događaje (npr. predsjednički izbori). Google Trends će pokazati spike, ali SPX i VIX mogu biti normalni.
          </li>
          <li>
            <strong>Keyword ovisnost:</strong> Kvaliteta detekcije ovisi o izboru ključne riječi. 
            Potrebno je poznavanje konteksta događaja i optimizacija keywordova za Google Trends.
          </li>
          <li>
            <strong>Trading execution:</strong> Ovaj sustav je SAMO za detekciju - ne uključuje 
            automatsko izvršavanje tradova, position sizing niti kompletan risk management framework.
          </li>
        </ul>
      </section>


      {/* Footer */}
      <section className="bg-gray-100 p-6 rounded-lg text-center">
        <p className="text-sm text-gray-600 mb-2">
          📚 Ovaj dokument je dio istraživačkog rada o detekciji Black Swan događaja
        </p>
        <p className="text-xs text-gray-500">
          Verzija: 2.1 (3-signal system: SPX + Polymarket/VIX + Trends) • Siječanj 2026
        </p>
      </section>
    </div>
  );
}
