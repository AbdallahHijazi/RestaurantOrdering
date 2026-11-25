#!/usr/bin/env node
/**
 * Guards the "one place to restyle the whole app" rule.
 *
 * Fails when a component stylesheet contains a raw colour (hex / rgb() / hsl()) or a raw font stack
 * instead of the central tokens defined in src/styles.scss.
 *
 * Allowed:
 *   - src/styles.scss (the token definitions themselves)
 *   - a literal used only as the fallback of a token: var(--restaurant-surface, #fff)
 *
 * Run: npm run check:theme
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
const tokenFile = join(root, 'styles.scss');

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bhwb\(|\b(?:oklch|oklab|lab|lch)\(/g;
const FONT_FAMILY = /font-family\s*:\s*([^;}]*)/;
const FALLBACK = /var\(--[\w-]+\s*,\s*(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s*\)/g;

function* scssFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* scssFiles(path);
    } else if (path.endsWith('.scss') && path !== tokenFile) {
      yield path;
    }
  }
}

const problems = [];
for (const file of scssFiles(root)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const code = line.replace(/\/\*.*?\*\//g, '').replace(/^\s*\/\/.*$/, '').replace(FALLBACK, '');
    if (new RegExp(COLOR.source).test(code)) {
      problems.push(`${relative(root, file)}:${index + 1}  raw colour -> use a var(--restaurant-*) token: ${line.trim()}`);
    }
    const font = FONT_FAMILY.exec(code);
    if (font && !font[1].trim().startsWith('var(')) {
      problems.push(`${relative(root, file)}:${index + 1}  raw font-family -> use var(--restaurant-font-*): ${line.trim()}`);
    }
  });
}

if (problems.length > 0) {
  console.error(`Theme check failed (${problems.length}):\n` + problems.join('\n'));
  process.exit(1);
}
console.log('Theme check passed: component styles use only central tokens from src/styles.scss.');
