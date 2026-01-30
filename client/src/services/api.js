const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Analiza za specifičan datum i ključnu riječ
 */
export async function analyzeEvent(keyword, date) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, date })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Greška pri analizi');
  }
  
  return response.json();
}

/**
 * Analiza samo Polymarket marketa
 */
export async function analyzePolymarket(keyword, date) {
  const params = new URLSearchParams({ keyword, date });
  const response = await fetch(`${API_BASE_URL}/polymarket/analyze?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Greška pri Polymarket analizi');
  }
  
  return response.json();
}

/**
 * Google Trends analiza
 */
export async function analyzeTrends(keyword, date) {
  const params = new URLSearchParams({ keyword, date });
  const response = await fetch(`${API_BASE_URL}/trends?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Greška pri Trends analizi');
  }
  
  return response.json();
}

/**
 * Batch analiza više događaja
 */
export async function batchAnalyze(events) {
  const response = await fetch(`${API_BASE_URL}/batch/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Greška pri batch analizi');
  }
  
  return response.json();
}

/**
 * Fetch live S&P 500 data
 */
export async function fetchLiveSPX() {
  const response = await fetch(`${API_BASE_URL}/spx/live`); // 🔧 FIXED: API_BASE_URL
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch live S&P 500 data');
  }
  
  return response.json();
}
