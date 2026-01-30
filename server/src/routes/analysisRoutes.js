import express from 'express';
import { analyzeMarketForDate } from '../services/polymarketService.js';
import { fetchGoogleTrends, calculateTrendsScore } from '../services/trendsService.js';
import { getSPXScore } from '../services/spxService.js';
import { getVixSkewScore } from '../services/vixSkewService.js'; // 🔧 NEW

const router = express.Router();

/**
 * POST /api/analyze
 * Body: { keyword: string, date: string (YYYY-MM-DD) }
 * Returns: Combined Black Swan score (0-6)
 * Market metric: Polymarket (primary) or VIX/SKEW (fallback)
 */
router.post('/', async (req, res) => {
  const requestStart = Date.now();
  
  try {
    const { keyword, date } = req.body;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🦢 BLACK SWAN DETECTION REQUEST`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Keyword: "${keyword}"`);
    console.log(`   Date: ${date}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Validation
    if (!keyword || !date) {
      console.error('❌ Missing parameters');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters: keyword and date',
        received: { keyword: !!keyword, date: !!date }
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      console.error('❌ Invalid date format');
      return res.status(400).json({ 
        success: false,
        error: 'Invalid date format. Expected: YYYY-MM-DD',
        received: date
      });
    }
    
    console.log(`🚀 Executing parallel analysis (S&P 500 + Polymarket + Trends)...`);
    
    // STEP 1: Execute S&P 500, Polymarket, and Google Trends in parallel
    const [spxResult, polymarketResult, trendsData] = await Promise.all([
      getSPXScore(date).catch(err => {
        console.error('⚠️  S&P 500 analysis failed:', err.message);
        return { success: false, error: err.message, score: 0 };
      }),
      analyzeMarketForDate(date, keyword).catch(err => {
        console.error('⚠️  Polymarket analysis failed:', err.message);
        return { success: false, error: err.message, score: 0 };
      }),
      fetchGoogleTrends(keyword, date).catch(err => {
        console.error('⚠️  Google Trends failed:', err.message);
        return null;
      })
    ]);
    
    // Calculate Trends score
    let trendsResult;
    try {
      trendsResult = trendsData ? calculateTrendsScore(trendsData) : { score: 0, reason: 'Data unavailable' };
    } catch (err) {
      console.error('⚠️  Trends scoring failed:', err.message);
      trendsResult = { score: 0, reason: 'Scoring failed' };
    }
    
    // STEP 2: VIX/SKEW fallback if Polymarket failed
    let marketMetric = {
      source: 'polymarket',
      result: polymarketResult
    };
    
    if (!polymarketResult.success) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔄 FALLBACK: Polymarket unavailable, using VIX/SKEW`);
      console.log(`${'='.repeat(80)}`);
      console.log(`   Polymarket error: ${polymarketResult.error}`);
      console.log(`${'='.repeat(80)}\n`);
      
      const vixSkewResult = await getVixSkewScore(date).catch(err => {
        console.error('⚠️  VIX/SKEW fallback also failed:', err.message);
        return { success: false, error: err.message, score: 0 };
      });
      
      marketMetric = {
        source: 'vix_skew',
        result: vixSkewResult,
        polymarketError: polymarketResult.error
      };
    }
    
    // Combined scoring (MAX 6/6)
    const combinedScore = {
      spx: spxResult.success ? spxResult.score : 0, 
      market: marketMetric.result.success ? marketMetric.result.score : 0,
      trends: trendsResult.score || 0,
      total: (spxResult.success ? spxResult.score : 0) + 
             (marketMetric.result.success ? marketMetric.result.score : 0) + 
             (trendsResult.score || 0),
      maxPossible: 6,
      marketSource: marketMetric.source // 'polymarket' or 'vix_skew'
    };
    
    // Determine event classification
    const ratio = combinedScore.total / combinedScore.maxPossible;
    let classification = 'NORMAL';
    let emoji = '✅';
    
    if (ratio >= 0.83) {        // 5-6/6
      classification = 'BLACK_SWAN';
      emoji = '🔥';
    } else if (ratio >= 0.67) { // 4/6
      classification = 'ELEVATED';
      emoji = '⚠️';
    }
    
    const executionTime = ((Date.now() - requestStart) / 1000).toFixed(2);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${emoji} ANALYSIS COMPLETE - ${classification}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Total Score: ${combinedScore.total}/${combinedScore.maxPossible}`);
    console.log(`   S&P 500: ${combinedScore.spx}/2 ${spxResult.success ? '✓' : '✗'}`);
    console.log(`   Market (${marketMetric.source.toUpperCase()}): ${combinedScore.market}/2 ${marketMetric.result.success ? '✓' : '✗'}`);
    console.log(`   Google Trends: ${combinedScore.trends}/2 ${trendsResult.score !== undefined ? '✓' : '✗'}`);
    console.log(`   Execution Time: ${executionTime}s`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Build response
    const response = {
      success: true,
      date,
      keyword,
      classification,
      scores: combinedScore,
      details: {
        spx: spxResult,
        market: {
          source: marketMetric.source,
          ...marketMetric.result,
          ...(marketMetric.polymarketError && { 
            polymarketError: marketMetric.polymarketError 
          })
        },
        trends: {
          data: trendsData,
          scoring: trendsResult
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: `${executionTime}s`,
        successfulMetrics: [
          spxResult.success,
          marketMetric.result.success,
          trendsResult.score !== undefined
        ].filter(Boolean).length
      }
    };
    
    res.json(response);
    
  } catch (error) {
    const executionTime = ((Date.now() - requestStart) / 1000).toFixed(2);
    
    console.error(`\n${'='.repeat(80)}`);
    console.error(`💥 CRITICAL ERROR`);
    console.error(`${'='.repeat(80)}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`   Execution Time: ${executionTime}s`);
    console.error(`${'='.repeat(80)}\n`);
    
    res.status(500).json({ 
      success: false,
      error: 'Analysis failed',
      message: error.message,
      executionTime: `${executionTime}s`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analyze/test
 * Health check for analysis pipeline
 */
router.get('/test', async (req, res) => {
  try {
    res.json({
      status: 'OK',
      message: 'Analysis endpoint is ready',
      availableMetrics: ['S&P 500', 'Polymarket (primary)', 'VIX/SKEW (fallback)', 'Google Trends'],
      maxScore: 6,
      scoring: {
        'S&P 500': '0-2 points (volatility percentile)',
        'Market': '0-2 points (Polymarket or VIX/SKEW)',
        'Google Trends': '0-2 points (search interest spike)'
      },
      exampleRequest: {
        method: 'POST',
        endpoint: '/api/analyze',
        body: {
          keyword: 'Trump assassination attempt',
          date: '2024-07-13'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message 
    });
  }
});

export default router;
