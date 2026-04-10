const fs = require('fs');

const d = JSON.parse(fs.readFileSync('./lessons.json'));
const perfData = d.performance;

console.log('Total performance entries:', perfData.length);

const winners = perfData.filter(p => p.pnl_pct > 0);
const losers  = perfData.filter(p => p.pnl_pct < -5);
const neutral = perfData.filter(p => p.pnl_pct >= -5 && p.pnl_pct <= 0);

console.log('Winners (pnl_pct > 0):', winners.length);
console.log('Losers  (pnl_pct < -5):', losers.length);
console.log('Neutral (-5 to 0):', neutral.length);

const hasSignal = winners.length >= 2 || losers.length >= 2;
console.log('\nhasSignal:', hasSignal, '-- evolve needs winners>=2 OR losers>=2');

console.log('\nAll pnl_pct values:');
perfData.forEach((p, i) => {
  const name = (p.pool_name || p.pool?.slice(0,8) || '?').padEnd(18);
  console.log(`  [${String(i).padStart(2)}] ${name} pnl_pct=${String(p.pnl_pct ?? 'null').padStart(8)}  organic=${p.organic_score ?? 'null'}  fee_tvl=${p.fee_tvl_ratio ?? 'null'}  volatility=${p.volatility ?? 'null'}`);
});

console.log('\n--- Field availability ---');
console.log('Has volatility:    ', perfData.filter(p => p.volatility    != null).length, '/', perfData.length);
console.log('Has fee_tvl_ratio: ', perfData.filter(p => p.fee_tvl_ratio != null).length, '/', perfData.length);
console.log('Has organic_score: ', perfData.filter(p => p.organic_score != null).length, '/', perfData.length);

console.log('\n--- suspiciousUnitMix check (records that would be SKIPPED) ---');
perfData.forEach((p, i) => {
  const sus =
    p.initial_value_usd >= 20 &&
    p.amount_sol >= 0.25 &&
    p.final_value_usd > 0 &&
    p.final_value_usd <= p.amount_sol * 2;
  if (sus) console.log(`  [${i}] ${p.pool_name} WOULD BE SKIPPED: initial=${p.initial_value_usd}, final=${p.final_value_usd}, sol=${p.amount_sol}`);
});
