import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pool from './index.js';

async function importSP500Data() {
  try {
    console.log('📊 Reading S&P 500 CSV file...');
    
    // Čitaj CSV file
    const csvContent = fs.readFileSync('S&P 500 Historical Data.csv', 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true // Handle BOM character
    });
    
    console.log(`📈 Found ${records.length} records`);
    
    // Transform i sortiraj podatke (najstariji prvo)
    const data = records
      .map(row => {
        // Parse date from MM/DD/YYYY to YYYY-MM-DD
        const [month, day, year] = row.Date.split('/');
        const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Remove commas from price string
        const price = parseFloat(row.Price.replace(/,/g, ''));
        
        return { date, price };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sortiraj uzlazno
    
    console.log('💾 Calculating returns and inserting into database...');
    
    // Calculate daily returns i insert
    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const previous = i > 0 ? data[i - 1] : null;
      
      // Daily return calculation
      const dailyReturn = previous 
        ? ((current.price - previous.price) / previous.price) * 100
        : 0;
      
      // Calculate percentile (last 252 trading days = ~12 months)
      let percentile = null;
      if (i >= 252) {
        const last252Returns = data
          .slice(i - 252, i)
          .map((d, idx) => {
            const prev = data[i - 252 + idx - 1];
            return prev ? ((d.price - prev.price) / prev.price) * 100 : 0;
          })
          .filter(r => r !== 0)
          .sort((a, b) => a - b);
        
        const position = last252Returns.findIndex(r => r >= dailyReturn);
        percentile = position !== -1 
          ? Math.round((position / last252Returns.length) * 100)
          : 100;
      }
      
      // Insert into database
      await pool.query(
        `INSERT INTO daily_snapshots (snapshot_date, sp500_close, sp500_return, sp500_percentile)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (snapshot_date) DO UPDATE 
         SET sp500_close = $2, sp500_return = $3, sp500_percentile = $4`,
        [current.date, current.price, dailyReturn.toFixed(6), percentile]
      );
      
      if ((i + 1) % 100 === 0) {
        console.log(`  ✅ Processed ${i + 1}/${data.length} records`);
      }
    }
    
    console.log('✅ S&P 500 data import completed!');
    
    // Show some stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        MIN(snapshot_date) as first_date,
        MAX(snapshot_date) as last_date,
        AVG(sp500_return) as avg_return,
        MIN(sp500_return) as min_return,
        MAX(sp500_return) as max_return
      FROM daily_snapshots
    `);
    
    console.log('\n📊 Database Statistics:');
    console.log(stats.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importSP500Data();
