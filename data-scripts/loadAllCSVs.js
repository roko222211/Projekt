import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../server/.env' });

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// CSV folder path
const CSV_FOLDER = path.join(__dirname, 'stock-csvs');

/**
 * Parse CSV line properly (handles quoted values)
 */
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

/**
 * Parse date from format like "Jan 29, 2026" or "01/29/2026"
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === '-') return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Clean number string (remove M, B, commas, %)
 */
function cleanNumber(str) {
  if (!str || str === '-' || str === '') return null;
  
  // Remove commas and % sign
  str = str.replace(/,/g, '').replace(/%/g, '').trim();
  
  // Handle M (millions)
  if (str.toUpperCase().includes('M')) {
    return parseFloat(str.replace(/M/gi, '')) * 1000000;
  }
  
  // Handle B (billions)
  if (str.toUpperCase().includes('B')) {
    return parseFloat(str.replace(/B/gi, '')) * 1000000000;
  }
  
  // Handle K (thousands)
  if (str.toUpperCase().includes('K')) {
    return parseFloat(str.replace(/K/gi, '')) * 1000;
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Load a single CSV file
 */
async function loadCSV(filePath, ticker) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.log(`   ⚠️  Empty file`);
      return 0;
    }
    
    // Parse header to find column indices
    const headerValues = parseCSVLine(lines[0]);
    
    // Find column indices (case-insensitive)
    const dateIdx = headerValues.findIndex(h => h.toLowerCase() === 'date');
    const priceIdx = headerValues.findIndex(h => h.toLowerCase() === 'price');
    const openIdx = headerValues.findIndex(h => h.toLowerCase() === 'open');
    const highIdx = headerValues.findIndex(h => h.toLowerCase() === 'high');
    const lowIdx = headerValues.findIndex(h => h.toLowerCase() === 'low');
    const volIdx = headerValues.findIndex(h => h.toLowerCase().includes('vol'));
    
    if (dateIdx === -1 || priceIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1) {
      console.log(`   ❌ Missing required columns. Header: ${headerValues.join(', ')}`);
      return 0;
    }
    
    let inserted = 0;
    let skipped = 0;
    let errors = [];
    
    // Parse each row (skip header)
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
      
      // Skip if essential data is missing
      if (!open || !high || !low || !close) {
        skipped++;
        if (errors.length < 3) {
          errors.push(`Row ${i}: open=${open}, high=${high}, low=${low}, close=${close}`);
        }
        continue;
      }
      
      try {
        // Insert into database
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
        if (errors.length < 3) {
          errors.push(`DB error on ${date}: ${dbError.message}`);
        }
        skipped++;
      }
    }
    
    console.log(`   ✅ Inserted: ${inserted} | Skipped: ${skipped}`);
    
    if (errors.length > 0 && inserted === 0) {
      console.log(`   ⚠️  Sample errors:`);
      errors.forEach(err => console.log(`      ${err}`));
    }
    
    return inserted;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return 0;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📥 LOADING STOCK CSVs INTO DATABASE');
  console.log('='.repeat(70));
  console.log(`📂 Folder: ${CSV_FOLDER}\n`);
  
  // Check if folder exists
  if (!fs.existsSync(CSV_FOLDER)) {
    console.error('❌ Folder not found! Create: data-scripts/stock-csvs/');
    await pool.end();
    process.exit(1);
  }
  
  // Get all CSV files
  const files = fs.readdirSync(CSV_FOLDER).filter(f => f.endsWith('.csv'));
  
  if (files.length === 0) {
    console.error('❌ No CSV files found in folder!');
    await pool.end();
    process.exit(1);
  }
  
  console.log(`📊 Found ${files.length} CSV files\n`);
  
  let totalInserted = 0;
  let successCount = 0;
  
  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ticker = file.replace('.csv', '').toUpperCase();
    const filePath = path.join(CSV_FOLDER, file);
    
    console.log(`[${i + 1}/${files.length}] ${ticker}`);
    console.log(`📡 Loading ${ticker}...`);
    
    const inserted = await loadCSV(filePath, ticker);
    
    if (inserted > 0) {
      totalInserted += inserted;
      successCount++;
    }
    
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log('✅ LOADING COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total rows inserted: ${totalInserted.toLocaleString()}`);
  console.log(`Successful files: ${successCount}/${files.length}`);
  
  // Show sample from database
  const result = await pool.query(
    `SELECT ticker, COUNT(*) as row_count, MIN(date) as earliest, MAX(date) as latest
     FROM stock_prices
     GROUP BY ticker
     ORDER BY ticker
     LIMIT 10`
  );
  
  console.log('\n📊 Sample from database:');
  console.log('='.repeat(70));
  result.rows.forEach(row => {
    console.log(`${row.ticker.padEnd(8)} | ${row.row_count} rows | ${row.earliest.toISOString().split('T')[0]} to ${row.latest.toISOString().split('T')[0]}`);
  });
  
  console.log('='.repeat(70) + '\n');
  
  await pool.end();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
