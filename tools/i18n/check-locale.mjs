#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.argv[2] ?? 'apps/web/public/i18n/en.json';
const abs = resolve(process.cwd(), file);

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

try {
  const raw = readFileSync(abs, 'utf8');
  const data = JSON.parse(raw);

  // Check no dotted keys at top-level
  const dotted = Object.keys(data).filter((k) => k.includes('.'));
  if (dotted.length) {
    fail(`Found top-level dotted keys in ${file}:\n- ${dotted.join('\n- ')}`);
  }

  // Check no placeholder values anywhere
  const offenders = [];
  const re = /^\s*Missing value for\s+'[^']+'\s*$/;
  const walk = (val, path = []) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [k, v] of Object.entries(val)) walk(v, [...path, k]);
    } else if (typeof val === 'string' && re.test(val)) {
      offenders.push(path.join('.'));
    }
  };
  walk(data);

  if (offenders.length) {
    fail(`Found placeholder values in ${file}:\n- ${offenders.join('\n- ')}`);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
} catch (err) {
  console.error(`Failed to check ${file}:`, err?.message || err);
  process.exit(1);
}

