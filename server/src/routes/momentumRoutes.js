import express from 'express';
import db from '../db/index.js';
import { 
  fetchAndStoreSP100Prices, 
  runMomentumBacktest, 
  getBacktestResults,
  getBacktestPositions,
  getStockDailyPrices  // 🔥 DODANO!
} from '../services/momentumBacktest.js';

const router = express.Router();

router.post('/fetch-stocks', async (req, res) => {
  try {
    const result = await fetchAndStoreSP100Prices();
    res.json({
      success: true,
      message: 'Stock prices fetched successfully',
      data: result
    });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/run-backtest', async (req, res) => {
  try {
    const { momentumDays = 5, portfolioSize = 20 } = req.body;
    
    const validMomentumDays = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const validPortfolioSizes = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    
    if (!validMomentumDays.includes(momentumDays)) {
      return res.status(400).json({
        success: false,
        error: `Invalid momentum window: ${momentumDays}. Must be between 3-20 days.`
      });
    }
    
    if (!validPortfolioSizes.includes(portfolioSize)) {
      return res.status(400).json({
        success: false,
        error: `Invalid portfolio size: ${portfolioSize}. Must be 5, 10, 15, 20, 25, 30, 35, 40, 45, or 50.`
      });
    }
    
    console.log(`\n🔧 API received: ${momentumDays}d momentum, ${portfolioSize} positions per side\n`);
    
    const results = await runMomentumBacktest(momentumDays, portfolioSize);
    
    res.json({
      success: true,
      message: `Backtest completed with ${momentumDays}d momentum, ${portfolioSize*2} positions`,
      config: { momentumDays, portfolioSize },
      data: results
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/results', async (req, res) => {
  try {
    const results = await getBacktestResults();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/positions/:backtestId', async (req, res) => {
  try {
    const { backtestId } = req.params;
    const positions = await getBacktestPositions(backtestId);
    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error('Error getting positions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/clear-results', async (req, res) => {
  try {
    await db.query('TRUNCATE TABLE momentum_positions CASCADE');
    await db.query('TRUNCATE TABLE momentum_backtest_results CASCADE');
    
    console.log('✅ All backtest results cleared from database');
    
    res.json({
      success: true,
      message: 'All backtest results cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔥 CHART DATA ENDPOINT - sa index baziranim na 100
router.get('/chart-data/:backtestId', async (req, res) => {
  try {
    const { backtestId } = req.params;
    
    console.log(`📊 Chart data requested for backtest ID: ${backtestId}`);
    
    const backtest = await db.query(
      `SELECT * FROM momentum_backtest_results WHERE id = $1`,
      [backtestId]
    );
    
    if (backtest.rows.length === 0) {
      console.log(`❌ Backtest ${backtestId} not found`);
      return res.status(404).json({ success: false, error: 'Backtest not found' });
    }
    
    const { entry_date, exit_date } = backtest.rows[0];
    
    // Get positions
    const positions = await db.query(
      `SELECT ticker, side FROM momentum_positions WHERE backtest_id = $1`,
      [backtestId]
    );
    
    const longTickers = positions.rows.filter(p => p.side === 'LONG').map(p => p.ticker);
    const shortTickers = positions.rows.filter(p => p.side === 'SHORT').map(p => p.ticker);
    
    console.log(`   Long: ${longTickers.length}, Short: ${shortTickers.length}`);
    
    // Get daily stock prices
    const longDailyPrices = await getStockDailyPrices(longTickers, entry_date, exit_date);
    const shortDailyPrices = await getStockDailyPrices(shortTickers, entry_date, exit_date);
    
    // Get S&P 500 data
    const sp500Data = await db.query(
      `SELECT snapshot_date, sp500_close FROM daily_snapshots 
       WHERE snapshot_date >= $1 AND snapshot_date <= $2
       ORDER BY snapshot_date ASC`,
      [entry_date, exit_date]
    );
    
    const chartData = [];
    let portfolioIndex = 100;  // 🔥 Start at 100
    let sp500Index = 100;      // 🔥 Start at 100
    
    for (let i = 0; i < sp500Data.rows.length; i++) {
      const date = sp500Data.rows[i].snapshot_date.toISOString().split('T')[0];
      
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
      
      // LONG positions
      for (const ticker of longTickers) {
        const stockData = longDailyPrices[ticker];
        if (stockData && stockData[i] && i > 0 && stockData[i - 1]) {
          const dailyChange = ((stockData[i] - stockData[i - 1]) / stockData[i - 1]) * 100;
          portfolioDailyReturn += dailyChange;
          validCount++;
        }
      }
      
      // SHORT positions
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
      
      chartData.push({
        date,
        portfolio: parseFloat(portfolioIndex.toFixed(2)),    // 🔥 Index value
        sp500: parseFloat(sp500Index.toFixed(2))             // 🔥 Index value
      });
    }
    
    console.log(`✅ Chart data generated: ${chartData.length} days`);
    console.log(`   Portfolio: 100 → ${portfolioIndex.toFixed(2)}`);
    console.log(`   S&P 500: 100 → ${sp500Index.toFixed(2)}`);
    
    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('❌ Error getting chart data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
