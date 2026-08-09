import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import {
  getViewLineEndpointRole,
  isValidViewLineReconnectTarget,
  viewLineEndpointsEqual,
} from './viewLineReconnection';

describe('View line endpoint reconnection', () => {
  it('identifies each persisted endpoint and accepts only another standard-device placement', () => {
    const project = structuredClone(sampleProject);
    const view = project.views[0];
    const line = view.lines[0];
    expect(getViewLineEndpointRole(line, line.from)).toBe('from');
    expect(getViewLineEndpointRole(line, line.to)).toBe('to');
    expect(viewLineEndpointsEqual(line.from, { ...line.from })).toBe(true);
    expect(isValidViewLineReconnectTarget(project, view, line, 'from', line.to)).toBe(false);

    view.placements.push({
      id: 'third-device',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 30,
      yMm: 250,
      scale: 0.8,
      labelOverride: null,
    });
    expect(
      isValidViewLineReconnectTarget(project, view, line, 'from', {
        kind: 'port',
        placementId: 'third-device',
        portId: 'port-group-router-outputs-port-0002',
      }),
    ).toBe(true);
  });

  it('rejects ports covered by an I/O Range and missing endpoints', () => {
    const project = structuredClone(sampleProject);
    const view = project.views[0];
    const line = view.lines[0];
    view.annotations.push({
      id: 'covered-range',
      kind: 'port_range',
      placementId: 'view-placement-multiviewer-1',
      side: 'left',
      startPortId: 'port-group-multiviewer-inputs-port-0002',
      endPortId: 'port-group-multiviewer-inputs-port-0003',
      label: 'Covered',
    });
    expect(
      isValidViewLineReconnectTarget(project, view, line, 'from', {
        kind: 'port',
        placementId: 'view-placement-multiviewer-1',
        portId: 'port-group-multiviewer-inputs-port-0002',
      }),
    ).toBe(false);
    expect(
      isValidViewLineReconnectTarget(project, view, line, 'from', {
        kind: 'port_range',
        placementId: 'view-placement-multiviewer-1',
        annotationId: 'missing-range',
      }),
    ).toBe(false);
  });
});
