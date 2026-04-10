const fs = require('fs');

const d = JSON.parse(fs.readFileSync('./lessons.json'));
const perfData = d.performance;

// === replicate evolveThresholds logic exactly ===

function isFiniteNum(n) { return typeof n === 'number' && isFinite(n); }
function avg(arr) { return arr.reduce((s, x) => s + x, 0) / arr.length; }
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx); const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function nudge(current, target, maxChange) {
  const delta = target - current;
  const maxDelta = current * maxChange;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

const MAX_CHANGE_PER_STEP = 0.15;

const winners = perfData.filter(p => p.pnl_pct > 0);
const losers  = perfData.filter(p => p.pnl_pct < -5);
console.log(`winners: ${winners.length}, losers: ${losers.length}`);

// Read current config
const userConfig = JSON.parse(fs.readFileSync('./user-config.json'));
const config = {
  screening: {
    maxVolatility:       userConfig.maxVolatility       ?? null,
    minFeeActiveTvlRatio: userConfig.minFeeActiveTvlRatio ?? 0.12,
    minOrganic:          userConfig.minOrganic          ?? 72,
    minHolders:          userConfig.minHolders          ?? 600,
  }
};

console.log('\n=== Current config values ===');
console.log('maxVolatility:        ', config.screening.maxVolatility, '← null means UNDEFINED in config!');
console.log('minFeeActiveTvlRatio: ', config.screening.minFeeActiveTvlRatio);
console.log('minOrganic:           ', config.screening.minOrganic);

// ── 1. maxVolatility ─────────────────────────────────────────
console.log('\n=== TRACE: maxVolatility ===');
{
  const winnerVols = winners.map(p => p.volatility).filter(isFiniteNum);
  const loserVols  = losers.map(p => p.volatility).filter(isFiniteNum);
  const current    = config.screening.maxVolatility;
  console.log('current:', current, '← if null/undefined, ALL comparisons fail');
  console.log('winnerVols:', winnerVols);
  console.log('loserVols:', loserVols);
  if (loserVols.length >= 2) {
    const loserP25 = percentile(loserVols, 25);
    console.log('loserP25:', loserP25, '< current?', loserP25 < current);
  } else {
    console.log(`loserVols.length=${loserVols.length} < 2 → skip tighten`);
  }
  if (winnerVols.length >= 3 && losers.length === 0) {
    console.log('All winners path: losers.length=', losers.length, '→ skip (need 0 losers)');
  } else {
    console.log(`winnerVols.length=${winnerVols.length}>=3 && losers.length=${losers.length}===0 → FALSE`);
  }
}

// ── 2. minFeeActiveTvlRatio ──────────────────────────────────
console.log('\n=== TRACE: minFeeActiveTvlRatio ===');
{
  const winnerFees = winners.map(p => p.fee_tvl_ratio).filter(isFiniteNum);
  const loserFees  = losers.map(p => p.fee_tvl_ratio).filter(isFiniteNum);
  const current    = config.screening.minFeeActiveTvlRatio;
  console.log('current:', current);
  console.log('winnerFees:', winnerFees.map(f => f.toFixed(4)));
  console.log('loserFees:', loserFees.map(f => f.toFixed(4)));

  if (winnerFees.length >= 2) {
    const minWinnerFee = Math.min(...winnerFees);
    console.log('minWinnerFee:', minWinnerFee.toFixed(4));
    console.log('minWinnerFee > current * 1.2?', minWinnerFee, '>', current * 1.2, '→', minWinnerFee > current * 1.2);
    if (minWinnerFee > current * 1.2) {
      const target = minWinnerFee * 0.85;
      const newVal = clamp(nudge(current, target, MAX_CHANGE_PER_STEP), 0.05, 10.0);
      console.log('  → would raise to:', Number(newVal.toFixed(2)));
    } else {
      console.log('  → BLOCKED: minWinnerFee not high enough above current to trigger raise');
    }
  }

  if (loserFees.length >= 2) {
    const maxLoserFee = Math.max(...loserFees);
    console.log('maxLoserFee:', maxLoserFee.toFixed(4), '< current*1.5?', maxLoserFee < current * 1.5);
  } else {
    console.log(`loserFees.length=${loserFees.length} — only 1 loser, need >=2`);
  }
}

// ── 3. minOrganic ───────────────────────────────────────────
console.log('\n=== TRACE: minOrganic ===');
{
  const loserOrganics  = losers.map(p => p.organic_score).filter(isFiniteNum);
  const winnerOrganics = winners.map(p => p.organic_score).filter(isFiniteNum);
  const current        = config.screening.minOrganic;
  console.log('current:', current);
  console.log('loserOrganics:', loserOrganics, 'winnerOrganics min:', Math.min(...winnerOrganics));
  if (loserOrganics.length >= 2 && winnerOrganics.length >= 1) {
    const avgLoserOrganic = avg(loserOrganics);
    const minWinnerOrganic = Math.min(...winnerOrganics);
    console.log('avgLoserOrganic:', avgLoserOrganic, 'minWinnerOrganic:', minWinnerOrganic);
    console.log('avgLoserOrganic < minWinnerOrganic?', avgLoserOrganic < minWinnerOrganic);
  } else {
    console.log(`loserOrganics.length=${loserOrganics.length} < 2 → skip`);
  }
}
