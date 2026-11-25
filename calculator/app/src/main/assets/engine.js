/* Calc+ engine: exact fractions (BigInt), a parser, an evaluator, and a step-by-step solver
   for equations and inequalities: linear, square root, variable denominators, quadratics and
   anything else through a sign chart. No DOM in here, so it runs (and is tested) under Node. */
(function (G) {
'use strict';

class MathError extends Error {}
const fail = m => { throw new MathError(m); };

// ---------- BigInt rationals ----------
const babs = a => (a < 0n ? -a : a);
function bgcd(a, b) { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; }
const blcm = (a, b) => (a === 0n || b === 0n ? 1n : babs(a / bgcd(a, b) * b));
function iroot(n, k) { // exact k-th root of n >= 0, or null
  if (n < 2n) return n;
  const K = BigInt(k);
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / k));
  for (;;) { const y = ((K - 1n) * x + n / x ** (K - 1n)) / K; if (y >= x) break; x = y; }
  return x ** K === n ? x : null;
}

class Q {
  constructor(n, d = 1n) {
    if (d === 0n) fail('Can’t divide by zero');
    if (d < 0n) { n = -n; d = -d; }
    const g = bgcd(n, d);
    if (g > 1n) { n /= g; d /= g; }
    this.n = n; this.d = d;
  }
  static of(i) { return new Q(BigInt(i)); }
  static parse(s) { const [a, b = ''] = s.split('.'); return new Q(BigInt((a || '0') + b), 10n ** BigInt(b.length)); }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { if (o.n === 0n) fail('Can’t divide by zero'); return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  abs() { return new Q(babs(this.n), this.d); }
  sign() { return this.n > 0n ? 1 : this.n < 0n ? -1 : 0; }
  isInt() { return this.d === 1n; }
  isZero() { return this.n === 0n; }
  cmp(o) { const x = this.n * o.d - o.n * this.d; return x > 0n ? 1 : x < 0n ? -1 : 0; }
  eq(o) { return this.n === o.n && this.d === o.d; }
  powInt(k) {
    if (k < 0n) { if (!this.n) fail('Can’t divide by zero'); return new Q(this.d ** -k, this.n ** -k); }
    return new Q(this.n ** k, this.d ** k);
  }
  toNumber() {
    let n = this.n, d = this.d;
    const s = Math.max(babs(n).toString(2).length, d.toString(2).length) - 1000;
    if (s > 0) { n >>= BigInt(s); d >>= BigInt(s); if (!d) return n > 0n ? Infinity : -Infinity; }
    return Number(n) / Number(d);
  }
}
const Q0 = new Q(0n), Q1 = new Q(1n);
const isQ = v => v instanceof Q;
const F = v => (isQ(v) ? v.toNumber() : v);
function finite(x) {
  if (Number.isNaN(x)) fail('Not a real number');
  if (!Number.isFinite(x)) fail('Too large');
  return x;
}
function terminates(q) { let d = q.d; while (d % 2n === 0n) d /= 2n; while (d % 5n === 0n) d /= 5n; return d === 1n; }
function qDecimal(q, max = 48) { // long division with the repeating part found
  const neg = q.n < 0n; let r = babs(q.n) % q.d; const int = (babs(q.n) / q.d).toString();
  let frac = ''; const seen = new Map();
  while (r && frac.length < max) {
    if (seen.has(r)) { const i = seen.get(r); return { neg, int, frac: frac.slice(0, i), rep: frac.slice(i) }; }
    seen.set(r, frac.length); r *= 10n; frac += (r / q.d).toString(); r %= q.d;
  }
  return { neg, int, frac, rep: '', cut: r !== 0n };
}

// ---------- formatting ----------
const MINUS = '−';
const trimZ = s => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
function fmtFloat(x, html, sig = 12) {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : MINUS + '∞';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= 1e12 || ax < 1e-6) {
    let [m, e] = x.toExponential(sig - 2).split('e');
    m = trimZ(m).replace('-', MINUS); e = String(+e).replace('-', MINUS);
    return html ? `${m}<span class="o">×</span>10<sup>${e}</sup>` : `${m}×10^${e}`;
  }
  return trimZ(x.toPrecision(sig)).replace('-', MINUS);
}
const decOK = q => terminates(q) && qDecimal(q).frac.length <= 4;
function qDec(q) { const d = qDecimal(q); return (d.neg ? MINUS : '') + d.int + (d.frac ? '.' + d.frac : ''); }
function qText(q, dec = true) {
  if (q.isInt()) return q.n.toString().replace('-', MINUS);
  if (dec && decOK(q)) return qDec(q);
  return (q.n < 0n ? MINUS : '') + babs(q.n) + '/' + q.d;
}

// ---------- AST ----------
const N = (q, show) => (show ? { k: 'num', q, show } : { k: 'num', q });
const NF = f => ({ k: 'num', f });
const Var = n => ({ k: 'var', n });
const mul = (a, b) => ({ k: '*', a, b });
const div = (a, b) => ({ k: '/', a, b });
const grp = a => ({ k: 'grp', a });
const rel = (l, o, r) => ({ k: 'rel', parts: [l, r], ops: [o] });
const sqrtN = a => ({ k: 'fn', n: 'sqrt', args: [a] });
const kids = n => (n.k === 'rel' ? n.parts : n.k === 'fn' ? n.args : [n.a, n.b].filter(Boolean));
function vars(n, s = new Set()) { if (n.k === 'var') s.add(n.n); for (const c of kids(n)) vars(c, s); return s; }
const hasVar = n => vars(n).size > 0;
const strip = n => { while (n.k === 'grp') n = n.a; return n; };
const numVal = n => (n.q !== undefined ? n.q : n.f);

// ---------- tokenizer + parser ----------
const FNS = ['asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'sqrt', 'cbrt', 'abs', 'ln', 'log', 'nroot', 'nCr', 'nPr', 'exp'];
const OPS = { '+': '+', '-': '-', '−': '-', '*': '*', '×': '*', '·': '*', '/': '/', '÷': '/', '^': '^', '!': '!', '%': '%', ',': ',' };
function tokenize(s, strict) {
  const T = []; let i = 0;
  while (i < s.length) {
    const c = s[i], two = s.slice(i, i + 2);
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const t = s.slice(i, j);
      if (t === '.' || t.split('.').length > 2) fail('That number has too many points');
      T.push({ t: 'num', v: t }); i = j; continue;
    }
    if (c === '\\') { let j = i + 1; while (j < s.length && /[A-Za-z]/.test(s[j])) j++; T.push({ t: 'fn', v: s.slice(i + 1, j) }); i = j; continue; }
    if (c === '@') { T.push({ t: 'ans' }); i++; continue; }
    if (/[A-Za-z]/.test(c)) {
      if (!strict) {
        if (s.startsWith('Ans', i)) { T.push({ t: 'ans' }); i += 3; continue; }
        const f = FNS.find(f => s.startsWith(f, i));
        if (f) { T.push({ t: 'fn', v: f }); i += f.length; continue; }
        if (s.startsWith('pi', i)) { T.push({ t: 'const', v: 'π' }); i += 2; continue; }
        if (c === 'e') { T.push({ t: 'const', v: 'ℯ' }); i++; continue; }
      }
      T.push({ t: 'var', v: c }); i++; continue;
    }
    if (c === 'π' || c === 'ℯ') { T.push({ t: 'const', v: c }); i++; continue; }
    if (c === '√') { T.push({ t: 'fn', v: 'sqrt' }); i++; continue; }
    if (c === '²' || c === '³') { T.push({ t: 'op', v: '^' }, { t: 'num', v: c === '²' ? '2' : '3' }); i++; continue; }
    const r2 = { '<=': '≤', '>=': '≥', '!=': '≠', '==': '=' }[two];
    if (r2) { T.push({ t: 'rel', v: r2 }); i += 2; continue; }
    if ('<>≤≥=≠'.includes(c)) { T.push({ t: 'rel', v: c }); i++; continue; }
    if (OPS[c]) { T.push({ t: 'op', v: OPS[c] }); i++; continue; }
    if (c === '(' || c === '[') { T.push({ t: '(' }); i++; continue; }
    if (c === '⦅') { T.push({ t: '(', hid: true }); i++; continue; }
    if (c === ')' || c === ']' || c === '⦆') { T.push({ t: ')' }); i++; continue; }
    fail('I don’t know the symbol ' + c);
  }
  return T;
}

