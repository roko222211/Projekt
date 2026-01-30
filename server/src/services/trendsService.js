import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Request throttling to avoid rate limiting
let lastRequestTime = 0;
const MIN_INTERVAL = 3000; // 3 seconds between requests

/**
 * Fetch Google Trends data with request throttling
 */
export async function fetchGoogleTrends(keyword, date) {
  // Enforce minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_INTERVAL) {
    const waitTime = MIN_INTERVAL - timeSinceLastRequest;
    console.log(`   ⏳ Throttling: waiting ${waitTime}ms to avoid rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../../python/trends.py');
    const pythonPath = path.join(__dirname, '../../python/venv/Scripts/python.exe');
    
    console.log(`🐍 Calling Python trends service...`);
    console.log(`   Keyword: "${keyword}", Date: ${date}`);
    
    const python = spawn(pythonPath, [pythonScript, keyword, date]);
    
    let dataString = '';
    let errorString = '';
    
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorString += data.toString();
      // Only log actual errors, not info messages
      if (!errorString.includes('"info"')) {
        console.error('⚠️  Python stderr:', data.toString());
      }
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorString}`));
        return;
      }
      
      try {
        const result = JSON.parse(dataString);
        
        if (result.error) {
          // Check if it's a rate limit error
          if (result.error_type === 'rate_limit') {
            console.error('⚠️  Google Trends rate limit reached');
            console.error('   Please wait 5-10 minutes before trying again');
          }
          reject(new Error(result.error));
          return;
        }
        
        console.log('✅ Trends data fetched successfully');
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${dataString}`));
      }
    });
    
    python.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Calculate Google Trends score (0-2 points)
 */
export function calculateTrendsScore(trendsData) {
  if (!trendsData.target_value) {
    return {
      score: 0,
      reason: 'No data available for this date',
      details: null
    };
  }
  
  const allData = trendsData.all_data;
  const targetDate = trendsData.target_date;
  const targetValue = trendsData.target_value;
  
  // Find target index
  const targetIndex = allData.findIndex(d => d.date === targetDate);
  if (targetIndex === -1) {
    return { score: 0, reason: 'Target date not found in data', details: null };
  }
  
  // Get value 7 days before target
  const day7BeforeIndex = targetIndex - 7;
  
  if (day7BeforeIndex < 0) {
    return {
      score: 0,
      reason: 'Insufficient data (need 7 days of history)',
      details: null
    };
  }
  
  const day7BeforeValue = allData[day7BeforeIndex].value;
  const day7BeforeDate = allData[day7BeforeIndex].date;
  
  // Get max value in last 7 days (for decay detection)
  const last7DaysWindow = allData.slice(Math.max(0, targetIndex - 7), targetIndex + 1);
  const maxLast7Days = Math.max(...last7DaysWindow.map(d => d.value));
  const maxDate = last7DaysWindow.find(d => d.value === maxLast7Days)?.date;
  
  // Calculate spike ratio
  const spikeRatio = day7BeforeValue > 0 ? targetValue / day7BeforeValue : 0;
  
  let score = 0;
  let reason = '';
  
  // SPECIAL CASE: High sustained interest (decay scenario)
  // Target value >= 90 AND there was a 100 peak in last 7 days
  if (targetValue >= 90 && maxLast7Days === 100) {
    score = 2;
    reason = `High sustained interest: ${targetValue} (peak of 100 on ${maxDate}, major event detected)`;
  }
  // EXTREME SPIKE: > 4x increase
  else if (spikeRatio > 4) {
    score = 2;
    reason = `Extreme spike: ${targetValue} (${spikeRatio.toFixed(1)}x increase from ${day7BeforeValue} on ${day7BeforeDate})`;
  }
  // SIGNIFICANT SPIKE: 2.5-4x increase
  else if (spikeRatio >= 2.5) {
    score = 1;
    reason = `Significant spike: ${targetValue} (${spikeRatio.toFixed(1)}x increase from ${day7BeforeValue} on ${day7BeforeDate})`;
  }
  // NO SPIKE: < 2.5x
  else {
    score = 0;
    reason = `No spike detected: ${targetValue} (only ${spikeRatio.toFixed(1)}x increase from ${day7BeforeValue} on ${day7BeforeDate})`;
  }
  
  return {
    score,
    reason,
    details: {
      keyword: trendsData.keyword,
      targetDate: targetDate,
      targetValue: targetValue,
      day7Before: {
        date: day7BeforeDate,
        value: day7BeforeValue
      },
      spikeRatio: parseFloat(spikeRatio.toFixed(2)),
      maxLast7Days: maxLast7Days,
      maxDate: maxDate,
      last7DaysValues: last7DaysWindow.map(d => ({ date: d.date, value: d.value }))
    }
  };
}
