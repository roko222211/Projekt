import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import trendsRoutes from './routes/trendsRoutes.js';
import polymarketTestRoutes from './routes/polymarketRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import vixSkewRoutes from './routes/vixSkewRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import spxLiveRoutes from './routes/spxLiveRoutes.js';
import momentumRoutes from './routes/momentumRoutes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/trends', trendsRoutes);
app.use('/api/polymarket', polymarketTestRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/vix-skew', vixSkewRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/spx', spxLiveRoutes);
app.use('/api/momentum', momentumRoutes);





// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Black Swan API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes will be added here

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});


// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      status: 'Database connected!',
      time: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database connection failed',
      error: error.message 
    });
  }
});