function parse(src, strict) {
  const T = tokenize(src, strict); let p = 0;
  if (!T.length) fail('Type something first');
  const peek = () => T[p], next = () => T[p++];
  const isOp = v => T[p] && T[p].t === 'op' && T[p].v === v;
  const opens = t => t && (t.t === 'num' || t.t === 'var' || t.t === 'const' || t.t === 'fn' || t.t === '(' || t.t === 'ans');
  const close = () => { if (peek() && peek().t === ')') next(); else if (p < T.length) fail('A bracket isn’t closed'); };
  function relation() {
    const parts = [expr()], ops = [];
    while (peek() && peek().t === 'rel') { ops.push(next().v); parts.push(expr()); }
    return ops.length ? { k: 'rel', parts, ops } : parts[0];
  }
  function expr() {
    let a = unary();
    while (isOp('+') || isOp('-')) { const o = next().v; a = { k: o, a, b: unary() }; }
    return a;
  }
  function term(first) {
    let a = first || power();
    for (;;) {
      if (isOp('*') || isOp('/')) { const o = next().v; a = { k: o, a, b: unaryF() }; }
      else if (opens(peek())) a = { k: '*', a, b: power() };
      else return a;
    }
  }
  function unary() { // a leading sign applies to the whole first term: −2x is −(2x)
    if (isOp('-')) { next(); return { k: 'neg', a: unary() }; }
    if (isOp('+')) { next(); return unary(); }
    return term();
  }
  function unaryF() { // sign right after × or ÷
    if (isOp('-')) { next(); return { k: 'neg', a: unaryF() }; }
    if (isOp('+')) { next(); return unaryF(); }
    return power();
  }
  function power() {
    const base = postfix();
    if (isOp('^')) { next(); return { k: '^', a: base, b: unaryF() }; }
    return base;
  }
  function postfix() {
    let a = primary();
    while (isOp('!') || isOp('%')) a = { k: next().v, a };
    return a;
  }
  function primary() {
    const t = next();
    if (!t) fail('Unfinished — something is missing at the end');
    switch (t.t) {
      case 'num': return t.v.includes('.') ? { k: 'num', q: Q.parse(t.v), show: 'dec' } : { k: 'num', q: Q.parse(t.v) };
      case 'var': return Var(t.v);
      case 'const': return { k: 'const', n: t.v };
      case 'ans': return { k: 'ans' };
      case '(': {
        if (!peek() || peek().t === ')') fail('Empty brackets');
        const e = expr(); close();
        return t.hid ? { k: 'grp', a: e, hid: true } : grp(e);
      }
      case 'fn': {
        if (!FNS.includes(t.v)) fail('Unknown function ' + t.v);
        let args;
        if (peek() && peek().t === '(') {
          next(); if (!peek() || peek().t === ')') fail('Empty brackets');
          args = [expr()]; while (isOp(',')) { next(); args.push(expr()); } close();
        } else args = [power()];
        return { k: 'fn', n: t.v, args };
      }
    }
    fail(t.t === 'rel' ? 'Something is missing before ' + t.v : t.t === ')' ? 'A bracket closes with nothing open' : 'Something is missing before ' + (t.v || ''));
  }
  const r = relation();
  if (p < T.length) fail(T[p].t === ')' ? 'A bracket closes with nothing open' : 'Unexpected ' + (T[p].v || T[p].t));
  return r;
}

// ---------- evaluation ----------
function root(a, k) { // exact k-th root of a rational, or null
  if (a.sign() < 0) { if (k % 2n === 0n) return null; const r = root(a.neg(), k); return r && r.neg(); }
  const n = iroot(a.n, Number(k)), d = iroot(a.d, Number(k));
  return n !== null && d !== null ? new Q(n, d) : null;
}
function arith(op, a, b) {
  if (isQ(a) && isQ(b)) return op === '+' ? a.add(b) : op === '-' ? a.sub(b) : op === '*' ? a.mul(b) : a.div(b);
  const x = F(a), y = F(b);
  if (op === '/' && y === 0) fail('Can’t divide by zero');
  return finite(op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y);
}
function power(a, b) {
  if (isQ(a) && isQ(b)) {
    if (b.isInt()) {
      const bits = (babs(a.n).toString(2).length + a.d.toString(2).length) * Number(babs(b.n));
      if (a.isZero() && b.n < 0n) fail('Can’t divide by zero');
      if (bits < 400000 || babs(a.n) <= 1n && a.d === 1n) return a.powInt(b.n);
    } else if (b.d <= 64n) {
      const r = root(a, b.d);
      if (r) return power(r, new Q(b.n));
    }
  }
  const x = F(a), y = F(b);
  if (x < 0 && !Number.isInteger(y)) {
    if (isQ(b) && b.d % 2n === 1n) { const r = Math.pow(-x, y); return b.n % 2n === 0n ? r : -r; }
    fail('Not a real number (even root of a negative)');
  }
  if (x === 0 && y < 0) fail('Can’t divide by zero');
  return finite(Math.pow(x, y));
}
function fact(a) {
  if (!isQ(a) || !a.isInt() || a.n < 0n) fail('Factorial needs a whole number ≥ 0');
  if (a.n > 3000n) fail('Too large');
  let r = 1n; for (let i = 2n; i <= a.n; i++) r *= i; return new Q(r);
}
const tidy = x => { const r = Math.round(x * 1e10) / 1e10; return Math.abs(x - r) < 1e-14 ? r : x; };
function callFn(n, args, env) {
  const deg = env && env.deg, toR = x => (deg ? x * Math.PI / 180 : x), fromR = x => (deg ? x * 180 / Math.PI : x);
  const a = args[0], x = () => F(a);
  if (args.length !== (n === 'nroot' || n === 'nCr' || n === 'nPr' ? 2 : 1)) fail(n + ' takes ' + (args.length > 1 ? 'one value' : 'two values, like ' + n + '(5,2)'));
  switch (n) {
    case 'sqrt': if (F(a) < 0) fail('Not a real number (square root of a negative)'); return power(a, new Q(1n, 2n));
    case 'cbrt': return power(a, new Q(1n, 3n));
    case 'nroot': { const k = args[0]; if (!isQ(k) || !k.isInt() || k.n < 1n) fail('The root index must be a whole number'); return power(args[1], new Q(1n, k.n)); }
    case 'abs': return isQ(a) ? a.abs() : Math.abs(a);
    case 'sin': return tidy(Math.sin(toR(x())));
    case 'cos': return tidy(Math.cos(toR(x())));
    case 'tan': { const c = Math.cos(toR(x())); if (Math.abs(c) < 1e-12) fail('tan is undefined here'); return tidy(Math.tan(toR(x()))); }
    case 'asin': case 'acos': if (Math.abs(x()) > 1) fail(n.replace('a', '') + '⁻¹ needs a value from −1 to 1'); return tidy(fromR(Math[n](x())));
    case 'atan': return tidy(fromR(Math.atan(x())));
    case 'sinh': case 'cosh': case 'tanh': return finite(Math[n](x()));
    case 'ln': if (x() <= 0) fail('ln needs a positive number'); return tidy(Math.log(x()));
    case 'log': {
      if (x() <= 0) fail('log needs a positive number');
      if (isQ(a) && a.d === 1n && /^10*$/.test(a.n.toString())) return Q.of(a.n.toString().length - 1);
      return tidy(Math.log10(x()));
    }
    case 'exp': return finite(Math.exp(x()));
    case 'nCr': case 'nPr': {
      const [p, r] = args;
      if (![p, r].every(v => isQ(v) && v.isInt() && v.n >= 0n) || r.n > p.n) fail(n + ' needs whole numbers with r ≤ n');
      let t = 1n; for (let i = 0n; i < r.n; i++) t *= p.n - i;
      if (n === 'nCr') for (let i = 2n; i <= r.n; i++) t /= i;
      return new Q(t);
    }
  }
  fail('Unknown function ' + n);
}
function ev(n, env) {
  switch (n.k) {
    case 'num': return numVal(n);
    case 'var': if (env && env.vars && n.n in env.vars) return env.vars[n.n]; fail('This has a letter in it');
    case 'const': return n.n === 'π' ? Math.PI : Math.E;
    case 'ans': return (env && env.ans) || Q0;
    case 'grp': return ev(n.a, env);
    case 'neg': { const a = ev(n.a, env); return isQ(a) ? a.neg() : -a; }
    case '+': case '-': case '*': case '/': return arith(n.k, ev(n.a, env), ev(n.b, env));
    case '^': return power(ev(n.a, env), ev(n.b, env));
    case '!': return fact(ev(n.a, env));
    case '%': return arith('/', ev(n.a, env), Q.of(100));
    case 'fn': return callFn(n.n, n.args.map(a => ev(a, env)), env);
    case 'rel': fail('That’s an equation — press Solve');
  }
  fail('Can’t work that out');
}

