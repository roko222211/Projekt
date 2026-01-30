import express from 'express';
import { fetchGoogleTrends, calculateTrendsScore } from '../services/trendsService.js';

const router = express.Router();

// GET /api/trends?keyword=covid&date=2020-03-16
router.get('/', async (req, res) => {
  try {
    const { keyword, date } = req.query;
    
    if (!keyword || !date) {
      return res.status(400).json({ 
        error: 'Missing required parameters: keyword and date' 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    console.log(`📊 Fetching trends for "${keyword}" on ${date}...`);
    
    const trendsData = await fetchGoogleTrends(keyword, date);
    const scoring = calculateTrendsScore(trendsData);
    
    res.json({
      keyword,
      date,
      trendsData,
      scoring
    });
    
  } catch (error) {
    console.error('Trends API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Google Trends data',
      message: error.message 
    });
  }
});

export default router;
