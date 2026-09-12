/* global URL, console, process */
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';

const DIST_ENTRY = new URL(
  '../dist/custom-elements-runtime.jit-css.es.js',
  import.meta.url,
);
const PACKAGE_JSON = new URL('../package.json', import.meta.url);
const MAX_RECURSIVE_GZIP_BYTES = 40 * 1024;
const MAX_IMPORT_MS = 50;
const MAX_TYPICAL_COLD_MS = 15;
const MAX_FULL_COLD_MS = 75;
const MAX_HOT_AVERAGE_MS = 2;
const MAX_GROWING_SET_MS = 350;

const failures = [];
const packageJson = JSON.parse(await readFile(PACKAGE_JSON, 'utf8'));
for (const field of [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  if (Object.keys(packageJson[field] ?? {}).length > 0) {
    failures.push(
      `${field} must stay empty (CER's runtime is zero-dependency)`,
    );
  }
}

const files = new Set();
async function collectImports(url) {
  if (files.has(url.href)) return;
  files.add(url.href);
  const source = await readFile(url, 'utf8');
  const imports = /\b(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/g;
  let match;
  while ((match = imports.exec(source))) {
    await collectImports(new URL(match[1], url));
  }
}
await collectImports(DIST_ENTRY);

let rawBytes = 0;
let gzipBytes = 0;
for (const href of files) {
  const url = new URL(href);
  const bytes = await readFile(url);
  rawBytes += (await stat(url)).size;
  gzipBytes += gzipSync(bytes, { level: 9 }).length;
}
if (gzipBytes > MAX_RECURSIVE_GZIP_BYTES) {
  failures.push(
    `recursive JIT ESM payload is ${gzipBytes} B gzip; budget is ${MAX_RECURSIVE_GZIP_BYTES} B`,
  );
}

let started = performance.now();
const { jitCSS, utilityMap } = await import(
  `${DIST_ENTRY.href}?validation=${Date.now()}`
);
const importMs = performance.now() - started;
const typical = [
  'flex',
  'items-center',
  'justify-between',
  'gap-4',
  'm-0',
  'mt-4',
  'p-4',
  'rounded-lg',
  'border',
  'border-neutral-200',
  'bg-primary-500',
  'text-white',
  'hover:bg-primary-600',
  'md:grid',
  'md:grid-cols-3',
  'dark:bg-neutral-900',
  'pointer-fine:hover:scale-105',
  'scrollbar-thin',
  'tab-4',
  'zoom-100',
];
const html = (classes) => `<div class="${classes.join(' ')}"></div>`;

started = performance.now();
jitCSS(html(typical));
const typicalColdMs = performance.now() - started;

const allUtilities = Object.keys(utilityMap);
started = performance.now();
jitCSS(html(allUtilities));
const fullColdMs = performance.now() - started;

started = performance.now();
for (let index = 0; index < 1000; index++) jitCSS(html(typical));
const hotAverageMs = (performance.now() - started) / 1000;

const growing = allUtilities.slice(0, 250);
started = performance.now();
for (let index = 1; index <= growing.length; index++) {
  jitCSS(html(growing.slice(0, index)));
}
const growingSetMs = performance.now() - started;

if (importMs > MAX_IMPORT_MS)
  failures.push(
    `module import and initialization took ${importMs.toFixed(2)} ms`,
  );
if (typicalColdMs > MAX_TYPICAL_COLD_MS)
  failures.push(`typical cold compile took ${typicalColdMs.toFixed(2)} ms`);
if (fullColdMs > MAX_FULL_COLD_MS)
  failures.push(`full static-map compile took ${fullColdMs.toFixed(2)} ms`);
if (hotAverageMs > MAX_HOT_AVERAGE_MS)
  failures.push(`hot compile averaged ${hotAverageMs.toFixed(3)} ms`);
if (growingSetMs > MAX_GROWING_SET_MS)
  failures.push(`250 growing-set compiles took ${growingSetMs.toFixed(2)} ms`);

console.log(
  [
    `JIT payload: ${rawBytes} B raw / ${gzipBytes} B gzip across ${files.size} ESM files`,
    `Module import: ${importMs.toFixed(2)} ms`,
    `Typical cold: ${typicalColdMs.toFixed(2)} ms`,
    `Full ${allUtilities.length}-utility cold: ${fullColdMs.toFixed(2)} ms`,
    `Hot average: ${hotAverageMs.toFixed(3)} ms`,
    `250 growing-set compiles: ${growingSetMs.toFixed(2)} ms`,
  ].join('\n'),
);

if (failures.length) {
  console.error(`\nJIT validation failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('\nJIT validation passed.');
}
