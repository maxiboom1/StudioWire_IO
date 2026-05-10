import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { parseImportedProject } from './projectReducer';

function createMinimalLegacyProject() {
  return {
    schemaVersion: '0.1.0',
    project: {
      id: 'project-legacy-minimal',
      name: 'Legacy Minimal',
      customer: '',
      revision: '0.1',
      status: 'draft',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      createdBy: 'legacy',
      updatedBy: 'legacy',
    },
    settings: {
      categories: [
        { id: 'category-video', name: 'Video', defaultCablePrefix: 'V' },
      ],
      connectorTypes: [
        { id: 'connector-bnc', name: 'BNC' },
      ],
      cablePrefixes: [
        { id: 'prefix-video', prefix: 'V', name: 'Video' },
      ],
      rackDefaults: {
        heightRu: 42,
        numberingDirection: 'bottom_to_top',
      },
      labelRules: {
        cableNumberFormat: 'PREFIX-0001',
        cableNumberPadding: 4,
      },
    },
    locations: [],
    racks: [],
    devices: [],
    portGroups: [],
    ports: [],
    cables: [],
    numberingLedgers: [],
    validationIssues: [],
    changeLog: [],
  };
}

describe('parseImportedProject schema migration', () => {
  it('imports current schema projects with terminal block arrays', () => {
    const result = parseImportedProject(structuredClone(sampleProject));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.project.schemaVersion).toBe('0.2.0');
      expect(result.project.terminalBlocks).toHaveLength(1);
      expect(result.project.terminalBlockPortGroups).toHaveLength(1);
      expect(result.project.terminalBlockPorts).toHaveLength(32);
    }
  });

  it('round-trips a minimal legacy v0.1.0 project to v0.2.0 with empty terminal block arrays', () => {
    const result = parseImportedProject(createMinimalLegacyProject());

    expect(result.ok).toBe(true);

    if (result.ok) {
      const exported = JSON.parse(JSON.stringify(result.project));

      expect(exported.schemaVersion).toBe('0.2.0');
      expect(exported.terminalBlocks).toEqual([]);
      expect(exported.terminalBlockPortGroups).toEqual([]);
      expect(exported.terminalBlockPorts).toEqual([]);
    }
  });
});
