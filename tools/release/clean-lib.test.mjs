import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findGeneratedArtifacts, removeGeneratedArtifacts } from './clean-lib.mjs';

describe('recursive cleanup helpers', () => {
  it('finds and removes nested generated artifacts while preserving maintained data', () => {
    const root = mkdtempSync(join(tmpdir(), 'studiowire-clean-test-'));

    try {
      mkdirSync(join(root, 'src/assets'), { recursive: true });
      mkdirSync(join(root, 'nested/coverage'), { recursive: true });
      mkdirSync(join(root, 'docs/samples'), { recursive: true });
      writeFileSync(join(root, 'src/assets/logo.png'), 'maintained image');
      writeFileSync(join(root, 'docs/samples/sample-project.studiowire.json'), '{}');
      writeFileSync(join(root, 'nested/output.log'), 'generated log');
      writeFileSync(join(root, 'nested/coverage/coverage-final.json'), '{}');

      expect(findGeneratedArtifacts(root)).toEqual(['nested/coverage', 'nested/output.log']);
      expect(removeGeneratedArtifacts(root)).toEqual(['nested/coverage', 'nested/output.log']);
      expect(findGeneratedArtifacts(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
