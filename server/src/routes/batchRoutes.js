// src/routes/batchRoutes.js

import express from 'express';
import { analyzeMarketForDate } from '../services/polymarketService.js';

const router = express.Router();

// POST /api/batch/polymarket
// Body: { events: [{ keyword, date }, ...] }
router.post('/polymarket', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ 
        error: 'Invalid request. Expected: { events: [{ keyword, date }, ...] }' 
      });
    }
    
    console.log(`\n📦 BATCH PROCESSING: ${events.length} events`);
    
    const results = [];
    
    // Sequential to avoid rate limits
    for (let i = 0; i < events.length; i++) {
      const { keyword, date } = events[i];
      console.log(`\n[${i + 1}/${events.length}] Processing: ${date} - "${keyword}"`);
      
      try {
        const result = await analyzeMarketForDate(date, keyword);
        results.push(result);
        
        // Rate limit: 2 seconds between requests
        if (i < events.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        results.push({
          success: false,
          date,
          keyword,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      totalEvents: events.length,
      successful,
      failed: events.length - successful,
      results
    });
    
  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({ 
      error: 'Batch processing failed',
      message: error.message 
    });
  }
});

export default router;
