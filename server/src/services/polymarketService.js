/**
 * Polymarket Service - Improved market selection
 * Strategy: Find markets ACTIVE on target date → Filter by keyword → Gemini selects best
 * FIX: Fetches both active AND closed markets, uses word boundaries for keyword matching
 */

import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const SUBGRAPH_URL = `https://gateway-arbitrum.network.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/Bx1W4S7kDVxs9gC3s2G6DS8kdNBJNVhMviCtin2DiBp`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

// Stopwords to filter out
const STOPWORDS = new Set([
  'us', 'usa', 'uk', 'the', 'will', 'be', 'in', 'of', 'to', 'and', 'or', 
  'for', 'on', 'at', 'by', 'from', 'with', 'an', 'as', 'is', 'are', 'was', 'were',
  'this', 'that', 'these', 'those', 'it', 'its', 'has', 'have', 'had'
]);

/**
 * Calculate semantic keyword score with WORD BOUNDARY matching
 * FIX: "nato" should NOT match "senator"
 */
function calculateKeywordScore(question, keyword) {
  const questionLower = question.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  
  const keywordTokens = keywordLower
    .split(/[\s,]+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
  
  if (keywordTokens.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const token of keywordTokens) {
    // WORD BOUNDARY match (not substring!)
    // Use \b for word boundaries: \btoken\b
    const wordRegex = new RegExp(`\\b${token}\\b`, 'i');
    
    if (wordRegex.test(questionLower)) {
      totalScore += 1.0;
      continue;
    }
    
    // Partial match for LONGER words (≥5 chars) - first 4 chars
    if (token.length >= 5) {
      const prefix = token.substring(0, 4);
      const prefixRegex = new RegExp(`\\b${prefix}\\w*`, 'i');
      
      if (prefixRegex.test(questionLower)) {
        totalScore += 0.5;
        continue;
      }
    }
    
    // Synonym/related term matching (WORD BOUNDARIES)
    const synonyms = {
      'assassination': ['shot', 'kill', 'attack', 'shoot', 'murder', 'attempt'],
      'trump': ['donald', 'president'],
      'covid': ['corona', 'pandemic', 'virus'],
      'war': ['invasion', 'conflict', 'military'],
      'election': ['vote', 'ballot', 'win'],
      'ukraine': ['war', 'invasion', 'conflict'],
      'ChatGPT' : ['OpenAI', 'AI']
    };
    
    if (synonyms[token]) {
      for (const syn of synonyms[token]) {
        const synRegex = new RegExp(`\\b${syn}\\b`, 'i');
        if (synRegex.test(questionLower)) {
          totalScore += 0.7;
          break;
        }
      }
    }
  }
  
  return Math.min(totalScore / keywordTokens.length, 1.0);
}

/**
 * Get markets - fetches BOTH active and closed markets
 * FIX: Was only fetching closed markets, now gets all
 */
export async function getMarketsForDate(date, keyword = null) {
  try {
    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
    
    let allMarkets = [];

    console.log(`🔎 Fetching events from Gamma API...`);

    // ✅ FIX: Fetch BOTH closed AND active markets
    for (const closed of ['false', 'true']) {
      for (const archived of ['false', 'true']) {
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore && offset < 2000) {  // Increased from 500
          const response = await axios.get(`${GAMMA_API_BASE}/events`, {
            params: { 
              limit, 
              offset,
              closed: closed,      // ✅ Now includes both active and closed
              archived: archived,
              order: 'volume',
              ascending: 'false'
            },
            timeout: 10000
          });

          const events = response.data;
          if (!events || events.length === 0) break;

          for (const event of events) {
            if (event.markets && Array.isArray(event.markets)) {
              allMarkets = allMarkets.concat(event.markets);
            }
          }

          offset += limit;
          if (events.length < limit) hasMore = false;
        }
      }
    }

    console.log(`   Total markets fetched: ${allMarkets.length}`);

    // STEP 1: Filter by markets ACTIVE on target date
    const activeMarkets = allMarkets.filter(market => {
      const startDate = market.startDate ? new Date(market.startDate) : null;
      const endDate = market.endDate ? new Date(market.endDate) : null;
      
      if (!startDate || !endDate) return false;
      
      // Market was active if: startDate <= targetDate <= endDate
      return targetDate >= startDate && targetDate <= endDate;
    });

    console.log(`   📅 Markets active on ${date}: ${activeMarkets.length}`);

    // STEP 2: Filter by KEYWORD from active markets
    let relevantMarkets = activeMarkets;
    
    if (keyword) {
      relevantMarkets = activeMarkets.filter(market => {
        const score = calculateKeywordScore(market.question, keyword);
        return score >= 0.1; // Very low threshold - let Gemini decide relevance
      });
      
      console.log(`   🔍 Keyword filter (≥0.1): ${relevantMarkets.length} markets match "${keyword}"`);
    }

    // FALLBACK 1: If no active markets match keyword, try markets that ended ±30 days
    if (relevantMarkets.length === 0 && keyword) {
      console.log(`   ⚠️  No active markets match keyword, trying markets ended ±30 days...`);
      
      const nearbyMarkets = allMarkets.filter(market => {
        const endDate = market.endDate ? new Date(market.endDate) : null;
        if (!endDate) return false;
        
        const daysDiff = Math.abs((endDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 30;
      });
      
      relevantMarkets = nearbyMarkets.filter(market => {
        const score = calculateKeywordScore(market.question, keyword);
        return score >= 0.1;
      });
      
      console.log(`   📊 Found ${relevantMarkets.length} markets ended ±30 days`);
    }

    // FALLBACK 2: If still nothing, try all markets with keyword (no date filter)
    if (relevantMarkets.length === 0 && keyword) {
      console.log(`   ⚠️  No dated markets found, searching all markets for keyword...`);
      
      relevantMarkets = allMarkets.filter(market => {
        const score = calculateKeywordScore(market.question, keyword);
        return score >= 0.15; // Slightly higher threshold for undated search
      });
      
      console.log(`   📊 Found ${relevantMarkets.length} markets matching keyword (any date)`);
    }

    console.log(`📊 Final: ${relevantMarkets.length} relevant markets for analysis`);
    return relevantMarkets;

  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    throw new Error(`Failed to fetch markets: ${error.message}`);
  }
}

/**
 * Gemini selection with improved prompt
 */
export async function selectBestMarket(keyword, markets, date) {
  try {
    if (!markets || markets.length === 0) return null;

    console.log(`🤖 Market Selection Pipeline:`);
    console.log(`   Total available markets: ${markets.length}`);

    // Score all markets
    const scoredMarkets = markets.map(m => {
      const keywordScore = calculateKeywordScore(m.question, keyword);
      const volume = m.volume24hr || 0;
      
      // Check if was active on date
      const startDate = m.startDate ? new Date(m.startDate) : null;
      const endDate = m.endDate ? new Date(m.endDate) : null;
      const targetDate = new Date(date);
      const wasActive = startDate && endDate && targetDate >= startDate && targetDate <= endDate;
      
      return {
        market: m,
        keywordScore,
        volume,
        wasActive
      };
    });

    // Sort by: active markets first, then keyword score, then volume
    const candidates = scoredMarkets
      .sort((a, b) => {
        if (a.wasActive !== b.wasActive) return b.wasActive - a.wasActive;
        if (Math.abs(a.keywordScore - b.keywordScore) > 0.1) return b.keywordScore - a.keywordScore;
        return b.volume - a.volume;
      })
      .slice(0, 20); // Top 20 for Gemini

    console.log(`   📊 Sending top 20 candidates to Gemini`);

    if (candidates.length === 0) {
      throw new Error('No candidates after filtering');
    }

    // Format for Gemini
    const marketList = candidates.map((item, idx) => {
      const m = item.market;
      const vol = (m.volume24hr || 0);
      const volStr = vol > 1000000 ? `$${(vol / 1000000).toFixed(1)}M` : vol > 1000 ? `$${(vol / 1000).toFixed(0)}K` : `$${vol.toFixed(0)}`;
      const endDate = m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : 'N/A';
      const startDate = m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : 'N/A';
      const kwScore = (item.keywordScore * 100).toFixed(0);
      const activeStatus = item.wasActive ? '✅ ACTIVE' : '❌ NOT ACTIVE';
      
      return `${idx + 1}. ${m.question}
   Volume: ${volStr} | Active: ${startDate} to ${endDate}
   Status on ${date}: ${activeStatus} | Keyword Match: ${kwScore}%`;
    }).join('\n\n');

    const prompt = `You are a Polymarket prediction market analyst. Select the MOST RELEVANT market for this query:

**EVENT:** "${keyword}"
**DATE:** ${date}

**CRITICAL RULES:**
1. The market MUST be directly about "${keyword}" - not tangentially related
2. Prefer markets that were ACTIVE on ${date} (marked with ✅)
3. If NO market is truly relevant, return marketIndex: 0
4. Focus on SEMANTIC RELEVANCE over volume or keyword score

**EXAMPLES:**
- Query: "NATO" → Good: "Will NATO invoke Article 5?" ✅
- Query: "NATO" → Bad: "Will Finland join NATO?" ❌ (too specific/different event)
- Query: "Trump assassination" → Good: "Will Trump survive assassination attempt?" ✅
- Query: "Trump assassination" → Bad: "Trump sentenced to prison?" ❌ (different topic)

**CANDIDATES:**
${marketList}

Return ONLY this JSON (no markdown):

{
  "marketIndex": <0-${candidates.length}>,
  "confidence": "high|medium|low",
  "reasoning": "<max 150 chars>"
}

**marketIndex 0 = NO RELEVANT MARKET** - use if uncertain!`;

    console.log(`   🤖 Asking Gemini AI to select...`);

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini did not return valid JSON');

    const selection = JSON.parse(jsonMatch[0]);
    
    // Check if Gemini rejected all
    if (selection.marketIndex === 0) {
      console.error(`\n   ❌ GEMINI REJECTED ALL MARKETS`);
      console.error(`   Reason: "${selection.reasoning}"`);
      throw new Error(`No relevant market found for "${keyword}". Gemini: ${selection.reasoning}`);
    }
    
    // Validate index
    if (!selection.marketIndex || selection.marketIndex < 1 || selection.marketIndex > candidates.length) {
      selection.marketIndex = 1;
      selection.confidence = 'medium';
      selection.reasoning = 'Auto-selected by relevance score';
    }

    const selectedItem = candidates[selection.marketIndex - 1];
    const selectedMarket = selectedItem.market;

    console.log(`   ✅ Selected: "${selectedMarket.question.substring(0, 80)}..."`);
    console.log(`   📊 Volume (24hr): $${(selectedMarket.volume24hr || 0).toLocaleString()}`);
    console.log(`   🎯 Keyword Score: ${selectedItem.keywordScore.toFixed(2)}`);
    console.log(`   📅 Was Active: ${selectedItem.wasActive ? 'YES' : 'NO'}`);
    console.log(`   💬 Gemini: ${selection.confidence} - "${selection.reasoning}"`);

    return {
      ...selectedMarket,
      gemini_confidence: selection.confidence,
      gemini_reasoning: selection.reasoning,
      keyword_score: selectedItem.keywordScore,
      was_active: selectedItem.wasActive,
      selection_method: 'gemini_semantic'
    };

  } catch (error) {
    console.error(`❌ Market selection failed: ${error.message}`);
    throw error;
  }
}



  async function getAllTransactions(type, startTimestamp, endTimestamp) {
    let allTx = [];
    let hasMore = true;
    let skip = 0;

    while (hasMore && skip < 10000) {
      const query = {
        query: `{
          ${type}(
            first: 1000,
            skip: ${skip},
            where: { timestamp_gte: "${startTimestamp}", timestamp_lte: "${endTimestamp}" },
            orderBy: timestamp,
            orderDirection: desc
          ) { id timestamp amount }
        }`
      };

      try {
        const res = await axios.post(SUBGRAPH_URL, query, { timeout: 15000 });
        if (res.data.errors) break;

        const txs = res.data.data?.[type] || [];
        allTx = allTx.concat(txs);
        skip += 1000;

        if (txs.length < 1000) hasMore = false;
      } catch (error) {
        console.error(`   Error fetching ${type}:`, error.message);
        break;
      }
    }

    return allTx;
  }

  export async function getMarketVolume(conditionId, date) {
    try {
      if (!conditionId) throw new Error('conditionId required');

      const targetDate = new Date(date);
      const startTimestamp = Math.floor(targetDate.getTime() / 1000);
      const endTimestamp = startTimestamp + 86399;

      const [splits, merges] = await Promise.all([
        getAllTransactions('splits', startTimestamp, endTimestamp),
        getAllTransactions('merges', startTimestamp, endTimestamp)
      ]);

      const splitVolume = splits.reduce((sum, tx) => sum + parseInt(tx.amount), 0) / 1e6;
      const mergeVolume = merges.reduce((sum, tx) => sum + parseInt(tx.amount), 0) / 1e6;
      const totalVolume = splitVolume + mergeVolume;

      return {
        date,
        conditionId,
        splitVolume: parseFloat(splitVolume.toFixed(2)),
        mergeVolume: parseFloat(mergeVolume.toFixed(2)),
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        transactionCount: splits.length + merges.length,
        splits: splits.length,
        merges: merges.length
      };

    } catch (error) {
      console.error('❌ Error fetching volume:', error.message);
      throw new Error(`Failed to fetch volume: ${error.message}`);
    }
  }

  /**
   * Fetch intraday price change from Polymarket CLOB API
   */
  async function getIntradayPriceChange(conditionId, date) {
    try {
      const targetDate = new Date(date);
      
      // Get market info
      const marketUrl = `https://gamma-api.polymarket.com/markets/${conditionId}`;
      const marketRes = await axios.get(marketUrl, { timeout: 10000 });
      const market = marketRes.data;
      
      if (!market || !market.clobTokenIds || market.clobTokenIds.length === 0) {
        return null;
      }
      
      const tokenId = market.clobTokenIds[0];
      
      // ✅ FIX: Use correct timestamp format (seconds, not milliseconds)
      const startTs = Math.floor(targetDate.setHours(0, 0, 0, 0) / 1000);
      const endTs = Math.floor(targetDate.setHours(23, 59, 59, 999) / 1000);
      
      // CLOB API v2 endpoint
      const candlesUrl = `https://clob.polymarket.com/prices-history`;
      const candlesRes = await axios.get(candlesUrl, {
        params: {
          market: tokenId,
          startTs: startTs,
          endTs: endTs,
          fidelity: 60,  // 60-minute candles
          interval: '1h'  // ✅ Added explicit interval
        },
        timeout: 10000
      });
      
      const candles = candlesRes.data?.history || [];
      
      if (candles.length === 0) return null;
      
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];
      
      const startPrice = parseFloat(firstCandle.o);
      const endPrice = parseFloat(lastCandle.c);
      const priceChange = Math.abs(endPrice - startPrice);
      
      return { startPrice, endPrice, priceChange, tradeCount: candles.length };
      
    } catch (error) {
      console.warn(`   ⚠️  Could not fetch price change: ${error.message}`);
      return null;
    }
  }




  /**
   * Calculate advanced score based on volume ratio + price change
   */
  
  async function calculateAdvancedScore(conditionId, date, todayVolume) {
    let score = 0;
    const details = {
      volumeSpike: false,
      volumeRatio: null
    };

    console.log(`\n📊 Calculating Score (Volume Spike Only)...`);

    // Volume spike (today vs yesterday)
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    try {
      const yesterdayData = await getMarketVolume(conditionId, yesterdayStr);
      
      if (yesterdayData.totalVolume > 0) {
        const volumeRatio = todayVolume / yesterdayData.totalVolume;
        details.volumeRatio = volumeRatio;
        
        console.log(`   📈 Volume Comparison:`);
        console.log(`      Yesterday: $${yesterdayData.totalVolume.toLocaleString()}`);
        console.log(`      Today: $${todayVolume.toLocaleString()}`);
        console.log(`      Ratio: ${volumeRatio.toFixed(2)}x`);
        
        if (volumeRatio >= 5) {
          score = 2;
          details.volumeSpike = true;
          console.log(`      ✅ EXTREME volume spike! (+2 points)`);
        } else if (volumeRatio >= 3) {
          score = 1;
          details.volumeSpike = true;
          console.log(`      ✅ Significant volume spike! (+1 point)`);
        } else {
          console.log(`      ℹ️  No significant volume spike (need ≥3x for 1pt, ≥5x for 2pts)`);
        }
      } else {
        console.log(`   ⚠️  Yesterday had zero volume, skipping volume comparison`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not fetch yesterday's volume: ${error.message}`);
    }

    console.log(`\n   🎯 Final Score: ${score}/2`);
    console.log(`      Volume Spike: ${details.volumeSpike ? '✅' : '❌'}`);
    console.log(`      Threshold: ${score === 2 ? '≥5x (EXTREME)' : score === 1 ? '≥3x (SIGNIFICANT)' : '<3x (NORMAL)'}`);

    return { score, details };
  }


  export async function analyzeMarketForDate(date, keyword) {
    const startTime = Date.now();

    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔍 POLYMARKET ANALYSIS`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   Date: ${date}`);
      console.log(`   Keywords: "${keyword}"`);
      console.log(`${'='.repeat(70)}\n`);

      // Fetch markets with user keywords
      const markets = await getMarketsForDate(date, keyword);
      
      if (markets.length === 0) {
        throw new Error(`No relevant markets found for ${date}`);
      }

      // Select best market
      const selectedMarket = await selectBestMarket(keyword, markets, date);
      
      if (!selectedMarket || !selectedMarket.conditionId) {
        throw new Error('No suitable market found');
      }

      // Fetch volume
      console.log(`\n📈 Fetching volume from The Graph Subgraph...`);
      console.log(`   Condition ID: ${selectedMarket.conditionId.substring(0, 20)}...`);
      
      const volumeData = await getMarketVolume(selectedMarket.conditionId, date);
      
      console.log(`   Fetched ${volumeData.splits} splits and ${volumeData.merges} merges`);
      console.log(`✅ Total Volume: ${volumeData.totalVolume.toLocaleString()} USDC`);

      // Calculate advanced score
      const { score, details } = await calculateAdvancedScore(
        selectedMarket.conditionId, 
        date, 
        volumeData.totalVolume
      );
      
      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

      const result = {
        success: true,
        date,
        keyword,
        market: {
          question: selectedMarket.question,
          conditionId: selectedMarket.conditionId,
          confidence: selectedMarket.gemini_confidence,
          reasoning: selectedMarket.gemini_reasoning,
          relevanceScore: selectedMarket.relevance_score
        },
        volume: volumeData,
        score,
        scoreDetails: {
          volumeSpike: details.volumeSpike,
          volumeRatio: details.volumeRatio ? parseFloat(details.volumeRatio.toFixed(2)) : null,
          priceSwing: details.priceSwing,
          priceChange: details.priceChange ? parseFloat((details.priceChange * 100).toFixed(2)) : null
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: `${executionTime}s`,
          totalMarkets: markets.length
        }
      };

      console.log(`\n${'='.repeat(70)}`);
      console.log(`✅ ANALYSIS COMPLETE`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   Score: ${score}/2 ${score === 2 ? '🔥 BLACK SWAN!' : score === 1 ? '⚠️ ELEVATED' : '✅ NORMAL'}`);
      console.log(`   Volume: ${volumeData.totalVolume.toLocaleString()} USDC`);
      console.log(`   Transactions: ${volumeData.transactionCount.toLocaleString()}`);
      console.log(`   Execution Time: ${executionTime}s`);
      console.log(`${'='.repeat(70)}\n`);

      return result;

    } catch (error) {
      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.error(`\n${'='.repeat(70)}`);
      console.error(`❌ ANALYSIS FAILED`);
      console.error(`${'='.repeat(70)}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Execution Time: ${executionTime}s`);
      console.error(`${'='.repeat(70)}\n`);

      return {
        success: false,
        error: error.message,
        date,
        keyword,
        metadata: { timestamp: new Date().toISOString(), executionTime: `${executionTime}s` }
      };
    }
  }

  // DEBUG function - list all markets for inspection
 // DEBUG function - list all markets for inspection
export async function debugListMarkets(date, keyword) {
  const targetDate = new Date(date);
  let allMarkets = [];

  console.log(`🔎 Fetching events from Gamma API...`);

  // ✅ FIX: Fetch BOTH active and closed markets
  for (const closed of ['false', 'true']) {
    for (const archived of ['false', 'true']) {
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore && offset < 2000) {
        const response = await axios.get(`${GAMMA_API_BASE}/events`, {
          params: { 
            limit, 
            offset,
            closed: closed,  // ✅ Now includes both active and closed
            archived: archived,
            order: 'volume',
            ascending: 'false'
          },
          timeout: 10000
        });

        const events = response.data;
        if (!events || events.length === 0) break;

        for (const event of events) {
          if (event.markets && Array.isArray(event.markets)) {
            allMarkets = allMarkets.concat(event.markets);
          }
        }

        offset += limit;
        if (events.length < limit) hasMore = false;
      }
    }
  }

  console.log(`   Total markets fetched: ${allMarkets.length}`);

  // ✅ FIX: Use calculateKeywordScore() instead of .includes()
  const keywordFiltered = allMarkets.filter(market => {
    const score = calculateKeywordScore(market.question, keyword);
    return score >= 0.1;  // Same threshold as main function
  });

  console.log(`   🔍 Keyword filter: ${keywordFiltered.length} markets match "${keyword}"\n`);
  
  console.log(`🔍 DEBUG: All ${keywordFiltered.length} keyword-matched markets:\n`);
  
  keywordFiltered.forEach((m, idx) => {
    const startDate = m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : 'N/A';
    const endDate = m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : 'N/A';
    
    // Check if active on target date
    const start = m.startDate ? new Date(m.startDate) : null;
    const end = m.endDate ? new Date(m.endDate) : null;
    const wasActive = start && end && targetDate >= start && targetDate <= end;
    const marker = wasActive ? '✅ ACTIVE' : '❌ NOT ACTIVE';
    
    console.log(`${idx + 1}. ${marker} ${m.question}`);
    console.log(`   Start: ${startDate} | End: ${endDate} | Vol24h: $${(m.volume24hr || 0).toLocaleString()}\n`);
  });
}


  // CLI
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    const date = args[0];
    const keyword = args[1];
    
    if (args.includes('--debug')) {
      debugListMarkets(date, keyword)
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Error:', err);
          process.exit(1);
        });
    } else {
      analyzeMarketForDate(date, keyword)
        .then(result => {
          console.log('📋 FINAL RESULT (JSON):');
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        });
    }
  } else if (args.length > 0) {
    console.error('❌ Usage: node polymarketService.js <date> <keyword> [--debug]');
    process.exit(1);
  }
