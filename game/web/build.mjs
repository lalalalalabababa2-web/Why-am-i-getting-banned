// Bundles the game into a single script and copies the web files into the Android assets.
//   node build.mjs          -> minified release build
//   node build.mjs --dev    -> unminified, with sourcemap
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const out = join(here, '..', 'android', 'app', 'src', 'main', 'assets', 'www');
const dist = join(here, 'dist');

for (const dir of [out, dist]) {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
}

await build({
  entryPoints: [join(here, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome80'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  outfile: join(dist, 'game.js'),
  logLevel: 'info',
});

for (const f of ['index.html', 'style.css']) copyFileSync(join(here, f), join(dist, f));
const fonts = {
  'anton-400.woff2': '@fontsource/anton/files/anton-latin-400-normal.woff2',
  'barlow-500.woff2': '@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2',
  'barlow-600.woff2': '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2',
  'barlow-700.woff2': '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2',
};
for (const dir of [dist, out]) mkdirSync(join(dir, 'fonts'), { recursive: true });
for (const [name, src] of Object.entries(fonts)) {
  copyFileSync(join(here, 'node_modules', src), join(dist, 'fonts', name));
  copyFileSync(join(here, 'node_modules', src), join(out, 'fonts', name));
}
for (const f of ['index.html', 'style.css', 'game.js']) copyFileSync(join(dist, f), join(out, f));
console.log('web build ->', out);