// ---------- printing (one printer, two outputs: plain text and HTML) ----------
const negLike = n => n.k === 'neg' || (n.k === 'num' && (n.q ? n.q.sign() < 0 : n.f < 0));
function prec(n) {
  switch (n.k) {
    case 'rel': return 0;
    case '+': case '-': case '±': return 1;
    case '*': case '/': return 2;
    case 'neg': return 3;
    case '^': return 4;
    case '!': case '%': return 5;
    case 'num': return negLike(n) ? 3 : n.q && !n.q.isInt() && !(n.show === 'dec' && decOK(n.q)) ? 2 : 6;
    case 'grp': return n.hid ? prec(n.a) : 6;
    default: return 6;
  }
}
function lead(n) {
  switch (n.k) {
    case 'num': return negLike(n) ? '-' : prec(n) === 2 ? 'fr' : 'd';
    case 'var': case 'const': return 'v';
    case 'grp': return n.hid ? lead(n.a) : 'p';
    case 'fn': case 'ans': return 'f';
    case '^': case '*': case '!': case '%': return lead(n.a);
    case '/': return 'fr';
    default: return '-';
  }
}
const FNAME = { asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹' };
function render(n, o) {
  const R = x => render(x, o);
  const W = (c, p) => (prec(c) < p ? o.paren(R(c)) : R(c));
  const WR = (c, p) => (negLike(c) || prec(c) < p ? o.paren(R(c)) : R(c));
  switch (n.k) {
    case 'num': return o.num(n);
    case 'var': return o.v(n.n);
    case 'const': return o.c(n.n);
    case 'ans': return o.fname('Ans');
    case 'grp': return n.hid ? R(n.a) : o.paren(R(n.a));
    case '+': return W(n.a, 1) + o.op('+') + WR(n.b, 1);
    case '-': return W(n.a, 1) + o.op('−') + WR(n.b, 2);
    case '±': return W(n.a, 1) + o.op('±') + WR(n.b, 2);
    case '*': {
      const j = ['v', 'p', 'f'].includes(lead(n.b)) && lead(n.a) !== '-' || (lead(n.b) === 'p' && lead(n.a) === '-');
      return W(n.a, 2) + (j ? '' : o.op('×')) + WR(n.b, 2.5);
    }
    case '/': return o.frac ? o.frac(R(strip(n.a)), R(strip(n.b))) : W(n.a, 2) + '/' + WR(n.b, 2.5);
    case 'neg': return o.neg() + (negLike(n.a) || prec(n.a) <= 1 ? o.paren(R(n.a)) : R(n.a));
    case '^': return (negLike(n.a) || prec(n.a) < 6 ? o.paren(R(n.a)) : R(n.a)) + o.pow(R(strip(n.b)), n.b);
    case '!': case '%': return W(n.a, 6) + n.k;
    case 'fn': {
      const A = n.args.map(a => R(strip(a)));
      if (n.n === 'sqrt') return o.sqrt(A[0]);
      if (n.n === 'cbrt') return o.sqrt(A[0], '3');
      if (n.n === 'nroot') return o.sqrt(A[1], A[0]);
      if (n.n === 'abs') return o.abs(A[0]);
      return o.fname(FNAME[n.n] || n.n) + o.paren(A.join(', '));
    }
    case 'rel': return n.parts.map(R).reduce((s, x, i) => s + o.op(n.ops[i - 1]) + x);
  }
  return '?';
}
function numText(n) {
  if (n.f !== undefined) return fmtFloat(n.f);
  return qText(n.q, n.show === 'dec');
}
const TXT = {
  num: numText, v: s => s, c: s => (s === 'ℯ' ? 'e' : s), op: s => (s === '×' ? '×' : ' ' + s + ' '),
  neg: () => MINUS, paren: s => '(' + s + ')', frac: null, fname: s => s,
  pow: (s, b) => '^' + (prec(strip(b)) >= 6 && !negLike(strip(b)) ? s : '(' + s + ')'),
  sqrt: (s, i) => (i ? i : '') + '√(' + s + ')', abs: s => '|' + s + '|',
};
const fracH = (a, b) => `<span class="fr"><span class="nu">${a}</span><span class="de">${b}</span></span>`;
const parenH = s => `<span class="pr"><span class="pl"></span><span class="pc">${s}</span><span class="pl pz"></span></span>`;
const RADICAL = '<svg class="rd" viewBox="0 0 10 24" preserveAspectRatio="none"><path d="M0 14 L2.6 12.6 L5.6 23 L9.6 1 L10 1" vector-effect="non-scaling-stroke"/></svg>';
const sqrtH = (s, i) => `<span class="sq">${i ? `<span class="ix">${i}</span>` : ''}${RADICAL}<span class="rc">${s}</span></span>`;
function numHTML(n) {
  if (n.f !== undefined) return fmtFloat(n.f, true);
  const q = n.q;
  if (q.isInt()) return q.n.toString().replace('-', '<span class="u">−</span>');
  if (n.show === 'dec' && decOK(q)) return qDec(q).replace(MINUS, '<span class="u">−</span>');
  return (q.n < 0n ? '<span class="u">−</span>' : '') + fracH(babs(q.n).toString(), q.d.toString());
}
const HTM = {
  num: numHTML, v: s => `<i>${s}</i>`, c: s => (s === 'ℯ' ? '<i class="k">e</i>' : `<span class="k">${s}</span>`),
  op: s => `<span class="o">${s}</span>`, neg: () => '<span class="u">−</span>', paren: parenH, frac: fracH,
  fname: s => `<span class="fn">${s}</span>`, pow: s => `<sup>${s}</sup>`, sqrt: sqrtH, abs: s => `<span class="ab">${s}</span>`,
};
const text = n => render(n, TXT);
const html = n => render(n, HTM);

// ---------- polynomials ----------
// Multivariate, for simplifying: Map key -> {c: Q, m: {var: power}}
const mkey = m => Object.keys(m).sort().map(v => v + '^' + m[v]).join('*');
class P {
  constructor(t = new Map()) { this.t = t; }
  static c(q) { const p = new P(); if (!q.isZero()) p.t.set('', { c: q, m: {} }); return p; }
  static v(x) { const p = new P(); p.t.set(x + '^1', { c: Q1, m: { [x]: 1 } }); return p; }
  add(o) {
    const r = new Map(this.t);
    for (const [k, { c, m }] of o.t) { const e = r.get(k); const s = e ? e.c.add(c) : c; if (s.isZero()) r.delete(k); else r.set(k, { c: s, m }); }
    return new P(r);
  }
  scale(q) { const r = new Map(); if (!q.isZero()) for (const [k, { c, m }] of this.t) r.set(k, { c: c.mul(q), m }); return new P(r); }
  neg() { return this.scale(Q1.neg()); }
  sub(o) { return this.add(o.neg()); }
  mul(o) {
    let r = new P();
    for (const a of this.t.values()) for (const b of o.t.values()) {
      const m = { ...a.m }; for (const v in b.m) m[v] = (m[v] || 0) + b.m[v];
      r = r.add(new P(new Map([[mkey(m), { c: a.c.mul(b.c), m }]])));
    }
    return r;
  }
  pow(k) { let r = P.c(Q1); for (let i = 0; i < k; i++) r = r.mul(this); return r; }
  isConst() { return [...this.t.keys()].every(k => k === ''); }
  constVal() { const e = this.t.get(''); return e ? e.c : Q0; }
  vars() { const s = new Set(); for (const { m } of this.t.values()) for (const v in m) s.add(v); return s; }
  deg(v) { let d = 0; for (const { m } of this.t.values()) d = Math.max(d, m[v] || 0); return d; }
  coeffs(v) { const a = []; for (const { c, m } of this.t.values()) { const e = m[v] || 0; a[e] = c; } for (let i = 0; i < a.length; i++) a[i] = a[i] || Q0; return a.length ? a : [Q0]; }
  denLcm() { let l = 1n; for (const { c } of this.t.values()) l = blcm(l, c.d); return l; }
}
function toP(n) {
  switch (n.k) {
    case 'num': return n.q ? P.c(n.q) : null;
    case 'var': return P.v(n.n);
    case 'grp': return toP(n.a);
    case 'neg': { const a = toP(n.a); return a && a.neg(); }
    case '+': case '-': case '*': {
      const a = toP(n.a), b = a && toP(n.b);
      return b ? (n.k === '+' ? a.add(b) : n.k === '-' ? a.sub(b) : a.mul(b)) : null;
    }
    case '/': {
      const a = toP(n.a), b = a && toP(n.b);
      if (!b || !b.isConst() || b.constVal().isZero()) return null;
      return a.scale(Q1.div(b.constVal()));
    }
    case '^': {
      const a = toP(n.a), b = a && toP(n.b);
      if (!b || !b.isConst()) return null;
      const e = b.constVal();
      if (e.isInt() && e.n >= 0n && e.n <= 12n) return a.pow(Number(e.n));
      if (a.isConst()) { try { const v = power(a.constVal(), e); return isQ(v) ? P.c(v) : null; } catch (_) { return null; } }
      return null;
    }
  }
  if (hasVar(n)) return null;
  try { const v = ev(n, {}); return isQ(v) ? P.c(v) : null; } catch (_) { return null; }
}
// a sum of terms as an AST: [{neg, node}]
function sumAST(terms) {
  if (!terms.length) return N(Q0);
  let s = terms[0].neg ? { k: 'neg', a: terms[0].node } : terms[0].node;
  for (const t of terms.slice(1)) s = { k: t.neg ? '-' : '+', a: s, b: t.node };
  return s;
}
function monoAST(m) {
  let r = null;
  for (const v of Object.keys(m).sort()) { const f = m[v] === 1 ? Var(v) : { k: '^', a: Var(v), b: N(Q.of(m[v])) }; r = r ? mul(r, f) : f; }
  return r;
}
function termAST(c, m, show) { // coefficient c (>= 0) times monomial
  const mo = monoAST(m);
  if (!mo) return N(c, show);
  if (c.eq(Q1)) return mo;
  return mul(N(c, show), mo);
}
function polyAST(p, show) {
  const ts = [...p.t.values()].sort((a, b) => {
    const da = Object.values(a.m).reduce((s, x) => s + x, 0), db = Object.values(b.m).reduce((s, x) => s + x, 0);
    return db - da || mkey(a.m).localeCompare(mkey(b.m));
  });
  return sumAST(ts.map(({ c, m }) => ({ neg: c.sign() < 0, node: termAST(c.abs(), m, show) })));
}
// Univariate coefficient arrays (low -> high) for rational functions
const trimA = a => { a = a.slice(); while (a.length > 1 && a[a.length - 1].isZero()) a.pop(); return a; };
function padd(a, b) { const r = []; for (let i = 0; i < Math.max(a.length, b.length); i++) r.push((a[i] || Q0).add(b[i] || Q0)); return trimA(r); }
const pneg = a => a.map(x => x.neg());
function pmul(a, b) { const r = Array(a.length + b.length - 1).fill(Q0); a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = r[i + j].add(x.mul(y)); })); return trimA(r); }
const pdeg = a => trimA(a).length - 1;
const pconst = a => pdeg(a) === 0;
function horner(a, x) { let r = Q0; for (let i = a.length - 1; i >= 0; i--) r = r.mul(x).add(a[i]); return r; }
function hornerF(a, x) { let r = 0; for (let i = a.length - 1; i >= 0; i--) r = r * x + a[i].toNumber(); return r; }
function uniAST(a, v) { const p = new P(); a.forEach((c, i) => { if (!c.isZero()) p.t.set(i ? v + '^' + i : '', { c, m: i ? { [v]: i } : {} }); }); return polyAST(p); }
function toRat(n, v) { // {n, d} coefficient arrays, or null
  switch (n.k) {
    case 'num': return n.q ? { n: [n.q], d: [Q1] } : null;
    case 'var': return n.n === v ? { n: [Q0, Q1], d: [Q1] } : null;
    case 'grp': return toRat(n.a, v);
    case 'neg': { const a = toRat(n.a, v); return a && { n: pneg(a.n), d: a.d }; }
    case '+': case '-': case '*': case '/': {
      const a = toRat(n.a, v), b = a && toRat(n.b, v);
      if (!b) return null;
      if (n.k === '*') return { n: pmul(a.n, b.n), d: pmul(a.d, b.d) };
      if (n.k === '/') { if (trimA(b.n).every(x => x.isZero())) return null; return { n: pmul(a.n, b.d), d: pmul(a.d, b.n) }; }
      const bn = n.k === '-' ? pneg(b.n) : b.n;
      if (a.d.length === b.d.length && a.d.every((x, i) => x.eq(b.d[i]))) return { n: padd(a.n, bn), d: a.d };
      return { n: padd(pmul(a.n, b.d), pmul(bn, a.d)), d: pmul(a.d, b.d) };
    }
    case '^': {
      const a = toRat(n.a, v); if (!a || hasVar(n.b)) return null;
      let e; try { e = ev(n.b, {}); } catch (_) { return null; }
      if (!isQ(e) || !e.isInt() || babs(e.n) > 12n) return null;
      let r = { n: [Q1], d: [Q1] };
      for (let i = 0n; i < babs(e.n); i++) r = { n: pmul(r.n, a.n), d: pmul(r.d, a.d) };
      return e.n < 0n ? { n: r.d, d: r.n } : r;
    }
  }
  if (hasVar(n)) return null;
  try { const x = ev(n, {}); return isQ(x) ? { n: [x], d: [Q1] } : null; } catch (_) { return null; }
}

