import { describe, expect, it } from 'vitest';
import { arePortConnectorsCompatible } from './connectorCompatibility';
import { sampleProject } from './sampleProject';

describe('connector compatibility', () => {
  it('allows different connectors in the same category and compatibility group', () => {
    const project = structuredClone(sampleProject);
    const left = project.ports[0];
    const right = { ...project.ports[4], connectorTypeId: 'connector-sdi-din' };

    expect(arePortConnectorsCompatible(project, left, right).ok).toBe(true);
  });

  it('blocks connectors in different groups within one category', () => {
    const project = structuredClone(sampleProject);
    const left = project.ports[0];
    const right = { ...project.ports[4], connectorTypeId: 'connector-hdmi' };

    const result = arePortConnectorsCompatible(project, left, right);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('compatibility group');
    }
  });

  it('allows exact connector matches even without a compatibility group', () => {
    const project = structuredClone(sampleProject);
    const left = { ...project.ports[0], connectorTypeId: 'connector-hdmi' };
    const right = { ...project.ports[4], connectorTypeId: 'connector-hdmi' };

    expect(arePortConnectorsCompatible(project, left, right).ok).toBe(true);
  });

  it('blocks connectors across categories', () => {
    const project = structuredClone(sampleProject);
    const left = project.ports[0];
    const right = {
      ...project.ports[4],
      categoryId: 'category-audio',
      connectorTypeId: 'connector-xlr',
    };

    const result = arePortConnectorsCompatible(project, left, right);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Category');
    }
  });

  it('blocks missing connector settings', () => {
    const project = structuredClone(sampleProject);
    const left = project.ports[0];
    const right = { ...project.ports[4], connectorTypeId: 'connector-missing' };

    const result = arePortConnectorsCompatible(project, left, right);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('missing');
    }
  });
});
