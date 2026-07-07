import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('layout width tokens', () => {
  it('uses one shared inspector width for top logo, inspector, and validation columns', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

    expect(css).toContain('--inspector-width: 300px;');
    expect(css).toContain(
      'grid-template-columns: var(--sidebar-width) minmax(0, 1fr) var(--inspector-width);',
    );
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) var(--inspector-width);');
    expect(css).toContain('justify-content: center;');
  });
});
