/**
 * S&P 500 Service - Daily return volatility analysis
 * Scoring: 0-2 points based on percentile rank (rolling 12-month window)
 * 
 * HISTORICAL: Target return + Rolling window from PostgreSQL
 * TODAY: Target return from Yahoo Finance (LIVE) + Rolling window from PostgreSQL
 */

import pool from '../db/index.js';
import axios from 'axios';

/**
 * Fetch live S&P 500 data from Yahoo Finance (TODAY ONLY)
 */
async function fetchLiveSPXReturn() {
  try {
    console.log(`   🔴 Fetching LIVE data from Yahoo Finance...`);
    
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC',
      {
        params: { interval: '1d', range: '5d' },
        timeout: 10000
      }
    );
    
    const result = response.data?.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose;
    
    const dailyReturn = ((currentPrice - previousClose) / previousClose) * 100;
    
    // Check if market is currently open
    const now = Math.floor(Date.now() / 1000);
    const isOpen = meta.currentTradingPeriod?.regular?.start < now &&
                   meta.currentTradingPeriod?.regular?.end > now;
    
    console.log(`   ✅ Live data fetched successfully`);
    console.log(`   Market Status: ${isOpen ? '🟢 OPEN' : '🔴 CLOSED'}`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`   Previous Close: $${previousClose.toFixed(2)}`);
    console.log(`   Daily Return: ${dailyReturn.toFixed(4)}%`);
    
    return {
      dailyReturn: parseFloat(dailyReturn.toFixed(4)),
      closePrice: currentPrice,
      previousClose,
      isMarketOpen: isOpen
    };
    
  } catch (error) {
    throw new Error(`Yahoo Finance fetch failed: ${error.message}`);
  }
}

/**
 * Get next trading day if date falls on weekend
 */
