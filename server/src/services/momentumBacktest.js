import db from '../db/index.js';


const SP100 = [
  'AAPL', 'ABBV', 'ABT', 'ACN', 'ADBE', 'AIG', 'AMD', 'AMGN', 'AMT', 'AMZN',
  'AVGO', 'AXP', 'BA', 'BAC', 'BK', 'BKNG', 'BLK', 'BMY', 'BRK.B', 'C',
  'CAT', 'CL', 'CMCSA', 'COF', 'COP', 'COST', 'CRM', 'CSCO', 'CVS', 'CVX',
  'DE', 'DHR', 'DIS', 'DUK', 'EMR', 'FDX', 'GD', 'GE', 'GILD', 'GM',
  'GOOG', 'GOOGL', 'GS', 'HD', 'HON', 'IBM', 'INTC', 'INTU', 'ISRG', 'JNJ',
  'JPM', 'KO', 'LIN', 'LLY', 'LMT', 'LOW', 'MA', 'MCD', 'MDLZ', 'MDT',
  'MET', 'META', 'MMM', 'MO', 'MRK', 'MS', 'MSFT', 'NEE', 'NFLX', 'NKE',
  'NOW', 'NVDA', 'ORCL', 'PEP', 'PFE', 'PG', 'PLTR', 'PM', 'PYPL', 'QCOM',
  'RTX', 'SBUX', 'SCHW', 'SO', 'SPG', 'T', 'TGT', 'TMO', 'TMUS', 'TSLA',
  'TXN', 'UBER', 'UNH', 'UNP', 'UPS', 'USB', 'V', 'VZ', 'WFC', 'WMT',
  'XOM'
];


const EVENTS = [
  { date: '2020-03-16', name: 'COVID-19 Market Crash', id: 'covid' },
  { date: '2022-11-30', name: 'ChatGPT Launch', id: 'chatgpt' },
  { date: '2025-04-03', name: 'Trump Tariffs', id: 'tariffs' }
];


export async function fetchAndStoreSP100Prices() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 CHECKING S&P 100 DATA IN DATABASE');
  console.log('='.repeat(70));
  
  const stockResult = await db.query(
    `SELECT ticker, COUNT(*) as row_count, MIN(date) as earliest, MAX(date) as latest
     FROM stock_prices 
     GROUP BY ticker
     ORDER BY ticker`
  );
  
  console.log(`\n✅ Found ${stockResult.rows.length} stocks in database`);
  
  const totalStockRows = stockResult.rows.reduce((sum, row) => sum + parseInt(row.row_count), 0);
  
  const sp500Result = await db.query(
    `SELECT COUNT(*) as row_count, MIN(snapshot_date) as earliest, MAX(snapshot_date) as latest
     FROM daily_snapshots`
  );
  
  const sp500Count = parseInt(sp500Result.rows[0].row_count);
  
  console.log('='.repeat(70) + '\n');
  
  return {
    success: stockResult.rows.length,
    total: SP100.length,
    totalDataPoints: totalStockRows,
    sp500Points: sp500Count
  };
}


/**
 * Run momentum backtest with configurable parameters
 * @param {number} momentumDays - Lookback window (3, 5, 10, 20)
 * @param {number} portfolioSize - Number of stocks per side (10, 20, 30, 40, 50)
 */
