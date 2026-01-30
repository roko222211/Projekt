import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * GET /api/spx/live
 * Fetches real-time S&P 500 data from Yahoo Finance
 */
router.get('/live', async (req, res) => {
  try {
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC',
      {
        params: {
          interval: '1d',
          range: '5d'
        },
        timeout: 10000
      }
    );
    
    const result = response.data?.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        error: 'No data returned from Yahoo Finance' 
      });
    }

    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    // Get current price and previous close
    const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1];
    const previousClose = meta.chartPreviousClose;
    
    // Calculate daily return
    const dailyReturn = ((currentPrice - previousClose) / previousClose) * 100;
    
    // Check if market is open
    const now = Math.floor(Date.now() / 1000);
    const isOpen = meta.currentTradingPeriod?.regular?.start < now &&
                   meta.currentTradingPeriod?.regular?.end > now;
    
    res.json({
      success: true,
      data: {
        price: parseFloat(currentPrice.toFixed(2)),
        previousClose: parseFloat(previousClose.toFixed(2)),
        change: parseFloat((currentPrice - previousClose).toFixed(2)),
        changePercent: parseFloat(dailyReturn.toFixed(2)),
        isOpen,
        timestamp: new Date().toISOString(),
        timezone: meta.exchangeTimezoneName || 'America/New_York'
      }
    });
    
  } catch (error) {
    console.error('Error fetching live SPX:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch live S&P 500 data',
      message: error.message 
    });
  }
});

export default router;
