#!/usr/bin/env node
/**
 * Capture a Lighthouse baseline for listhq.com.au.
 * Run after a passing Lighthouse CI gate and commit the result.
 *
 * Usage: node scripts/save-baseline.mjs
 * Requires: npm install -g @lhci/cli
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT_DIR = 'docs/performance';
mkdirSync(OUT_DIR, { recursive: true });

const today = new Date().toISOString().split('T')[0];
const outFile = `${OUT_DIR}/baseline-${today}.json`;

console.log('Collecting Lighthouse baseline (3 runs)...');
const raw = execSync(
  'lhci collect --url=https://listhq.com.au/ --numberOfRuns=3 --settings.preset=desktop',
  { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
);

writeFileSync(outFile, raw);
console.log(`✅ Baseline saved to ${outFile}`);
