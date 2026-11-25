// Run: node calculator/test/engine.test.js
const E = require('../app/src/main/assets/engine.js');
let bad = 0;
function t(src, want, env = {}) {
  let got;
  try {
    const r = E.evaluate(src, env);
    if (r.kind === 'solve') got = E.describe(r.sol, r.v) + ' | ' + E.setBuilder(r.sol, r.v) + ' | ' + E.intervalNotation(r.sol);
    else if (r.kind === 'truth') got = String(r.ok);
    else if (r.kind === 'simplify') got = E.text(r.result);
    else got = E.isQ(r.value) ? E.qText(r.value, false) : E.fmtFloat(r.value);
    if (process.env.V) for (const s of r.steps || []) console.log('     ', s.why, s.m ? '⟶ ' + E.text(s.m) : '', s.m2 ? '⟶ ' + E.text(s.m2) : '', s.table ? JSON.stringify(s.table) : '', s.list ? s.list.map(E.text).join(' ; ') : '');
  } catch (e) { got = 'ERR ' + e.message; if (!(e instanceof E.MathError)) console.log(e.stack); }
  const ok = want instanceof RegExp ? want.test(got) : got.startsWith(want);
  if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', src.padEnd(28), '→', got, ok ? '' : '   (wanted ' + want + ')');
}
// the homework in the photos
t('2(x+1) <= 4x-11', 'x ≥ 6.5 | {x : x ≥ 6.5, x ∈ ℝ} | [6.5, ∞)');
t('sqrt(14/(x+3)) <= 1', 'x ≥ 11 | {x : x ≥ 11, x ∈ ℝ} | [11, ∞)');
t('(2x-1)/4 < 5', 'x < 10.5 | {x : x < 10.5, x ∈ ℝ}');
t('(-5x-7)/3 >= 6', 'x ≤ −5');
t('(n+2)/3 < (5n-1)/4', 'n > 1 | {n : n > 1, n ∈ ℝ} | (1, ∞)');
t('b < 4', 'b < 4');
t('-3 <= n', 'n ≥ −3');
t('2 < k', 'k > 2');
t('k <= -5', 'k ≤ −5');
t('-4 >= k', 'k ≤ −4');
t('-4 <= x', 'x ≥ −4');
t('1 > n', 'n < 1');
t('-1 > x', 'x < −1');
// more
t('14/(x+3) <= 1', 'x < −3 or x ≥ 11');
t('-3 < 2x+1 <= 7', '−2 < x ≤ 3');
t('5 > 1-2x >= -3', '−2 < x ≤ 2');
t('2x+3 = 11', 'x = 4 | {4}');
t('x^2-5x+6 > 0', 'x < 2 or x > 3');
t('x^2 = 2', /x = −√\(2\) or x = √\(2\)/);
t('x^2-x-1 <= 0', /\(1 − √\(5\)\)\/2 ≤ x ≤ \(1 \+ √\(5\)\)\/2/);
t('x^2+1 < 0', 'no solution');
t('(x-2)^2 >= 0', 'all real numbers');
t('2x+1 < 2x+3', 'all real numbers');
t('x/3 + x/2 = 5', 'x = 6');
t('sqrt(x) = 3', 'x = 9');
t('sqrt(x-1) > -2', 'x ≥ 1');
t('6/x = 3', 'x = 2');
t('3 < 5', 'true');
t('1/2+1/3', '5/6');
t('2+3*4', '14');
t('(1/2)/(3/4)', '2/3');
t('2^10', '1024');
t('sqrt(8)', /^2\.828427/);
t('sqrt(16/9)', '4/3');
t('sin(30)', '0.5', { deg: true });
t('20!', '2432902008176640000');
t('50%', '1/2');
t('0.1+0.2', '3/10');
t('5C', '5C');
t('2(x+1)+3(x-1)', '5x − 1');
t('(x+1)(x-1)', 'x^2 − 1');
t('x^2-5x+6', '(x − 2)(x − 3)');
t('nCr(5,2)', '10');
t('log(1000)', '3');
t('2 - -3', '5');
t('x^3 - 6x^2 + 11x - 6 >= 0', '1 ≤ x ≤ 2 or x ≥ 3');
t('abs(x-2) < 3', /−1 < x < 5/);
t('1/0', /ERR/);
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
