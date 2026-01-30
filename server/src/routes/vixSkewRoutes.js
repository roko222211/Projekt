// src/routes/vixSkewRoutes.js

import express from 'express';
import { getVixSkewScore } from '../services/vixSkewService.js';

const router = express.Router();

// GET /api/vix-skew?date=2020-03-16
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Missing required parameter: date' 
      });
    }
    
    const result = await getVixSkewScore(date);
    res.json(result);
    
  } catch (error) {
    console.error('VIX/SKEW error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch VIX/SKEW',
      message: error.message 
    });
  }
});

export default router;
