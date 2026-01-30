import express from 'express';
import { getSPXScore } from '../services/spxService.js';

const router = express.Router();

// GET /api/spx?date=2024-07-13
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Missing required parameter: date' 
      });
    }
    
    const result = await getSPXScore(date);
    res.json(result);
    
  } catch (error) {
    console.error('S&P 500 error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch S&P 500 data',
      message: error.message 
    });
  }
});

export default router;