// ---------- values (exact where possible) ----------
function valQ(q) { return { q, f: q.toNumber(), ast: N(q, decOK(q) ? 'dec' : undefined), txt: qText(q) }; }
function valF(f) {
  const s = snapQ(f); if (s) return valQ(s);
  return { f, ast: NF(+f.toPrecision(10)), txt: fmtFloat(f, false, 10), approx: true };
}
function snapQ(x) {
  for (let d = 1; d <= 64; d++) { const n = Math.round(x * d); if (Math.abs(x - n / d) < 1e-10 * Math.max(1, Math.abs(x))) return new Q(BigInt(n), BigInt(d)); }
  return null;
}
function squareFree(n) { // n = k^2 * m
  let k = 1n, m = n;
  for (let p = 2n; p * p <= m && p < 20000n; p++) while (m % (p * p) === 0n) { m /= p * p; k *= p; }
  return [k, m];
}
function surdAST(A, B, m) { // A + B√m with A, B rational
  const den = blcm(A.d, B.d), an = A.n * (den / A.d), bn = B.n * (den / B.d);
  const s = babs(bn) === 1n ? sqrtN(N(new Q(m))) : mul(N(new Q(babs(bn))), sqrtN(N(new Q(m))));
  const top = an === 0n ? (bn < 0n ? { k: 'neg', a: s } : s) : { k: bn < 0n ? '-' : '+', a: N(new Q(an)), b: s };
  return den === 1n ? top : div(top, N(new Q(den)));
}
function quadRoots(a, b, c) { // real roots of ax²+bx+c, exact
  const D = b.mul(b).sub(Q.of(4).mul(a).mul(c));
  if (D.sign() < 0) return [];
  const A = b.neg().div(a.add(a));
  if (D.isZero()) return [valQ(A)];
  const [k, m] = squareFree(D.n * D.d);
  const B = new Q(k, D.d).div(a.add(a)).abs();
  if (m === 1n) return [valQ(A.sub(B)), valQ(A.add(B))];
  const f = Math.sqrt(Number(m)) * B.toNumber();
  return [-1, 1].map(s => { const ast = surdAST(A, s < 0 ? B.neg() : B, m); return { f: A.toNumber() + s * f, ast, txt: text(ast), surd: true }; });
}
function divisors(x) { x = babs(x); if (x > 10n ** 10n) return null; const r = []; for (let i = 1n; i * i <= x; i++) if (x % i === 0n) { r.push(i); if (i * i !== x) r.push(x / i); } return r; }
function polyRoots(c) {
  let a = trimA(c); const out = [];
  if (a.length <= 1) return out;
  if (a[0].isZero()) { out.push(valQ(Q0)); while (a.length > 1 && a[0].isZero()) a = a.slice(1); }
  for (let found = true; found && a.length > 3;) {
    found = false;
    const L = a.reduce((l, q) => blcm(l, q.d), 1n), ints = a.map(q => q.n * (L / q.d));
    const ps = divisors(ints[0]), qs = divisors(ints[ints.length - 1]);
    if (!ps || !qs) break;
    search: for (const p of ps) for (const q of qs) for (const s of [1n, -1n]) {
      const r = new Q(s * p, q);
      if (horner(a, r).isZero()) {
        out.push(valQ(r));
        const nd = []; let acc = Q0; // synthetic division
        for (let i = a.length - 1; i >= 1; i--) { acc = acc.mul(r).add(a[i]); nd.unshift(acc); }
        a = trimA(nd); found = true; break search;
      }
    }
  }
  if (a.length === 2) out.push(valQ(a[0].neg().div(a[1])));
  else if (a.length === 3) out.push(...quadRoots(a[2], a[1], a[0]));
  else if (a.length > 3) out.push(...scan(x => hornerF(a, x)).zeros.map(valF));
  return uniqVals(out);
}
function uniqVals(vs) {
  vs.sort((x, y) => x.f - y.f);
  return vs.filter((v, i) => !i || (v.q && vs[i - 1].q ? !v.q.eq(vs[i - 1].q) : Math.abs(v.f - vs[i - 1].f) > 1e-9 * Math.max(1, Math.abs(v.f))));
}
// Numeric zeros and breaks of f over the real line (or a window for periodic functions)
function scan(f, win) {
  const xs = [];
  if (win) for (let i = 0; i <= 3600; i++) xs.push(win[0] + (win[1] - win[0]) * i / 3600);
  else for (let i = -2400; i <= 2400; i++) xs.push(Math.sinh(i / 160));
  const y = x => { try { const r = f(x); return Number.isFinite(r) ? r : NaN; } catch (_) { return NaN; } };
  const ys = xs.map(y), zeros = [], breaks = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    let a = xs[i], b = xs[i + 1]; const fa = ys[i], fb = ys[i + 1];
    if (Number.isNaN(fa) !== Number.isNaN(fb)) {
      const defA = !Number.isNaN(fa);
      for (let k = 0; k < 80; k++) { const m = (a + b) / 2; if (!Number.isNaN(y(m)) === defA) a = m; else b = m; }
      breaks.push(defA ? a : b); continue;
    }
    if (Number.isNaN(fa)) continue;
    if (fa === 0) { zeros.push(a); continue; }
    if (fa * fb < 0) {
      let lo = a, hi = b, flo = fa;
      for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2, fm = y(m); if (Number.isNaN(fm)) break; if (fm * flo <= 0) hi = m; else { lo = m; flo = fm; } }
      const r = (lo + hi) / 2, fr = Math.abs(y(r));
      (fr < 1e-7 * Math.max(1, Math.abs(fa), Math.abs(fb)) ? zeros : breaks).push(r);
    } else if (i + 2 < xs.length && Math.abs(fb) < Math.abs(fa) && Math.abs(fb) < Math.abs(ys[i + 2]) && Math.abs(fb) < 1e-2) {
      let lo = a, hi = xs[i + 2]; // a touching zero, like (x − 2)²
      for (let k = 0; k < 120; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(y(m1)) < Math.abs(y(m2))) hi = m2; else lo = m1; }
      const m = (lo + hi) / 2; if (Math.abs(y(m)) < 1e-12) zeros.push(m);
    }
  }
  if (win && Math.abs(ys[ys.length - 1]) === 0) zeros.push(xs[xs.length - 1]);
  return { zeros, breaks };
}

