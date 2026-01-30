import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../server/.env' });

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CSV_FOLDER = path.join(__dirname, 'stock-csvs');

// SAMO OVA 3 TICKERA
const TICKERS_TO_RELOAD = ['AMD', 'IBM', 'TMUS'];

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === '-') return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function cleanNumber(str) {
  if (!str || str === '-' || str === '') return null;
  str = str.replace(/,/g, '').replace(/%/g, '').trim();
  
  if (str.toUpperCase().includes('M')) {
    return parseFloat(str.replace(/M/gi, '')) * 1000000;
  }
  if (str.toUpperCase().includes('B')) {
    return parseFloat(str.replace(/B/gi, '')) * 1000000000;
  }
  if (str.toUpperCase().includes('K')) {
    return parseFloat(str.replace(/K/gi, '')) * 1000;
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function loadCSV(filePath, ticker) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.log(`   ⚠️  Empty file`);
      return 0;
    }
    
    const headerValues = parseCSVLine(lines[0]);
    const dateIdx = headerValues.findIndex(h => h.toLowerCase() === 'date');
    const priceIdx = headerValues.findIndex(h => h.toLowerCase() === 'price');
    const openIdx = headerValues.findIndex(h => h.toLowerCase() === 'open');
    const highIdx = headerValues.findIndex(h => h.toLowerCase() === 'high');
    const lowIdx = headerValues.findIndex(h => h.toLowerCase() === 'low');
    const volIdx = headerValues.findIndex(h => h.toLowerCase().includes('vol'));
    
    if (dateIdx === -1 || priceIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1) {
      console.log(`   ❌ Missing columns`);
      return 0;
    }
    
    let inserted = 0;
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      if (values.length < 6) {
        skipped++;
        continue;
      }
      
      const dateStr = values[dateIdx];
      const date = parseDate(dateStr);
      
      if (!date) {
        skipped++;
        continue;
      }
      
      const close = cleanNumber(values[priceIdx]);
      const open = cleanNumber(values[openIdx]);
      const high = cleanNumber(values[highIdx]);
      const low = cleanNumber(values[lowIdx]);
      const volume = volIdx !== -1 ? cleanNumber(values[volIdx]) : null;
      
      if (!open || !high || !low || !close) {
        skipped++;
        continue;
      }
      
      try {
        await pool.query(
          `INSERT INTO stock_prices (ticker, date, open, high, low, close, volume)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (ticker, date) DO UPDATE SET
             open = EXCLUDED.open,
             high = EXCLUDED.high,
             low = EXCLUDED.low,
             close = EXCLUDED.close,
             volume = EXCLUDED.volume`,
          [ticker, date, open, high, low, close, volume || 0]
        );
        inserted++;
      } catch (dbError) {
        skipped++;
      }
    }
    
    console.log(`   ✅ Inserted: ${inserted} | Skipped: ${skipped}`);
    return inserted;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 RELOADING SPECIFIC TICKERS');
  console.log('='.repeat(70));
  console.log(`Tickers to reload: ${TICKERS_TO_RELOAD.join(', ')}\n`);
  
  // First, delete old data
  console.log('🗑️  Deleting old data...');
  for (const ticker of TICKERS_TO_RELOAD) {
    const result = await pool.query(
      'DELETE FROM stock_prices WHERE ticker = $1',
      [ticker]
    );
    console.log(`   Deleted ${result.rowCount} rows for ${ticker}`);
  }
  
  console.log('\n📥 Loading new data...\n');
  
  let totalInserted = 0;
  
  for (let i = 0; i < TICKERS_TO_RELOAD.length; i++) {
    const ticker = TICKERS_TO_RELOAD[i];
    const filePath = path.join(CSV_FOLDER, `${ticker}.csv`);
    
    console.log(`[${i + 1}/${TICKERS_TO_RELOAD.length}] ${ticker}`);
    console.log(`📡 Loading ${ticker}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ File not found: ${ticker}.csv\n`);
      continue;
    }
    
    const inserted = await loadCSV(filePath, ticker);
    totalInserted += inserted;
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log('✅ RELOAD COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total rows inserted: ${totalInserted.toLocaleString()}`);
  console.log('='.repeat(70) + '\n');
  
  await pool.end();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
