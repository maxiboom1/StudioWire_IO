import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './projectFactory';

describe('createEmptyProject', () => {
  it('includes terminal block arrays in the current project shape', () => {
    const project = createEmptyProject({
      id: 'project-empty-terminal-blocks',
      name: 'Empty Terminal Blocks',
    });

    expect(project.schemaVersion).toBe('0.2.0');
    expect(project.terminalBlocks).toEqual([]);
    expect(project.terminalBlockPortGroups).toEqual([]);
    expect(project.terminalBlockPorts).toEqual([]);
  });
});
