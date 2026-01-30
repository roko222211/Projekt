/**
 * VIX/SKEW Service - Market fear and tail risk analysis
 * Scoring: 0-2 points based on VIX levels and SKEW index
 * Used as fallback when Polymarket is unavailable
 */

import axios from 'axios';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_KEY = process.env.FRED_API_KEY || 'your_fred_api_key'; // Optional: add to .env

/**
 * Fetch VIX data from FRED or alternative source
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<number>} VIX close value
 */
async function fetchVIXData(date) {
  try {
    // For now, use Yahoo Finance as alternative
    // VIX symbol: ^VIX
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX`;
    
    const targetDate = new Date(date);
    const period1 = Math.floor(targetDate.getTime() / 1000) - 86400; // Day before
    const period2 = Math.floor(targetDate.getTime() / 1000) + 86400; // Day after
    
    const response = await axios.get(yahooUrl, {
      params: {
        period1,
        period2,
        interval: '1d'
      },
      timeout: 10000
    });
    
    const result = response.data?.chart?.result?.[0];
    if (!result || !result.indicators?.quote?.[0]?.close) {
      throw new Error('No VIX data available');
    }
    
    const closes = result.indicators.quote[0].close;
    const vixClose = closes.find(c => c !== null);
    
    if (!vixClose) {
      throw new Error('No valid VIX close price');
    }
    
    return parseFloat(vixClose.toFixed(2));
    
  } catch (error) {
    console.error(`   ⚠️  Could not fetch VIX data: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch SKEW data
 * Note: SKEW is harder to get - may need premium data source
 * For now, return null (optional metric)
 */
async function fetchSKEWData(date) {
  try {
    // SKEW is not easily available via free APIs
    // Would need CBOE data subscription or Bloomberg
    // For MVP, we'll skip this or use estimated values
    
    console.log(`   ℹ️  SKEW data not available (requires premium source)`);
    return null;
    
  } catch (error) {
    console.error(`   ⚠️  Could not fetch SKEW data: ${error.message}`);
    return null;
  }
}

/**
 * Calculate VIX/SKEW score
 * @param {string} date - Target date (YYYY-MM-DD)
 * @returns {Promise<Object>} Score and details
 */
export async function getVixSkewScore(date) {
  const startTime = Date.now();
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 VIX/SKEW ANALYSIS (Fallback Metric)`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Date: ${date}`);
    console.log(`${'='.repeat(70)}\n`);
    
    console.log(`🔎 Fetching VIX data...`);
    
    // Fetch VIX
    const vixClose = await fetchVIXData(date);
    
    console.log(`   VIX Close: ${vixClose}`);
    
    // Scoring logic
    let score = 0;
    let vixLevel = 'NORMAL';
    const details = {
      vixSpike: false,
      skewSpike: false,
      vixValue: vixClose,
      skewValue: null
    };
    
    // VIX thresholds:
    // < 15: Low volatility (complacent market)
    // 15-20: Normal
    // 20-30: Elevated
    // 30-40: High fear
    // > 40: Extreme panic
    
    if (vixClose >= 40) {
      score = 2;
      vixLevel = 'EXTREME_PANIC';
      details.vixSpike = true;
    } else if (vixClose >= 30) {
      score = 2;
      vixLevel = 'HIGH_FEAR';
      details.vixSpike = true;
    } else if (vixClose >= 25) {
      score = 1;
      vixLevel = 'ELEVATED_FEAR';
      details.vixSpike = true;
    } else if (vixClose >= 20) {
      score = 1;
      vixLevel = 'MODERATE';
    }
    
    // Try to fetch SKEW (optional)
    try {
      const skewValue = await fetchSKEWData(date);
      if (skewValue !== null) {
        details.skewValue = skewValue;
        
        // SKEW > 140 indicates tail risk
        if (skewValue >= 145) {
          score = Math.min(score + 1, 2); // Add 1, cap at 2
          details.skewSpike = true;
        }
      }
    } catch (err) {
      // SKEW is optional, continue without it
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ ANALYSIS COMPLETE`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   VIX: ${vixClose} (${vixLevel})`);
    console.log(`   Score: ${score}/2 ${score === 2 ? '🔥' : score === 1 ? '⚠️' : '✅'}`);
    console.log(`   Execution Time: ${executionTime}s`);
    console.log(`${'='.repeat(70)}\n`);
    
    return {
      success: true,
      date,
      score,
      level: vixLevel,
      details,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: `${executionTime}s`
      }
    };
    
  } catch (error) {
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ ANALYSIS FAILED`);
    console.error(`${'='.repeat(70)}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Execution Time: ${executionTime}s`);
    console.error(`${'='.repeat(70)}\n`);
    
    return {
      success: false,
      error: error.message,
      date,
      score: 0,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: `${executionTime}s`
      }
    };
  }
}

// CLI Test
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const isDirectExecution = process.argv[1] === __filename;

if (isDirectExecution) {
  const args = process.argv.slice(2);
  if (args.length >= 1) {
    const date = args[0];
    
    getVixSkewScore(date)
      .then(result => {
        console.log('📋 FINAL RESULT (JSON):');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('💥 FATAL ERROR:', error);
        process.exit(1);
      });
  } else {
    console.error('❌ Usage: node vixSkewService.js <date>');
    console.error('   Example: node vixSkewService.js "2020-03-16"');
    process.exit(1);
  }
}
