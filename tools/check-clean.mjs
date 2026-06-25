import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { findGeneratedArtifacts } from './release/clean-lib.mjs';

const failures = findGeneratedArtifacts('.');

if (existsSync('docs')) {
  for (const docsEntry of readdirSync('docs')) {
    if (/V0_2_5/.test(docsEntry)) {
      failures.push(join('docs', docsEntry).replace(/\\/g, '/'));
    }
  }
}

const sortedFailures = Array.from(new Set(failures)).sort((left, right) => left.localeCompare(right));

if (sortedFailures.length > 0) {
  console.error(`Generated or obsolete artifacts remain:\n${sortedFailures.join('\n')}`);
  process.exit(1);
}

console.log('Repository cleanliness check passed.');
