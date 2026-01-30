import express from 'express';
import { analyzeMarketForDate } from '../services/polymarketService.js';

const router = express.Router();

// GET /api/polymarket/analyze?keyword=trump&date=2024-11-06
router.get('/analyze', async (req, res) => {
  try {
    const { keyword, date } = req.query;
    
    if (!keyword || !date) {
      return res.status(400).json({ 
        error: 'Missing required parameters: keyword and date' 
      });
    }
    
    const result = await analyzeMarketForDate(date, keyword);
    
    res.json(result);
    
  } catch (error) {
    console.error('Polymarket analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze Polymarket',
      message: error.message 
    });
  }
});

export default router; 
