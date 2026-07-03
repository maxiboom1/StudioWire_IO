import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import { getPortGroupColor, getPortGroupConnectorIconKey, resolveConnectorIconKey } from './connectorVisuals';

describe('connector visuals', () => {
  it('maps known connector icon keys and falls back to generic', () => {
    expect(resolveConnectorIconKey('xlr')).toBe('xlr');
    expect(resolveConnectorIconKey('uploaded-image')).toBe('generic');
    expect(resolveConnectorIconKey(null)).toBe('generic');
  });

  it('resolves port group color using override before category color', () => {
    const project = structuredClone(sampleProject);
    const portGroup = project.portGroups[0];

    expect(getPortGroupColor(project, portGroup)).toBe('#2563EB');
    expect(getPortGroupColor(project, { ...portGroup, colorOverride: '#ff00aa' })).toBe('#FF00AA');
  });

  it('resolves connector icon keys from port group connector type', () => {
    const project = structuredClone(sampleProject);
    const portGroup = project.portGroups[0];

    expect(getPortGroupConnectorIconKey(project, portGroup)).toBe('bnc');
    expect(getPortGroupConnectorIconKey(project, { ...portGroup, connectorTypeId: 'missing' })).toBe(
      'generic',
    );
  });
});