export async function runMomentumBacktest(momentumDays = 5, portfolioSize = 20) {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 RUNNING MOMENTUM BACKTEST');
  console.log('='.repeat(70));
  console.log(`📊 Strategy: Long Top ${portfolioSize} + Short Bottom ${portfolioSize}`);
  console.log(`📈 Momentum Window: ${momentumDays} days`);
  console.log('📅 Holding Periods: 3m, 6m, 12m\n');
  
  const results = [];
  
  for (const event of EVENTS) {
    console.log('\n' + '='.repeat(70));
    console.log(`📊 ${event.name.toUpperCase()}`);
    console.log('='.repeat(70));
    
    try {
      const result = await backtestSingleEvent(event, momentumDays, portfolioSize);
      results.push(result);
      console.log(`\n✅ ${event.name} - COMPLETE`);
    } catch (error) {
      console.error(`\n❌ ${event.name} - FAILED: ${error.message}`);
      results.push({ event: event.name, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🎉 BACKTEST COMPLETE');
  console.log('='.repeat(70) + '\n');
  
  return results;
}


async function backtestSingleEvent(event, momentumDays, portfolioSize) {
  const eventDate = new Date(event.date);
  const momentumStartDate = addTradingDays(eventDate, -1);  // 🔥 T-1 (dan prije eventa)
  const entryDate = addTradingDays(eventDate, momentumDays);
  const month3 = addMonths(entryDate, 3);
  const month6 = addMonths(entryDate, 6);
  const month12 = addMonths(entryDate, 12);
  
  console.log(`\n📅 Timeline:`);
  console.log(`   Momentum Start (T-1): ${formatDate(momentumStartDate)}`);  // 🔥 NOVO
  console.log(`   Event Date (T): ${formatDate(eventDate)}`);
  console.log(`   Entry (T+${momentumDays}): ${formatDate(entryDate)}`);
  console.log(`   Exit 3m: ${formatDate(month3)}`);
  console.log(`   Exit 6m: ${formatDate(month6)}`);
  console.log(`   Exit 12m: ${formatDate(month12)}`);
  
  console.log(`\n📈 Step 1: Calculating ${momentumDays+1}-day momentum (T-1 to T+${momentumDays})...`);  // 🔥 AŽURIRANO
  
  const stockReturns = await getStockReturnsFromDB(SP100, momentumStartDate, entryDate);  // 🔥 PROMIJENJENO
  
  console.log(`   ✅ Data fetched: ${stockReturns.length}/${SP100.length} stocks`);
  
  if (stockReturns.length < portfolioSize * 2) {
    throw new Error(`Insufficient data: only ${stockReturns.length} stocks available`);
  }
  
  const sorted = stockReturns.sort((a, b) => b.returnPct - a.returnPct);
  
  const longTickers = sorted.slice(0, portfolioSize).map(s => s.ticker);
  const shortTickers = sorted.slice(-portfolioSize).map(s => s.ticker);
  
  console.log(`\n🎯 Step 2: Portfolio Construction`);
  console.log(`   LONG (Top ${portfolioSize}):`);
  sorted.slice(0, 5).forEach((s, idx) => {
    console.log(`      ${(idx+1).toString().padStart(2)}. ${s.ticker.padEnd(6)} +${s.returnPct.toFixed(2)}%`);
  });
  console.log(`      ... (${portfolioSize - 5} more)`);
  console.log(`   SHORT (Bottom ${portfolioSize}):`);
  sorted.slice(-5).reverse().forEach((s, idx) => {
    console.log(`      ${(idx+1).toString().padStart(2)}. ${s.ticker.padEnd(6)} ${s.returnPct.toFixed(2)}%`);
  });
  console.log(`      ... (${portfolioSize - 5} more)`);
  
  const periods = [
    { months: 3, exitDate: month3, label: '3m' },
    { months: 6, exitDate: month6, label: '6m' },
    { months: 12, exitDate: month12, label: '12m' }
  ];
  
  const performance = [];
  
  for (const period of periods) {
    console.log(`\n📊 Step 3: Calculating ${period.label} performance...`);
    
    const perf = await calculatePortfolioPerformance(
      longTickers,
      shortTickers,
      entryDate,
      period.exitDate,
      event.name,
      period.label,
      momentumDays,
      portfolioSize
    );
    
    performance.push({
      period: period.label,
      exitDate: formatDate(period.exitDate),
      ...perf
    });
    
    console.log(`   Portfolio: ${perf.portfolioReturn}% | S&P 500: ${perf.sp500Return}% | Alpha: ${perf.excessReturn}%`);
    console.log(`   Sharpe: ${perf.sharpeRatio} | Win Rate: ${perf.winRate}%`);
  }
  
  return {
    event: event.name,
    eventDate: event.date,
    entryDate: formatDate(entryDate),
    momentumDays,
    portfolioSize,
    longPositions: sorted.slice(0, portfolioSize).map(s => ({ 
      ticker: s.ticker, 
      returnPct: parseFloat(s.returnPct.toFixed(2))
    })),
    shortPositions: sorted.slice(-portfolioSize).reverse().map(s => ({ 
      ticker: s.ticker, 
      returnPct: parseFloat(s.returnPct.toFixed(2))
    })),
    performance
  };
}



async function getStockReturnsFromDB(tickers, startDate, endDate) {
  const results = [];
  
  for (const ticker of tickers) {
    try {
      const data = await db.query(
        `SELECT close, date FROM stock_prices 
         WHERE ticker = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
        [ticker, formatDate(startDate), formatDate(endDate)]
      );
      
      if (data.rows.length < 2) continue;
      
      const startPrice = parseFloat(data.rows[0].close);
      const endPrice = parseFloat(data.rows[data.rows.length - 1].close);
      const returnPct = ((endPrice - startPrice) / startPrice) * 100;
      
      results.push({ ticker, startPrice, endPrice, returnPct });
    } catch (error) {
      console.error(`   ⚠️  ${ticker}: ${error.message}`);
    }
  }
  
  return results;
}


async function calculatePortfolioPerformance(longTickers, shortTickers, entryDate, exitDate, eventName, period, momentumDays, portfolioSize) {
  // Get S&P 500 daily prices
  const sp500Data = await db.query(
    `SELECT snapshot_date, sp500_close FROM daily_snapshots 
     WHERE snapshot_date >= $1 AND snapshot_date <= $2
     ORDER BY snapshot_date ASC`,
    [formatDate(entryDate), formatDate(exitDate)]
  );
  
  if (sp500Data.rows.length < 2) {
    throw new Error('Insufficient S&P 500 data');
  }
  
  // Get daily prices for all stocks
  const longDailyPrices = await getStockDailyPrices(longTickers, entryDate, exitDate);
  const shortDailyPrices = await getStockDailyPrices(shortTickers, entryDate, exitDate);
  
  // Calculate DAILY returns (BASE 100 INDEX)
  const dailyReturns = [];
  let portfolioIndex = 100;  // 🔥 Start at 100
  let sp500Index = 100;      // 🔥 Start at 100
  
  for (let i = 0; i < sp500Data.rows.length; i++) {
    const date = formatDate(sp500Data.rows[i].snapshot_date);
    
    // S&P 500 daily return %
    let sp500DailyReturn = 0;
    if (i > 0) {
      const prevPrice = parseFloat(sp500Data.rows[i - 1].sp500_close);
      const currPrice = parseFloat(sp500Data.rows[i].sp500_close);
      sp500DailyReturn = ((currPrice - prevPrice) / prevPrice) * 100;
      sp500Index = sp500Index * (1 + sp500DailyReturn / 100);  // 🔥 Apply to index
    }
    
    // Portfolio daily return %
    let portfolioDailyReturn = 0;
    let validCount = 0;
    
    // LONG positions - daily change
    for (const ticker of longTickers) {
      const stockData = longDailyPrices[ticker];
      if (stockData && stockData[i] && i > 0 && stockData[i - 1]) {
        const dailyChange = ((stockData[i] - stockData[i - 1]) / stockData[i - 1]) * 100;
        portfolioDailyReturn += dailyChange;
        validCount++;
      }
    }
    
    // SHORT positions - inverted daily change
    for (const ticker of shortTickers) {
      const stockData = shortDailyPrices[ticker];
      if (stockData && stockData[i] && i > 0 && stockData[i - 1]) {
        const dailyChange = -((stockData[i] - stockData[i - 1]) / stockData[i - 1]) * 100;
        portfolioDailyReturn += dailyChange;
        validCount++;
      }
    }
    
    const avgDailyReturn = validCount > 0 ? portfolioDailyReturn / validCount : 0;
    
    if (i > 0) {
      portfolioIndex = portfolioIndex * (1 + avgDailyReturn / 100);  // 🔥 Apply to index
    }
    
    dailyReturns.push({
      date,
      portfolio: parseFloat(portfolioIndex.toFixed(2)),    // 🔥 Index (starts at 100)
      sp500: parseFloat(sp500Index.toFixed(2))             // 🔥 Index (starts at 100)
    });
  }
  
  // Final metrics (calculate from index)
  const finalPortfolioReturn = ((portfolioIndex - 100) / 100) * 100;  // 🔥 Convert back to %
  const finalSP500Return = ((sp500Index - 100) / 100) * 100;          // 🔥 Convert back to %
  const excessReturn = finalPortfolioReturn - finalSP500Return;
  
  // Calculate statistics from daily changes
  const dailyChanges = dailyReturns.slice(1).map((d, i) => {
    const portfolioPctChange = ((d.portfolio - dailyReturns[i].portfolio) / dailyReturns[i].portfolio) * 100;
    const sp500PctChange = ((d.sp500 - dailyReturns[i].sp500) / dailyReturns[i].sp500) * 100;
    return portfolioPctChange - sp500PctChange;
  });
  
  const stdDev = standardDeviation(dailyChanges);
  const sharpeRatio = stdDev > 0 ? (excessReturn / stdDev) * Math.sqrt(252 / dailyChanges.length) : 0;
  
  // Win rate from final position returns
  const longReturns = await getStockReturnsFromDB(longTickers, entryDate, exitDate);
  const shortReturns = await getStockReturnsFromDB(shortTickers, entryDate, exitDate);
  const allReturns = [...longReturns.map(s => s.returnPct), ...shortReturns.map(s => -s.returnPct)];
  const winners = allReturns.filter(r => r > 0).length;
  const winRate = (winners / allReturns.length) * 100;
  
  // Max drawdown (from index values)
  let peak = 100;
  let maxDD = 0;
  for (const day of dailyReturns) {
    if (day.portfolio > peak) peak = day.portfolio;
    const dd = ((peak - day.portfolio) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  
  const positionSize = 1 / (portfolioSize * 2);
  
  // Store in database
  const backtestResult = await db.query(
    `INSERT INTO momentum_backtest_results 
     (event_name, event_date, entry_date, exit_date, period, portfolio_return, sp500_return, excess_return, sharpe_ratio, win_rate, std_dev, max_drawdown, momentum_days, portfolio_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [eventName, formatDate(entryDate), formatDate(entryDate), formatDate(exitDate), period, 
     finalPortfolioReturn, finalSP500Return, excessReturn, sharpeRatio, winRate, stdDev, maxDD, momentumDays, portfolioSize]
  );
  
  const backtestId = backtestResult.rows[0].id;
  
  // Store positions
  for (const stock of longReturns) {
    await db.query(
      `INSERT INTO momentum_positions (backtest_id, ticker, side, entry_price, exit_price, return_pct, position_size)
       VALUES ($1, $2, 'LONG', $3, $4, $5, $6)`,
      [backtestId, stock.ticker, stock.startPrice, stock.endPrice, stock.returnPct, positionSize]
    );
  }
  
  for (const stock of shortReturns) {
    await db.query(
      `INSERT INTO momentum_positions (backtest_id, ticker, side, entry_price, exit_price, return_pct, position_size)
       VALUES ($1, $2, 'SHORT', $3, $4, $5, $6)`,
      [backtestId, stock.ticker, stock.startPrice, stock.endPrice, -stock.returnPct, positionSize]
    );
  }
  
  console.log(`\n🔍 DEBUG - Final Returns:`);
  console.log(`   Portfolio Index: 100 → ${portfolioIndex.toFixed(2)} (${finalPortfolioReturn.toFixed(2)}%)`);
  console.log(`   S&P 500 Index: 100 → ${sp500Index.toFixed(2)} (${finalSP500Return.toFixed(2)}%)`);
  console.log(`   Days calculated: ${dailyReturns.length}`);
  
  return {
    portfolioReturn: finalPortfolioReturn.toFixed(2),
    sp500Return: finalSP500Return.toFixed(2),
    excessReturn: excessReturn.toFixed(2),
    sharpeRatio: sharpeRatio.toFixed(2),
    stdDev: stdDev.toFixed(2),
    maxDrawdown: maxDD.toFixed(2),
    winRate: winRate.toFixed(1),
    winners,
    totalPositions: allReturns.length,
    dailyReturns: dailyReturns  // 🔥 Za chart (sa index vrijednostima)
  };
}


/**
 * Get daily prices for multiple tickers
 */
export async function getStockDailyPrices(tickers, startDate, endDate) {
  const result = {};
  
  for (const ticker of tickers) {
    try {
      const data = await db.query(
        `SELECT date, close FROM stock_prices 
         WHERE ticker = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
        [ticker, formatDate(startDate), formatDate(endDate)]
      );
      
      if (data.rows.length >= 2) {
        result[ticker] = data.rows.map(row => parseFloat(row.close));
      }
    } catch (error) {
      console.error(`   ⚠️  ${ticker}: ${error.message}`);
    }
  }
  
  return result;
}


export async function getBacktestResults() {
  const results = await db.query(
    `SELECT * FROM momentum_backtest_results 
     ORDER BY event_date, 
     CASE period WHEN '3m' THEN 1 WHEN '6m' THEN 2 WHEN '12m' THEN 3 END`
  );
  
  const grouped = {};
  
  for (const row of results.rows) {
    if (!grouped[row.event_name]) {
      const eventDate = new Date(row.event_date);
      const momentumDays = row.momentum_days || 5;
      const portfolioSize = row.portfolio_size || 20;
      const momentumStartDate = addTradingDays(eventDate, -1);  // 🔥 DODAJ OVO
      const entryDate = addTradingDays(eventDate, momentumDays);
      const stockReturns = await getStockReturnsFromDB(SP100, momentumStartDate, entryDate);  // 🔥 PROMIJENI
      const sorted = stockReturns.sort((a, b) => b.returnPct - a.returnPct);
      
      grouped[row.event_name] = {
        event: row.event_name,
        eventDate: row.event_date.toISOString().split('T')[0],
        entryDate: row.entry_date.toISOString().split('T')[0],
        momentumDays,
        portfolioSize,
        longPositions: sorted.slice(0, portfolioSize).map(s => ({ 
          ticker: s.ticker, 
          returnPct: parseFloat(s.returnPct.toFixed(2))
        })),
        shortPositions: sorted.slice(-portfolioSize).reverse().map(s => ({ 
          ticker: s.ticker, 
          returnPct: parseFloat(s.returnPct.toFixed(2))
        })),
        performance: []
      };
    }
    
    grouped[row.event_name].performance.push({
      period: row.period,
      exitDate: row.exit_date.toISOString().split('T')[0],
      portfolioReturn: parseFloat(row.portfolio_return).toFixed(2),
      sp500Return: parseFloat(row.sp500_return).toFixed(2),
      excessReturn: parseFloat(row.excess_return).toFixed(2),
      sharpeRatio: parseFloat(row.sharpe_ratio).toFixed(2),
      stdDev: parseFloat(row.std_dev).toFixed(2),
      maxDrawdown: parseFloat(row.max_drawdown).toFixed(2),
      winRate: parseFloat(row.win_rate).toFixed(1),
      backtestId: row.id
    });
  }
  
  return Object.values(grouped);
}



export async function getBacktestPositions(backtestId) {
  const positions = await db.query(
    `SELECT * FROM momentum_positions 
     WHERE backtest_id = $1 
     ORDER BY return_pct DESC`,
    [backtestId]
  );
  
  return positions.rows;
}


// Helper functions
function addTradingDays(date, days) {
  const result = new Date(date);
  let count = 0;
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) count++;
  }
  return result;
}


function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}


function formatDate(date) {
  return date.toISOString().split('T')[0];
}


function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}


function standardDeviation(arr) {
  if (arr.length === 0) return 0;
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}


function calculateMaxDrawdown(returns) {
  if (returns.length === 0) return 0;
  
  let peak = 100;
  let maxDD = 0;
  
  for (const ret of returns) {
    const value = peak * (1 + ret / 100);
    if (value > peak) peak = value;
    const dd = ((peak - value) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  
  return maxDD;
}
