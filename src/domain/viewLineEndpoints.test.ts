import { describe, expect, it } from 'vitest';
import { getOrderedDevicePortColumns } from './devicePortLayout';
import { sampleProject } from './sampleProject';
import type { ProjectRoot, ProjectView } from './types';
import { getCoveredViewPortIds, resolveViewLineEndpoint } from './viewLineEndpoints';

function fixture(): { project: ProjectRoot; view: ProjectView } {
  const project = structuredClone(sampleProject);
  const view: ProjectView = {
    id: 'view-endpoints',
    name: 'Endpoints',
    description: '',
    pageSize: 'a3',
    orientation: 'landscape',
    placements: [
      {
        id: 'router',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 20,
        yMm: 30,
        scale: 1,
        labelOverride: null,
      },
      {
        id: 'multiviewer',
        sourceType: 'device',
        sourceId: 'device-multiviewer-1',
        xMm: 180,
        yMm: 80,
        scale: 1,
        labelOverride: null,
      },
    ],
    lines: [],
    annotations: [],
  };
  return { project, view };
}

describe('View line endpoint resolution', () => {
  it('resolves exact left/right white-square centers and follows movement and all device sizes', () => {
    const { project, view } = fixture();
    const right = {
      kind: 'port' as const,
      placementId: 'router',
      portId: 'port-group-router-outputs-port-0001',
    };
    const left = {
      kind: 'port' as const,
      placementId: 'multiviewer',
      portId: 'port-group-multiviewer-inputs-port-0001',
    };
    const firstRight = resolveViewLineEndpoint(project, view, right)!;
    const firstLeft = resolveViewLineEndpoint(project, view, left)!;
    expect(firstRight.side).toBe('right');
    expect(firstRight.normal.xMm).toBe(1);
    expect(firstLeft.side).toBe('left');
    expect(firstLeft.normal.xMm).toBe(-1);
    expect(firstRight.point.xMm).toBeGreaterThan(firstLeft.placement.xMm - 200);

    for (const scale of [0.7, 0.8, 0.9, 1]) {
      view.placements[0].scale = scale;
      const resolved = resolveViewLineEndpoint(project, view, right)!;
      expect(resolved.point.xMm - view.placements[0].xMm).toBeCloseTo((931 * 92 * scale) / 940);
    }
    view.placements[0].xMm += 12.5;
    expect(resolveViewLineEndpoint(project, view, right)!.point.xMm).toBeCloseTo(32.5 + (931 * 92) / 940);
  });

  it('keeps port IDs stable while row insertion/reorder changes current geometry', () => {
    const { project, view } = fixture();
    const endpoint = {
      kind: 'port' as const,
      placementId: 'router',
      portId: 'port-group-router-outputs-port-0002',
    };
    const before = resolveViewLineEndpoint(project, view, endpoint)!;
    const first = project.ports.find((port) => port.id === 'port-group-router-outputs-port-0001')!;
    project.ports.push({ ...first, id: 'inserted-router-port', index: 0, label: 'INSERTED' });
    for (const port of project.ports.filter(
      (item) => item.deviceId === 'device-router-1' && item.id !== 'inserted-router-port',
    )) {
      port.index += 1;
    }
    const after = resolveViewLineEndpoint(project, view, endpoint)!;
    expect(after.port?.id).toBe(endpoint.portId);
    expect(after.point.yMm).toBeGreaterThan(before.point.yMm);
  });

  it('resolves range midpoint anchors and suppresses only covered port rows', () => {
    const { project, view } = fixture();
    const device = project.devices.find((item) => item.id === 'device-multiviewer-1')!;
    const ports = getOrderedDevicePortColumns(project, device).left;
    view.annotations.push({
      id: 'range-left',
      kind: 'port_range',
      placementId: 'multiviewer',
      side: 'left',
      startPortId: ports[0].id,
      endPortId: ports[2].id,
      label: 'CAMERAS',
    });
    const resolved = resolveViewLineEndpoint(project, view, {
      kind: 'port_range',
      placementId: 'multiviewer',
      annotationId: 'range-left',
    })!;
    expect(resolved.side).toBe('left');
    expect(resolved.range?.id).toBe('range-left');
    expect(resolved.point.yMm).toBeGreaterThan(view.placements[1].yMm);
    expect(getCoveredViewPortIds(project, view, 'multiviewer')).toEqual(
      new Set([ports[0].id, ports[1].id, ports[2].id]),
    );
  });

  it('rejects TB, rack, missing-source, missing-port, and mismatched-range anchors', () => {
    const { project, view } = fixture();
    view.placements.push(
      {
        id: 'rack',
        sourceType: 'rack',
        sourceId: 'rack-mcr-a',
        xMm: 0,
        yMm: 0,
        scale: 1,
        labelOverride: null,
      },
      {
        id: 'missing',
        sourceType: 'device',
        sourceId: 'missing-device',
        xMm: 0,
        yMm: 0,
        scale: 1,
        labelOverride: null,
      },
    );
    expect(
      resolveViewLineEndpoint(project, view, { kind: 'port', placementId: 'rack', portId: 'x' }),
    ).toBeNull();
    expect(
      resolveViewLineEndpoint(project, view, { kind: 'port', placementId: 'missing', portId: 'x' }),
    ).toBeNull();
    expect(
      resolveViewLineEndpoint(project, view, { kind: 'port', placementId: 'router', portId: 'x' }),
    ).toBeNull();
    expect(
      resolveViewLineEndpoint(project, view, {
        kind: 'port_range',
        placementId: 'router',
        annotationId: 'missing-range',
      }),
    ).toBeNull();
  });
});
