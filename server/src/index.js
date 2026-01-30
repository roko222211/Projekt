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

// CORS - allow frontend origin
const allowedOrigins = [
  'http://localhost:5173',
  'https://projekt-zeta-seven.vercel.app'  // ✅ Hardcoded production URL
];

console.log('🔍 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS request from:', origin);
    
    // Allow requests with no origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed');
      callback(null, true);
    } else {
      console.error('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