function getNextTradingDay(dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z');
  const dayOfWeek = date.getUTCDay();
  
  if (dayOfWeek === 0) { // Sunday → Monday
    date.setUTCDate(date.getUTCDate() + 1);
  } else if (dayOfWeek === 6) { // Saturday → Monday
    date.setUTCDate(date.getUTCDate() + 2);
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Get day of week name
 */
function getDayName(dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Try to find valid trading date (handles weekends and holidays)
 */
async function findValidTradingDate(date) {
  let currentDate = date;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const adjustedDate = getNextTradingDay(currentDate);
    
    const result = await pool.query(
      'SELECT snapshot_date FROM daily_snapshots WHERE snapshot_date = $1',
      [adjustedDate]
    );
    
    if (result.rows.length > 0) {
      return {
        date: adjustedDate,
        isAdjusted: adjustedDate !== date,
        originalDate: date,
        attempts: attempts + 1
      };
    }
    
    const nextDate = new Date(adjustedDate + 'T12:00:00Z');
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    currentDate = nextDate.toISOString().split('T')[0];
    attempts++;
  }
  
  throw new Error(`No trading data found for ${date} or the following ${maxAttempts} days`);
}

/**
 * Get S&P 500 score for a specific date
 * @param {string} date - Target date (YYYY-MM-DD)
 * @returns {Promise<Object>} Analysis result
 */
export async function getSPXScore(date) {
  const startTime = Date.now();
  const originalDate = date;
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📈 S&P 500 ANALYSIS`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Date: ${originalDate} (${getDayName(originalDate)})`);
    console.log(`${'='.repeat(70)}\n`);
    
    // ==========================================
    // STEP 1: Check if date is TODAY
    // ==========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date + 'T12:00:00Z');
    targetDate.setHours(0, 0, 0, 0);
    
    const isToday = targetDate.getTime() === today.getTime();
    
    let targetReturn, targetClose, dataSource, isMarketOpen, tradingDateInfo;
    
    if (isToday) {
      // ==========================================
      // TODAY: Get return from Yahoo Finance LIVE
      // ==========================================
      console.log(`🔴 TARGET DATE IS TODAY`);
      console.log(`   Mode: LIVE DATA (Yahoo Finance)\n`);
      
      try {
        const liveData = await fetchLiveSPXReturn();
        targetReturn = liveData.dailyReturn;
        targetClose = liveData.closePrice;
        isMarketOpen = liveData.isMarketOpen;
        dataSource = 'Yahoo Finance (Live)';
        
      } catch (liveError) {
        console.error(`   ⚠️  ${liveError.message}`);
        console.log(`   ⚠️  Falling back to latest database record...\n`);
        
        // Fallback: Use most recent database entry
        const fallbackQuery = `
          SELECT snapshot_date, sp500_close, sp500_return
          FROM daily_snapshots
          ORDER BY snapshot_date DESC
          LIMIT 1
        `;
        
        const fallbackResult = await pool.query(fallbackQuery);
        
        if (fallbackResult.rows.length === 0) {
          throw new Error('No live data and no recent database records available');
        }
        
        const fallbackData = fallbackResult.rows[0];
        targetReturn = parseFloat(fallbackData.sp500_return);
        targetClose = parseFloat(fallbackData.sp500_close);
        dataSource = `Database Fallback (${fallbackData.snapshot_date})`;
        
        console.log(`   Using latest available: ${fallbackData.snapshot_date}`);
        console.log(`   Close Price: $${targetClose.toFixed(2)}`);
        console.log(`   Daily Return: ${targetReturn.toFixed(4)}%\n`);
      }
      
    } else {
      // ==========================================
      // HISTORICAL: Get return from PostgreSQL
      // ==========================================
      console.log(`🔎 HISTORICAL DATE`);
      console.log(`   Mode: DATABASE (PostgreSQL)\n`);
      
      // Check if weekend/holiday and find valid trading date
      tradingDateInfo = await findValidTradingDate(date);
      
      if (tradingDateInfo.isAdjusted) {
        console.log(`📅 DATE ADJUSTMENT`);
        console.log(`   Original: ${originalDate} (${getDayName(originalDate)})`);
        console.log(`   Adjusted: ${tradingDateInfo.date} (${getDayName(tradingDateInfo.date)})`);
        console.log(`   Reason: ${getDayName(originalDate).includes('S') ? 'Weekend' : 'Market Holiday'}`);
        console.log(`   Attempts: ${tradingDateInfo.attempts}\n`);
      }
      
      date = tradingDateInfo.date; // Use adjusted date
      
      console.log(`   Fetching from Neon database...`);
      
      // Get target date return from database
      const targetQuery = `
        SELECT snapshot_date, sp500_close, sp500_return
        FROM daily_snapshots
        WHERE snapshot_date = $1
      `;
      
      const targetResult = await pool.query(targetQuery, [date]);
      
      if (targetResult.rows.length === 0) {
        throw new Error(`No data found for date: ${date}`);
      }
      
      const targetData = targetResult.rows[0];
      targetReturn = parseFloat(targetData.sp500_return);
      targetClose = parseFloat(targetData.sp500_close);
      dataSource = 'Neon PostgreSQL';
      
      console.log(`   Close Price: $${targetClose.toFixed(2)}`);
      console.log(`   Daily Return: ${targetReturn.toFixed(4)}%\n`);
    }
    
    // ==========================================
    // STEP 2: Get rolling window from DATABASE
    // (SAME FOR BOTH TODAY AND HISTORICAL)
    // ==========================================
    console.log(`📊 Calculating percentile rank...`);
    console.log(`   Fetching 12-month rolling window from database...`);
    
    // Use current date for TODAY, adjusted date for HISTORICAL
    const referenceDate = isToday ? new Date().toISOString().split('T')[0] : date;
    
    const windowQuery = `
      SELECT 
        snapshot_date,
        sp500_return,
        ABS(sp500_return) as abs_return
      FROM daily_snapshots
      WHERE snapshot_date < $1
        AND snapshot_date >= $1::date - INTERVAL '365 days'
      ORDER BY snapshot_date DESC
      LIMIT 252
    `;
    
    const windowResult = await pool.query(windowQuery, [referenceDate]);
    
    if (windowResult.rows.length < 100) {
      throw new Error('Insufficient historical data (need at least 100 trading days)');
    }
    
    console.log(`   Historical window: ${windowResult.rows.length} trading days`);
    console.log(`   Window: ${windowResult.rows[windowResult.rows.length - 1].snapshot_date} to ${windowResult.rows[0].snapshot_date}`);
    
    // ==========================================
    // STEP 3: Calculate percentile rank
    // ==========================================
    const returns = windowResult.rows.map(row => parseFloat(row.sp500_return));
    const absTargetReturn = Math.abs(targetReturn);
    
    // Sort by absolute return value
    const sortedAbsReturns = returns.map(r => Math.abs(r)).sort((a, b) => a - b);
    
    // Find rank
    let rank = 0;
    for (const absRet of sortedAbsReturns) {
      if (absRet < absTargetReturn) rank++;
    }
    
    const percentile = (rank / sortedAbsReturns.length) * 100;
    
    console.log(`   Percentile rank: ${percentile.toFixed(2)}%`);
    
    // ==========================================
    // STEP 4: Scoring logic
    // ==========================================
    let score = 0;
    let level = 'NORMAL';
    
    if (percentile >= 95) {
      score = 2;
      level = 'EXTREME_VOLATILITY';
    } else if (percentile >= 90) {
      score = 1;
      level = 'ELEVATED_VOLATILITY';
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ ANALYSIS COMPLETE`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Data Source: ${dataSource}`);
    console.log(`   Daily Return: ${targetReturn.toFixed(4)}%`);
    console.log(`   Percentile: ${percentile.toFixed(2)}%`);
    console.log(`   Score: ${score}/2 (${level})`);
    console.log(`   ${score === 2 ? '🔥 EXTREME!' : score === 1 ? '⚠️ ELEVATED' : '✅ NORMAL'}`);
    if (isToday && isMarketOpen !== undefined) {
      console.log(`   Market: ${isMarketOpen ? '🟢 CURRENTLY OPEN' : '🔴 CLOSED'}`);
    }
    console.log(`   Execution Time: ${executionTime}s`);
    console.log(`${'='.repeat(70)}\n`);
    
    return {
      success: true,
      date: originalDate,
      tradingDate: isToday ? originalDate : (tradingDateInfo?.date || date),
      dateAdjusted: isToday ? false : (tradingDateInfo?.isAdjusted || false),
      adjustmentReason: isToday ? null : 
        (tradingDateInfo?.isAdjusted ? 
          (getDayName(originalDate).includes('S') ? 'Weekend' : 'Market Holiday') : null),
      dailyReturn: parseFloat(targetReturn.toFixed(4)),
      percentileRank: parseFloat(percentile.toFixed(2)),
      score,
      level,
      details: {
        closePrice: targetClose,
        historicalPeriod: `${windowResult.rows.length} trading days (12 months)`,
        windowStart: windowResult.rows[windowResult.rows.length - 1].snapshot_date,
        windowEnd: windowResult.rows[0].snapshot_date,
        dataSource,
        isLive: isToday,
        isMarketOpen: isMarketOpen || null
      },
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
      date: originalDate,
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
    
    getSPXScore(date)
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
    console.error('❌ Usage: node spxService.js <date>');
    console.error('   Example (historical): node spxService.js "2020-03-16"');
    console.error('   Example (today): node spxService.js "2026-01-29"');
    process.exit(1);
  }
}
