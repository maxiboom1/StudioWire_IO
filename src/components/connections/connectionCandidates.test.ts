import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import { buildConnectionCandidates, groupConnectionCandidates } from './connectionCandidates';

describe('connection candidate builders', () => {
  it('builds searchable grouped candidates for a compatible port', () => {
    const routerOutput = sampleProject.ports.find(
      (port) => port.id === 'port-group-router-outputs-port-0001',
    );

    if (!routerOutput) {
      throw new Error('Expected sample router output port');
    }

    const candidates = buildConnectionCandidates(sampleProject, routerOutput.id);
    const grouped = groupConnectionCandidates(candidates);

    expect(candidates.map((candidate) => candidate.port.label)).toContain('MV1-IN-001');
    expect(candidates.every((candidate) => candidate.searchText === candidate.searchText.toLowerCase())).toBe(
      true,
    );
    expect(grouped.map((group) => group.name)).toContain('Control Room');
  });
});
