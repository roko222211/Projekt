/**
 * Validation Service - Test VIX/SKEW as Polymarket Proxy
 */

import { getVixSkewScore } from './vixSkewService.js';
import { analyzeMarketForDate } from './polymarketService.js';

export async function validateProxyAccuracy(testCases) {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 PROXY VALIDATION: VIX/SKEW vs POLYMARKET');
  console.log('='.repeat(80));
  console.log(`   Testing ${testCases.length} events from 2023-2024`);
  console.log(`   Objective: Validate VIX/SKEW as pre-2023 proxy`);
  console.log('='.repeat(80) + '\n');
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.date} - "${testCase.keyword}"`);
    console.log('-'.repeat(80));
    
    try {
      const [vixSkew, polymarket] = await Promise.all([
        getVixSkewScore(testCase.date),
        analyzeMarketForDate(testCase.date, testCase.keyword)
      ]);
      
      const vixScore = vixSkew.success ? vixSkew.score : null;
      const polyScore = polymarket.success ? polymarket.score : null;
      const agreement = vixScore === polyScore;
      const scoreDiff = vixScore !== null && polyScore !== null ? Math.abs(vixScore - polyScore) : null;
      
      console.log(`\n   📊 Comparison:`);
      console.log(`      VIX/SKEW Score: ${vixScore}/2 (VIX: ${vixSkew.vix?.value || 'N/A'})`);
      console.log(`      Polymarket Score: ${polyScore}/2 (Volume: $${polymarket.volume?.totalVolume?.toLocaleString() || 'N/A'})`);
      console.log(`      Agreement: ${agreement ? '✅ PERFECT MATCH' : '❌ MISMATCH'} (diff: ${scoreDiff})`);
      
      results.push({
        date: testCase.date,
        keyword: testCase.keyword,
        vixSkewScore: vixScore,
        polymarketScore: polyScore,
        agreement,
        scoreDifference: scoreDiff,
        vixData: { vix: vixSkew.vix?.value, skew: vixSkew.skew?.value },
        polymarketData: {
          volume: polymarket.volume?.totalVolume,
          market: polymarket.market?.question?.substring(0, 100)
        }
      });
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({ date: testCase.date, keyword: testCase.keyword, error: error.message });
    }
  }
  
  const validResults = results.filter(r => r.scoreDifference !== null);
  const perfectMatches = validResults.filter(r => r.agreement).length;
  const offByOne = validResults.filter(r => r.scoreDifference === 1).length;
  const offByTwo = validResults.filter(r => r.scoreDifference === 2).length;
  
  const accuracy = validResults.length > 0 ? (perfectMatches / validResults.length * 100).toFixed(1) : 0;
  const avgDiff = validResults.length > 0 ? (validResults.reduce((sum, r) => sum + r.scoreDifference, 0) / validResults.length).toFixed(2) : 0;
  
  let conclusion = '';
  let recommendation = '';
  
  if (accuracy >= 75) {
    conclusion = '✅ EXCELLENT - VIX/SKEW is a HIGHLY VALID proxy for Polymarket';
    recommendation = 'Safe to use VIX/SKEW for pre-2023 backtesting';
  } else if (accuracy >= 60) {
    conclusion = '⚠️ GOOD - VIX/SKEW is a REASONABLE proxy with some divergence';
    recommendation = 'Use VIX/SKEW for pre-2023 with caveats documented in paper';
  } else {
    conclusion = '❌ LIMITED - VIX/SKEW has WEAK correlation with Polymarket';
    recommendation = 'Consider alternative proxy or limit backtesting to 2023+';
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Total Tests: ${validResults.length}`);
  console.log(`   Perfect Matches (0 diff): ${perfectMatches} (${accuracy}%)`);
  console.log(`   Off by 1: ${offByOne}`);
  console.log(`   Off by 2: ${offByTwo}`);
  console.log(`   Average Difference: ${avgDiff}`);
  console.log(`\n   ${conclusion}`);
  console.log(`   📝 Recommendation: ${recommendation}`);
  console.log('='.repeat(80) + '\n');
  
  return {
    testCases: results,
    statistics: {
      totalTests: validResults.length,
      perfectMatches,
      offByOne,
      offByTwo,
      accuracy: parseFloat(accuracy),
      averageDifference: parseFloat(avgDiff)
    },
    conclusion,
    recommendation
  };
}

// Test cases
const DEFAULT_TEST_CASES = [
  { date: '2023-03-13', keyword: 'SVB Silicon Valley Bank collapse' },
  { date: '2023-05-01', keyword: 'First Republic Bank failure' },
  { date: '2023-10-07', keyword: 'Israel Hamas war Gaza' },
  { date: '2024-03-05', keyword: 'Super Tuesday primary election' },
  { date: '2024-07-13', keyword: 'Trump assassination attempt' },
  { date: '2024-11-06', keyword: 'Trump presidential election 2024' }
];

// MAIN EXECUTION
console.log('🧪 Running validation with default test cases...\n');

validateProxyAccuracy(DEFAULT_TEST_CASES)
  .then(result => {
    console.log('\n📋 FULL VALIDATION REPORT (JSON):');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 FATAL ERROR:', error);
    process.exit(1);
  });