// ---------- solution sets ----------
// {iv: [{lo, hi, loC, hiC}]}, lo/hi are values or null (infinite)
const FLIP = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '=': '=', '≠': '≠' };
const ALL = () => ({ iv: [{ lo: null, hi: null }] });
const NONE = () => ({ iv: [] });
function setFrom(op, c) {
  switch (op) {
    case '<': return { iv: [{ lo: null, hi: c }] };
    case '≤': return { iv: [{ lo: null, hi: c, hiC: true }] };
    case '>': return { iv: [{ lo: c, hi: null }] };
    case '≥': return { iv: [{ lo: c, loC: true, hi: null }] };
    case '=': return { iv: [{ lo: c, hi: c, loC: true, hiC: true }] };
    case '≠': return { iv: [{ lo: null, hi: c }, { lo: c, hi: null }] };
  }
}
const vcmp = (a, b) => (a.q && b.q ? a.q.cmp(b.q) : Math.abs(a.f - b.f) < 1e-9 * Math.max(1, Math.abs(a.f)) ? 0 : a.f < b.f ? -1 : 1);
function intersect(A, B) {
  const out = [];
  for (const a of A.iv) for (const b of B.iv) {
    let lo, loC, hi, hiC;
    if (!a.lo) [lo, loC] = [b.lo, b.loC]; else if (!b.lo) [lo, loC] = [a.lo, a.loC];
    else { const c = vcmp(a.lo, b.lo); [lo, loC] = c > 0 ? [a.lo, a.loC] : c < 0 ? [b.lo, b.loC] : [a.lo, a.loC && b.loC]; }
    if (!a.hi) [hi, hiC] = [b.hi, b.hiC]; else if (!b.hi) [hi, hiC] = [a.hi, a.hiC];
    else { const c = vcmp(a.hi, b.hi); [hi, hiC] = c < 0 ? [a.hi, a.hiC] : c > 0 ? [b.hi, b.hiC] : [a.hi, a.hiC && b.hiC]; }
    if (lo && hi) { const c = vcmp(lo, hi); if (c > 0 || (c === 0 && !(loC && hiC))) continue; }
    out.push({ lo, loC: !!loC, hi, hiC: !!hiC });
  }
  return { iv: out };
}
function inSet(S, x) {
  return S.iv.some(I => (!I.lo || x > I.lo.f || (I.loC && Math.abs(x - I.lo.f) < 1e-12)) && (!I.hi || x < I.hi.f || (I.hiC && Math.abs(x - I.hi.f) < 1e-12)));
}
const isAll = S => S.iv.length === 1 && !S.iv[0].lo && !S.iv[0].hi;
// Inequality text for a set, as an AST (so fractions and surds draw properly)
function setAST(S, v) {
  const x = Var(v), out = [];
  if (S.iv.length === 2 && !S.iv[0].lo && !S.iv[1].hi && S.iv[0].hi && S.iv[1].lo && !S.iv[0].hiC && !S.iv[1].loC && vcmp(S.iv[0].hi, S.iv[1].lo) === 0) return [rel(x, '≠', S.iv[0].hi.ast)];
  for (const I of S.iv) {
    if (!I.lo && !I.hi) out.push(null);
    else if (!I.lo) out.push(rel(x, I.hiC ? '≤' : '<', I.hi.ast));
    else if (!I.hi) out.push(rel(x, I.loC ? '≥' : '>', I.lo.ast));
    else if (vcmp(I.lo, I.hi) === 0) out.push(rel(x, '=', I.lo.ast));
    else out.push({ k: 'rel', parts: [I.lo.ast, x, I.hi.ast], ops: [I.loC ? '≤' : '<', I.hiC ? '≤' : '<'] });
  }
  return out;
}
function describe(S, v, o = TXT) { // "x ≥ 6.5", "x < −3 or x ≥ 11"
  if (!S.iv.length) return 'no solution';
  if (isAll(S)) return 'all real numbers';
  return setAST(S, v).map(a => render(a, o)).join(o === TXT ? ' or ' : '<span class="w"> or </span>');
}
function intervalNotation(S, o = TXT) {
  if (!S.iv.length) return '∅';
  const r = val => (val ? render(val.ast, o) : null);
  return S.iv.map(I => {
    if (I.lo && I.hi && vcmp(I.lo, I.hi) === 0) return '{' + r(I.lo) + '}';
    return (I.lo && I.loC ? '[' : '(') + (r(I.lo) || MINUS + '∞') + ', ' + (r(I.hi) || '∞') + (I.hi && I.hiC ? ']' : ')');
  }).join(' ∪ ');
}
function setBuilder(S, v, o = TXT, dom = 'ℝ') {
  const R = o === HTM ? `<i>${v}</i>` : v;
  if (!S.iv.length) return '∅';
  if (S.iv.every(I => I.lo && I.hi && vcmp(I.lo, I.hi) === 0)) return '{' + S.iv.map(I => render(I.lo.ast, o)).join(', ') + '}';
  if (isAll(S)) return `{${R} : ${R} ∈ ${dom}}`;
  return `{${R} : ${describe(S, v, o)}, ${R} ∈ ${dom}}`;
}

// ---------- the solver ----------
const opName = { '<': 'less than', '>': 'greater than', '≤': 'at most', '≥': 'at least' };
const isIneq = op => op !== '=' && op !== '≠';
function evAt(n, v, x) { return ev(n, { vars: { [v]: x } }); }
function evNum(n, v, x) { return F(evAt(n, v, x)); }
function splitTerms(n, neg = false, out = []) {
  if (n.k === '+' || n.k === '-') { splitTerms(n.a, neg, out); splitTerms(n.b, n.k === '-' ? !neg : neg, out); }
  else if (n.k === 'grp' && n.hid) splitTerms(n.a, neg, out);
  else if (n.k === 'neg') splitTerms(n.a, !neg, out);
  else if (n.k === 'num' && n.q && n.q.sign() < 0) out.push({ neg: !neg, node: N(n.q.neg(), n.show) });
  else out.push({ neg, node: n });
  return out;
}
const isSum = n => { n = n.k === 'grp' && n.hid ? n.a : n; return n.k === '+' || n.k === '-'; };
function scaleTerm(t, L) { // L × term, written the way you'd write it by hand
  const s = strip(t);
  if (s.k === '/') {
    const b = toP(s.b);
    if (b && b.isConst()) {
      const k = L.div(b.constVal()), A = strip(s.a);
      if (k.eq(Q1)) return isSum(A) ? grp(A) : A;
      if (A.k === '*' && strip(A.a).k === 'num' && strip(A.a).q) return mul(N(k.mul(strip(A.a).q)), A.b);
      return mul(N(k), isSum(A) ? grp(A) : A);
    }
  }
  const p = toP(t);
  if (p.isConst()) return N(p.constVal().mul(L));
  if (p.denLcm() === 1n) {
    if (s.k === '*' && strip(s.a).k === 'num' && strip(s.a).q) return mul(N(L.mul(strip(s.a).q)), s.b);
    return mul(N(L), s);
  }
  const r = polyAST(p.scale(L));
  return isSum(r) || negLike(r) ? grp(r) : r;
}
function scaleSide(side, L) {
  const ts = splitTerms(side).map(t => ({ neg: t.neg, node: scaleTerm(t.node, L) }));
  if (ts.length === 1 && ts[0].node.k === 'grp') ts[0].node = ts[0].node.a;
  return sumAST(ts);
}
const show = (steps, why, m, extra) => steps.push({ why, m, ...extra });
const same = (a, b) => text(a) === text(b);
function finalVal(q) { return valQ(q); }

