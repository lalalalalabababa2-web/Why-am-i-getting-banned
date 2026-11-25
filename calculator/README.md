# Calc+

A calculator for Android that shows its working. It replaces the stock Samsung calculator for
schoolwork: fractions you type the way you write them, inequalities solved line by line, and the
answer drawn on a number line with set-builder and interval notation.

**Download:** [Calculator.apk](https://github.com/lalalalalabababa2-web/why-am-i-getting-banned/releases/download/calculator-latest/Calculator.apk)
(the newest build; the link stays the same). Open it on the phone and allow installs from your
browser when Android asks.

| | |
|---|---|
| Platform | Android 11+ (API 30), any CPU |
| App | `assets/index.html` (keypad, display, working) + `assets/engine.js` (maths), in a WebView |
| Build | `./gradlew -p calculator :app:assembleRelease` from the repository root (AGP 9.4.0, Java 17) |
| Tests | `node calculator/test/engine.test.js` |

## What it does

- **Its own keypad**, no phone keyboard. Three pages: `123`, `f(x)` and `abc` (letters), and a row
  of `<  >  ≤  ≥  =` always on top. Keys act on touch-down and give a small vibration; ◀ ▶ and ⌫
  repeat when held.
- **Written maths, not one line.** The fraction key puts the number before the cursor on top and
  moves you to the bottom; `( )`, `√`, `ⁿ√`, `xʸ`, `|x|` are real boxes you type into and move
  through with ◀ ▶ (or tap where you want the cursor).
- **Exact answers.** Arithmetic is done in exact fractions (big integers, so `50!` is every digit).
  Tap an answer to switch fraction ⇄ decimal (repeating digits get a bar) ⇄ mixed number.
- **Working for sums**: one step at a time in BODMAS order, with common denominators for fractions.
- **Solve** (when there's a `<`, `>`, `≤`, `≥` or `=`):
  - linear: clear fractions with the LCD, expand, move terms across, divide (and flip the sign
    when dividing by a negative), then check the answer by putting a number back in;
  - double inequalities like `−3 < 2x + 1 ≤ 7`, all three parts at once;
  - square roots: the "inside ≥ 0" condition, square both sides, keep only where the root exists;
  - letters in the bottom of a fraction: multiplies through only when the sign is known,
    otherwise a sign chart;
  - quadratics: factorise, or the quadratic formula with exact surds;
  - anything else: critical values and a table testing each region.
- **The answer** as an inequality, a number line (filled dot = included, open = not), set-builder
  `{x : x ≥ 6.5, x ∈ ℝ}` and interval `[6.5, ∞)`. Switch ℝ ⇄ ℤ to list whole-number answers.
- **Simplify** (letters but no sign): expand and collect like terms, factorise quadratics.
- Trig in degrees or radians, ln, log, eˣ, 10ˣ, n!, nCr, %, Ans, history, light and dark themes.