function linearPath(L, op, R, v, steps) {
  const pl = toP(L), pr = toP(R);
  if (!pl || !pr) return null;
  for (const p of [pl, pr]) { if ([...p.vars()].some(x => x !== v) || p.deg(v) > 1) return null; }
  if (pl.deg(v) + pr.deg(v) === 0) return null;
  let cur = rel(L, op, R);
  // 1. clear fractions
  const lcd = [...splitTerms(L), ...splitTerms(R)].reduce((l, t) => { const p = toP(t.node); return blcm(l, p ? p.denLcm() : 1n); }, 1n);
  if (lcd > 1n) {
    cur = rel(scaleSide(L, new Q(lcd)), op, scaleSide(R, new Q(lcd)));
    show(steps, `Multiply every term by ${lcd} to clear the fractions`, cur);
  }
  // 2. expand
  const P1 = toP(cur.parts[0]), P2 = toP(cur.parts[1]);
  const flat = rel(polyAST(P1), op, polyAST(P2));
  if (!same(flat, cur)) { show(steps, /\(/.test(text(cur)) ? 'Expand the brackets' : 'Tidy up each side', flat); cur = flat; }
  // 3. collect: letters on one side, numbers on the other
  const [b1, a1] = P1.coeffs(v).concat([Q0]).slice(0, 2), [b2, a2] = P2.coeffs(v).concat([Q0]).slice(0, 2);
  const x = Var(v), T = (c, withX) => ({ neg: c.sign() < 0, node: withX ? termAST(c.abs(), { [v]: 1 }) : N(c.abs()) });
  if (a1.eq(a2)) {
    const ok = { '<': b1.cmp(b2) < 0, '>': b1.cmp(b2) > 0, '≤': b1.cmp(b2) <= 0, '≥': b1.cmp(b2) >= 0, '=': b1.eq(b2), '≠': !b1.eq(b2) }[op];
    show(steps, `The ${v} terms cancel, leaving ${qText(b1)} ${op} ${qText(b2)}, which is ${ok ? 'always true — every number works' : 'never true — no number works'}`, rel(N(b1), op, N(b2)));
    return ok ? ALL() : NONE();
  }
  const left = !a1.isZero(); // keep the letter where it already is
  let A, C, o = op;
  if (left) {
    A = a1.sub(a2); C = b2.sub(b1);
    if (!a2.isZero() || !b1.isZero()) {
      const lt = [T(a1, 1)]; if (!a2.isZero()) lt.push(T(a2.neg(), 1));
      const rt = []; if (!b2.isZero()) rt.push(T(b2)); if (!b1.isZero()) rt.push(T(b1.neg()));
      let why;
      if (a2.isZero()) why = `${b1.sign() > 0 ? 'Subtract' : 'Add'} ${qText(b1.abs())} ${b1.sign() > 0 ? 'from' : 'to'} both sides`;
      else if (b1.isZero()) why = `${a2.sign() > 0 ? 'Subtract' : 'Add'} ${text(termAST(a2.abs(), { [v]: 1 }))} ${a2.sign() > 0 ? 'from' : 'to'} both sides`;
      else why = `Move the ${v} terms to the left and the numbers to the right (a term changes sign when it crosses)`;
      const m = rel(sumAST(lt), op, sumAST(rt)); show(steps, why, m);
      const s = rel(sumAST([T(A, 1)]), op, N(C));
      if (!same(s, m)) show(steps, 'Simplify', s);
    }
  } else {
    A = a2; C = b1.sub(b2);
    if (!b2.isZero()) {
      const m = rel(sumAST([T(b1), T(b2.neg())].filter(t => !(t.node.q && t.node.q.isZero()))), op, sumAST([T(a2, 1)]));
      show(steps, `${b2.sign() > 0 ? 'Subtract' : 'Add'} ${qText(b2.abs())} ${b2.sign() > 0 ? 'from' : 'to'} both sides`, m);
      show(steps, 'Simplify', rel(N(C), op, sumAST([T(a2, 1)])));
    }
  }
  // 4. divide by the coefficient
  const val = C.div(A);
  if (!A.eq(Q1)) {
    const flips = A.sign() < 0 && isIneq(op);
    o = flips ? FLIP[op] : op;
    const ax = sumAST([T(A, 1)]);
    const why = `Divide both sides by ${qText(A, false)}` + (flips ? ' — dividing by a negative number flips the inequality sign' : '');
    if (left) { show(steps, why, rel(div(ax, N(A)), o, div(N(C), N(A)))); show(steps, 'Simplify', rel(x, o, finalVal(val).ast)); }
    else { show(steps, why, rel(div(N(C), N(A)), o, div(ax, N(A)))); show(steps, 'Simplify', rel(finalVal(val).ast, o, x)); }
  }
  if (!left) { o = FLIP[o]; show(steps, `Rewrite it with ${v} on the left (turn the whole thing around)`, rel(x, o, finalVal(val).ast)); }
  if (!steps.length) show(steps, `${v} is already on its own — nothing to do`, rel(x, o, finalVal(val).ast));
  return setFrom(o, finalVal(val));
}

function sqrtPath(L, op, R, v, steps) {
  const isRt = n => strip(n).k === 'fn' && strip(n).n === 'sqrt';
  if (isRt(R) && !hasVar(L) && !isRt(L)) { [L, R] = [R, L]; op = FLIP[op]; show(steps, 'Swap the sides so the square root is on the left', rel(L, op, R)); }
  if (!isRt(L) || hasVar(R)) return null;
  let c; try { c = ev(R, {}); } catch (_) { return null; }
  const A = strip(strip(L).args[0]), cf = F(c);
  const dom = solvePair(A, '≥', N(Q0), v, [], null);
  show(steps, `A square root only works when what’s inside is 0 or more: ${text(A)} ≥ 0 gives ${describe(dom, v)}`, rel(A, '≥', N(Q0)));
  if (cf < 0 || (cf === 0 && (op === '<' || op === '≥'))) {
    if (op === '<' || op === '≤' || op === '=') { show(steps, `A square root is never negative, so it can’t be ${op === '=' ? 'equal to' : opName[op]} ${text(R)}`, null); return NONE(); }
    show(steps, 'A square root is always 0 or more, so this is true everywhere the root exists', null);
    return dom;
  }
  const c2 = power(c, Q.of(2));
  show(steps, 'Square both sides (both sides are positive, so the sign stays the same)', rel(A, op, isQ(c2) ? N(c2) : NF(c2)));
  const sub = solvePair(A, op, isQ(c2) ? N(c2) : NF(c2), v, steps, dom);
  const res = intersect(sub, dom);
  show(steps, `Keep only the numbers where the root exists (${describe(dom, v)})`, null, { set: res });
  return res;
}

function constSignOn(f, S) {
  const pts = [];
  for (const I of S.iv) {
    const lo = I.lo ? I.lo.f : null, hi = I.hi ? I.hi.f : null;
    if (lo !== null && hi !== null) for (let i = 1; i < 40; i++) pts.push(lo + (hi - lo) * i / 40);
    else for (const d of [1e-7, 1e-3, 0.1, 1, 10, 1e3, 1e6]) pts.push(lo !== null ? lo + d : hi !== null ? hi - d : (d > 1 ? d : -d));
  }
  let s = 0;
  for (const x of pts) { let y; try { y = f(x); } catch (_) { return 0; } const t = Math.sign(y); if (!t || (s && t !== s)) return 0; s = t; }
  return s;
}
function denomPath(L, op, R, v, steps, dom) {
  const hasDen = n => { n = strip(n); return n.k === '/' && hasVar(n.b); };
  if (!hasDen(L) && hasDen(R)) { [L, R] = [R, L]; op = FLIP[op]; }
  if (!hasDen(L) || !dom) return null;
  const S = strip(L), D = strip(S.b), Nn = strip(S.a);
  const pd = toP(D), pn = toP(Nn), pr = toP(R);
  if (!pd || !pn || !pr || hasDen(R)) return null;
  const sg = constSignOn(x => evNum(D, v, x), dom);
  if (!sg) return null;
  const o = sg < 0 && isIneq(op) ? FLIP[op] : op;
  const Dt = text(D);
  show(steps, sg > 0 ? `Here ${Dt} is positive, so multiply both sides by (${Dt}) — the sign stays the same` : `Here ${Dt} is negative, so multiply both sides by (${Dt}) and flip the sign`, rel(Nn, o, mul(R, grp(D))));
  return solvePair(Nn, o, mul(R, grp(D)), v, steps, null);
}

function intervalLabel(lo, hi, v) {
  const x = Var(v);
  if (!lo && !hi) return 'all ' + v;
  if (!lo) return text(rel(x, '<', hi.ast));
  if (!hi) return text(rel(x, '>', lo.ast));
  return text({ k: 'rel', parts: [lo.ast, x, hi.ast], ops: ['<', '<'] });
}
function niceTest(lo, hi) { // a friendly number to test inside (lo, hi)
  if (lo === null && hi === null) return 0;
  if (lo === null) return Number.isInteger(hi) ? hi - 1 : Math.floor(hi);
  if (hi === null) return Number.isInteger(lo) ? lo + 1 : Math.ceil(lo);
  const a = Math.floor(lo) + 1, b = Math.ceil(hi) - 1;
  return a <= b ? Math.min(b, Math.max(a, Math.round((lo + hi) / 2))) : (lo + hi) / 2;
}
const SAT = { '<': s => s < 0, '≤': s => s <= 0, '>': s => s > 0, '≥': s => s >= 0, '=': s => s === 0, '≠': s => s !== 0 };
function signChart(H, op, v, crits, undef, steps) {
  const items = [], rows = [];
  const at = x => { try { const y = evNum(H, v, x); return Number.isFinite(y) ? y : NaN; } catch (_) { return NaN; } };
  for (let i = 0; i <= crits.length; i++) {
    const lo = i ? crits[i - 1] : null, hi = i < crits.length ? crits[i] : null;
    const t = niceTest(lo && lo.f, hi && hi.f), y = at(t), s = Number.isNaN(y) ? null : Math.sign(y);
    const ok = s !== null && SAT[op](s) && s !== 0;
    items.push({ I: true, lo, hi, inc: ok });
    rows.push([intervalLabel(lo, hi, v), fmtFloat(+t.toPrecision(6)), s === null ? 'undefined' : s > 0 ? '+' : s < 0 ? '−' : '0', ok]);
    if (hi) {
      let z = false, d = !undef.some(u => vcmp(u, hi) === 0);
      if (d) { try { const e = evAt(H, v, hi.q || hi.f); const fe = F(e); d = Number.isFinite(fe); z = isQ(e) ? e.isZero() : Math.abs(fe) < 1e-9; } catch (_) { d = false; } }
      items.push({ I: false, v: hi, inc: d && SAT[op](z ? 0 : Math.sign(at(hi.f))) });
    }
  }
  if (steps) show(steps, 'Test a number from each region in the left side', null, { table: rows });
  const out = []; let cur = null;
  for (const it of items) {
    if (it.inc) {
      if (!cur) cur = it.I ? { lo: it.lo, loC: false } : { lo: it.v, loC: true };
      if (it.I) { cur.hi = it.hi; cur.hiC = false; } else { cur.hi = it.v; cur.hiC = true; }
    } else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return { iv: out };
}
const TRIG = n => n.k === 'fn' && /sin|cos|tan/.test(n.n) || kids(n).some(TRIG);
function generalPath(L, op, R, v, steps, env) {
  const zero = N(Q0);
  const Rz = strip(R).k === 'num' && strip(R).q && strip(R).q.isZero();
  const H = Rz ? L : { k: '-', a: L, b: R };
  const r = toRat(H, v);
  let crits, undef = [];
  if (r) {
    let num = trimA(r.n), den = trimA(r.d);
    if (pconst(den)) { num = num.map(c => c.div(den[0])); den = [Q1]; }
    const disp = pconst(den) ? uniAST(num, v) : div(uniAST(num, v), uniAST(den, v));
    if (!same(rel(disp, op, zero), rel(L, op, R))) show(steps, 'Move everything to one side so the other side is 0' + (pconst(den) ? '' : ', as one fraction'), rel(disp, op, zero));
    const Hd = pconst(den) ? uniAST(num, v) : div(grp(uniAST(num, v)), grp(uniAST(den, v)));
    const zs = polyRoots(num); undef = polyRoots(den);
    if (pdeg(num) === 2 && pconst(den)) quadSteps(num, op, v, steps, zs);
    else if (zs.length || undef.length) {
      const z = zs.filter(a => !undef.some(b => vcmp(a, b) === 0));
      show(steps, (z.length ? `It is 0 when ${z.map(a => v + ' = ' + a.txt).join(', ')}` : 'The top is never 0') + (undef.length ? `; it is undefined when ${undef.map(a => v + ' = ' + a.txt).join(', ')} (the bottom is 0)` : ''), null);
    }
    crits = uniqVals([...zs, ...undef]);
    if (op === '=' || (!isIneq(op))) {
      const z = zs.filter(a => !undef.some(b => vcmp(a, b) === 0));
      return op === '=' ? { iv: z.map(a => ({ lo: a, hi: a, loC: true, hiC: true })) } : signChart(Hd, op, v, crits, undef, null);
    }
    return signChart(Hd, op, v, crits, undef, steps);
  }
  const win = TRIG(H) ? (env && env.deg ? [0, 360] : [0, 2 * Math.PI]) : null;
  const sc = scan(x => evNum(H, v, x), win);
  crits = uniqVals([...sc.zeros, ...sc.breaks].map(valF));
  const zs = uniqVals(sc.zeros.map(valF));
  if (!same(rel(H, op, zero), rel(L, op, R))) show(steps, 'Move everything to one side so the other side is 0', rel(H, op, zero));
  show(steps, (zs.length ? `It is 0 when ${zs.map(a => v + ' = ' + (a.approx ? '≈ ' : '') + a.txt).join(', ')}` : 'It is never 0') + (win ? ` (looking at ${win[0]} ≤ ${v} ${'<'} ${env && env.deg ? '360°' : '2π'})` : ''), null);
  if (op === '=') return { iv: zs.map(a => ({ lo: a, hi: a, loC: true, hiC: true })), window: win };
  const S = signChart(H, op, v, crits, [], steps);
  if (win) { S.window = win; return intersect(S, { iv: [{ lo: valQ(Q0), loC: true, hi: valF(win[1]), hiC: false }] }); }
  return S;
}
function quadSteps(c, op, v, steps, zs) {
  const [c0, b, a] = c, x = Var(v);
  if (zs.length && zs.every(z => z.q)) {
    let k = a, fs = [];
    const D = b.mul(b).sub(Q.of(4).mul(a).mul(c0));
    const roots = D.isZero() ? [zs[0], zs[0]] : zs;
    for (const z of roots) { const p = z.q; k = k.div(new Q(p.d)); fs.push(grp(sumAST([{ neg: false, node: termAST(new Q(p.d), { [v]: 1 }) }, ...(p.isZero() ? [] : [{ neg: p.sign() > 0, node: N(new Q(babs(p.n))) }])]))); }
    let f = D.isZero() ? { k: '^', a: fs[0], b: N(Q.of(2)) } : mul(fs[0], fs[1]);
    if (!k.eq(Q1)) f = k.eq(Q1.neg()) ? { k: 'neg', a: f } : mul(N(k), f);
    show(steps, 'Factorise', rel(f, op, N(Q0)));
    if (op === '=') show(steps, 'One of the brackets must be 0', null, { list: zs.map(z => rel(x, '=', z.ast)) });
    return;
  }
  const D = b.mul(b).sub(Q.of(4).mul(a).mul(c0));
  show(steps, `Use the quadratic formula with a = ${qText(a, false)}, b = ${qText(b, false)}, c = ${qText(c0, false)}. The discriminant b² − 4ac = ${qText(D, false)}`,
    rel(x, '=', div({ k: '±', a: { k: 'neg', a: Var('b') }, b: sqrtN({ k: '-', a: { k: '^', a: Var('b'), b: N(Q.of(2)) }, b: mul(N(Q.of(4)), mul(Var('a'), Var('c'))) }) }, mul(N(Q.of(2)), Var('a')))));
  if (D.sign() < 0) show(steps, `b² − 4ac is negative, so there are no real roots — the curve never touches 0 and stays ${a.sign() > 0 ? 'above' : 'below'} it`, null);
  else show(steps, 'So', null, { list: zs.map(z => rel(x, '=', z.ast)) });
}

function solvePair(L, op, R, v, steps, dom, env) {
  return linearPath(L, op, R, v, steps) || sqrtPath(L, op, R, v, steps) || denomPath(L, op, R, v, steps, dom) || generalPath(L, op, R, v, steps, env);
}

function chainPath(node, v, steps) {
  if (node.parts.length !== 3) return null;
  const [A, M, C] = node.parts, [o1, o2] = node.ops;
  const dir = o => ('<≤'.includes(o) ? 1 : '>≥'.includes(o) ? -1 : 0);
  if (hasVar(A) || hasVar(C) || !dir(o1) || dir(o1) !== dir(o2)) return null;
  const pm = toP(M), pa = toP(A), pc = toP(C);
  if (!pm || !pa || !pc || [...pm.vars()].some(x => x !== v) || pm.deg(v) !== 1) return null;
  let a = pa.constVal(), c = pc.constVal(), mid = M;
  const chain = (l, m, r, p, q) => ({ k: 'rel', parts: [l, m, r], ops: [p || o1, q || o2] });
  const lcd = [a, c].reduce((l, q) => blcm(l, q.d), pm.denLcm());
  if (lcd > 1n) { const L = new Q(lcd); a = a.mul(L); c = c.mul(L); mid = scaleSide(M, L); show(steps, `Multiply all three parts by ${lcd} to clear the fractions`, chain(N(a), mid, N(c))); }
  const P1 = toP(mid), [b, k] = P1.coeffs(v).concat([Q0]).slice(0, 2), x = Var(v);
  const kx = termAST(k.abs(), { [v]: 1 }), KX = k.sign() < 0 ? { k: 'neg', a: kx } : kx;
  if (!same(polyAST(P1), mid)) show(steps, 'Expand the brackets', chain(N(a), polyAST(P1), N(c)));
  if (!b.isZero()) { a = a.sub(b); c = c.sub(b); show(steps, `${b.sign() > 0 ? 'Subtract' : 'Add'} ${qText(b.abs())} ${b.sign() > 0 ? 'from' : 'to'} all three parts`, chain(N(a), KX, N(c))); }
  let p = o1, q = o2;
  if (!k.eq(Q1)) {
    const fl = k.sign() < 0;
    if (fl) { p = FLIP[o1]; q = FLIP[o2]; }
    a = a.div(k); c = c.div(k);
    show(steps, `Divide all three parts by ${qText(k, false)}` + (fl ? ' — negative, so both signs flip' : ''), chain(finalVal(a).ast, x, finalVal(c).ast, p, q));
  }
  if (!steps.length) show(steps, `${v} is already on its own — nothing to do`, chain(N(a), x, N(c)));
  if (dir(p) < 0) { [a, c] = [c, a]; [p, q] = [FLIP[q], FLIP[p]]; show(steps, 'Rewrite it from smallest to largest', chain(finalVal(a).ast, x, finalVal(c).ast, p, q)); }
  return intersect(setFrom(p === '<' ? '>' : '≥', finalVal(a)), setFrom(q, finalVal(c)));
}

function pickCheck(S) {
  const I = S.iv[0]; if (!I) return null;
  const lo = I.lo, hi = I.hi;
  if (lo && hi && vcmp(lo, hi) === 0) return lo.q || null;
  const t = niceTest(lo ? lo.f : null, hi ? hi.f : null);
  return Number.isInteger(t) ? Q.of(t) : null;
}
function subst(n, v, q) {
  if (n.k === 'var' && n.n === v) return N(q);
  const o = { ...n };
  if (n.parts) o.parts = n.parts.map(c => subst(c, v, q));
  if (n.args) o.args = n.args.map(c => subst(c, v, q));
  if (n.a) o.a = subst(n.a, v, q);
  if (n.b) o.b = subst(n.b, v, q);
  return o;
}

function solve(node, env = {}) {
  if (node.k !== 'rel') fail('Add a sign like =, < or ≥ to solve');
  const vs = [...vars(node)], steps = [];
  if (!vs.length) {
    const vals = node.parts.map(p => ev(p, env));
    const ok = node.ops.every((o, i) => { const c = isQ(vals[i]) && isQ(vals[i + 1]) ? vals[i].cmp(vals[i + 1]) : Math.sign(F(vals[i]) - F(vals[i + 1])); return SAT[o](c); });
    return { kind: 'truth', ok, steps: [{ why: `There’s no letter, so just check it: it’s ${ok ? 'true' : 'false'}`, m: { k: 'rel', parts: vals.map(x => (isQ(x) ? N(x) : NF(x))), ops: node.ops } }] };
  }
  if (vs.length > 1) fail(`Solve works with one letter at a time — this has ${vs.join(', ')}`);
  const v = vs[0];
  let sol;
  if (node.parts.length > 2) {
    sol = chainPath(node, v, steps);
    if (!sol) {
      sol = ALL();
      node.ops.forEach((o, i) => {
        show(steps, `Part ${i + 1}: ${text(rel(node.parts[i], o, node.parts[i + 1]))}`, null, { head: true });
        const s = solvePair(node.parts[i], o, node.parts[i + 1], v, steps, null, env);
        show(steps, 'So ' + describe(s, v), null);
        sol = intersect(sol, s);
      });
      show(steps, 'Both parts have to be true, so keep the overlap', null);
    }
  } else {
    sol = solvePair(node.parts[0], node.ops[0], node.parts[1], v, steps, null, env);
    const c = pickCheck(sol);
    if (c && node.ops[0] !== '≠') {
      try {
        const l = evAt(node.parts[0], v, c), r = evAt(node.parts[1], v, c);
        if (isQ(l) && isQ(r)) show(steps, `Check: put ${v} = ${qText(c)} back in`, rel(subst(node.parts[0], v, c), node.ops[0], subst(node.parts[1], v, c)), { m2: rel(N(l), node.ops[0], N(r)), ok: SAT[node.ops[0]](l.cmp(r)) });
      } catch (_) { /* the check is only a nicety */ }
    }
  }
  return { kind: 'solve', v, sol, steps, window: sol.window };
}

function simplify(node) {
  const vs = [...vars(node)], steps = [];
  const p = toP(node);
  if (p) {
    const r = polyAST(p);
    if (!same(r, node)) show(steps, /\(/.test(text(node)) ? 'Expand the brackets and collect like terms' : 'Collect like terms', r);
    let fin = r;
    if (vs.length === 1 && p.deg(vs[0]) === 2) {
      const zs = polyRoots(p.coeffs(vs[0]));
      if (zs.length && zs.every(z => z.q)) {
        const t = []; quadSteps(p.coeffs(vs[0]), '=', vs[0], t, zs); const f = strip(t[0].m.parts[0]);
        if (!same(f, node)) { fin = f; show(steps, 'Factorise', fin); }
      }
    }
    if (!steps.length) show(steps, 'This is already as simple as it gets', r);
    return { kind: 'simplify', steps, result: fin };
  }
  if (vs.length === 1) {
    const r = toRat(node, vs[0]);
    if (r && !pconst(trimA(r.d))) {
      const res = div(uniAST(trimA(r.n), vs[0]), uniAST(trimA(r.d), vs[0]));
      show(steps, 'Write it as one fraction', res);
      return { kind: 'simplify', steps, result: res };
    }
  }
  fail('I can’t simplify that one');
}

// Step-by-step arithmetic: reduce one operation at a time, in BODMAS order
function arithSteps(node, env) {
  const isV = n => n.k === 'num' || n.k === 'const' || n.k === 'ans' || n.keep;
  const val = n => (n.keep ? n.q : ev(n, env));
  const mk = x => (isQ(x) ? N(x) : NF(x));
  function prep(n) {
    if (n.k === '/' && strip(n.a).k === 'num' && strip(n.b).k === 'num' && strip(n.a).q && strip(n.b).q && strip(n.a).q.isInt() && strip(n.b).q.isInt() && !strip(n.b).q.isZero()) {
      const q = strip(n.a).q.div(strip(n.b).q);
      if (bgcd(strip(n.a).q.n, strip(n.b).q.n) === 1n && strip(n.b).q.n > 1n) return N(q);
    }
    const o = { ...n };
    if (n.args) o.args = n.args.map(prep);
    if (n.a) o.a = prep(n.a);
    if (n.b) o.b = prep(n.b);
    return o;
  }
  function fold(n) { // silent tidying: (5) → 5, −(5) → −5
    const o = { ...n };
    if (n.args) o.args = n.args.map(fold);
    if (n.a) o.a = fold(n.a);
    if (n.b) o.b = fold(n.b);
    if (o.k === 'grp' && isV(o.a) && !o.a.keep) return o.a;
    if (o.k === 'neg' && o.a.k === 'num') return mk(o.a.q ? o.a.q.neg() : -o.a.f);
    return o;
  }
  const WHY = { '^': 'Powers first', '*': 'Multiply', '/': 'Divide', '+': 'Add', '-': 'Subtract', '!': 'Factorial', '%': 'Percent means divide by 100' };
  function reduce(n) {
    for (const key of ['args', 'a', 'b']) {
      if (key === 'args' && n.args) for (let i = 0; i < n.args.length; i++) { const r = reduce(n.args[i]); if (r) { const args = n.args.slice(); args[i] = r.n; return { n: { ...n, args }, why: r.why }; } }
      if (key !== 'args' && n[key] && typeof n[key] === 'object') { const r = reduce(n[key]); if (r) return { n: { ...n, [key]: r.n }, why: r.why }; }
    }
    if (isV(n) || n.k === 'grp') return null;
    const ks = kids(n);
    if (!ks.every(isV)) return null;
    if ((n.k === '+' || n.k === '-') && ks.every(k => k.keep || (k.k === 'num' && k.q))) {
      const a = val(n.a), b = val(n.b);
      if (!(n.a.keep && n.b.keep) && (!a.isInt() || !b.isInt()) && a.d !== b.d) {
        const d = blcm(a.d, b.d), kf = q => Object.assign(div(N(new Q(q.n * (d / q.d))), N(new Q(d))), { keep: true, q });
        return { n: { ...n, a: kf(a), b: kf(b) }, why: `Make the bottoms the same (${d})` };
      }
      if (n.a.keep || n.b.keep) return { n: mk(arith(n.k, a, b)), why: n.k === '+' ? 'Add the tops' : 'Subtract the tops' };
    }
    if (n.k === '/' && (n.b.k === 'num' || n.b.keep) && n.b.q && !n.b.q.isInt() && !(n.a.k === 'num' && n.a.q && n.a.q.isInt() && n.b.q.isInt())) {
      return { n: mul(n.a, N(Q1.div(n.b.q))), why: 'Dividing by a fraction: flip it and multiply' };
    }
    let r;
    if (n.k === 'fn') r = callFn(n.n, n.args.map(val), env);
    else if (n.k === 'neg') r = isQ(val(n.a)) ? val(n.a).neg() : -val(n.a);
    else if (n.k === '!') r = fact(val(n.a));
    else if (n.k === '%') r = arith('/', val(n.a), Q.of(100));
    else if (n.k === '^') r = power(val(n.a), val(n.b));
    else r = arith(n.k, val(n.a), val(n.b));
    const why = n.k === 'fn' ? 'Work out ' + render({ ...n, args: n.args }, TXT) : n.k === '/' && n.a.k === 'num' && n.b.k === 'num' && isQ(r) && !r.isInt() ? 'Simplify the fraction' : WHY[n.k] || 'Work it out';
    return { n: mk(r), why };
  }
  let cur = fold(prep(node)); const steps = [];
  for (let i = 0; i < 40; i++) { const r = reduce(cur); if (!r) break; cur = fold(r.n); steps.push({ why: r.why, m: cur }); }
  return steps.length > 1 && steps.length <= 24 ? steps : [];
}

function evaluate(src, env = {}) {
  const node = typeof src === 'string' ? parse(src, env.strict) : src;
  if (node.k === 'rel') return solve(node, env);
  if (hasVar(node)) return simplify(node);
  const value = ev(node, env);
  let steps = [];
  try { steps = arithSteps(node, env); } catch (_) { steps = []; }
  return { kind: 'value', value, steps };
}

const api = {
  MathError, Q, parse, tokenize, ev, evaluate, solve, simplify, text, html, render, TXT, HTM,
  describe, intervalNotation, setBuilder, setAST, inSet, isAll, qText, qDecimal, fmtFloat, terminates, isQ, F, vcmp, fracH,
};
if (typeof module === 'object' && module.exports) module.exports = api; else G.CalcEngine = api;
})(this);
