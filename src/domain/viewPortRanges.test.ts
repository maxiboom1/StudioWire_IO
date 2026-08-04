import { describe, expect, it } from 'vitest';
import { getOrderedDevicePortColumns } from './devicePortLayout';
import { sampleProject } from './sampleProject';
import type { Device, ProjectRoot, ProjectView, ViewPortRangeAnnotation } from './types';
import { addViewAnnotation, removeViewPlacement } from './viewOperations';
import {
  getViewPortRangeBounds,
  normalizeViewPortRange,
  resolveViewPortRange,
  VIEW_PORT_RANGE_OVERLAY_WIDTH_MM,
  viewPortRangesOverlap,
} from './viewPortRanges';

function setup() {
  const project = structuredClone(sampleProject) as ProjectRoot;
  const device = project.devices.find((item): item is Device => item.id === 'device-multiviewer-1')!;
  const columns = getOrderedDevicePortColumns(project, device);
  const view: ProjectView = {
    id: 'view-ranges',
    name: 'Ranges',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [
      {
        id: 'placement',
        sourceType: 'device',
        sourceId: device.id,
        xMm: 20,
        yMm: 20,
        scale: 1,
        labelOverride: null,
      },
    ],
    lines: [],
    annotations: [],
  };
  project.views = [view];
  return { project, view, columns };
}

describe('View I/O Ranges', () => {
  it('normalizes reverse and single-row selection in live presentation order', () => {
    const { project, view, columns } = setup();
    const reverse: ViewPortRangeAnnotation = {
      id: 'range',
      kind: 'port_range',
      placementId: 'placement',
      side: 'left',
      startPortId: columns.left[3].id,
      endPortId: columns.left[1].id,
      label: '',
    };
    expect(normalizeViewPortRange(project, view, reverse)).toMatchObject({
      startPortId: columns.left[1].id,
      endPortId: columns.left[3].id,
    });
    const single = { ...reverse, startPortId: columns.left[2].id, endPortId: columns.left[2].id };
    expect(resolveViewPortRange(project, view, single)?.startIndex).toBe(
      resolveViewPortRange(project, view, single)?.endIndex,
    );
    const first = project.ports.find((port) => port.id === reverse.startPortId)!;
    const last = project.ports.find((port) => port.id === reverse.endPortId)!;
    [first.index, last.index] = [last.index, first.index];
    expect(resolveViewPortRange(project, view, reverse)?.startPort.id).toBe(reverse.startPortId);
  });

  it('rejects same-side shared rows while allowing gaps and opposite-side ranges', () => {
    const { project, view, columns } = setup();
    view.annotations.push({
      id: 'existing',
      kind: 'port_range',
      placementId: 'placement',
      side: 'left',
      startPortId: columns.left[0].id,
      endPortId: columns.left[1].id,
      label: 'DA',
    });
    expect(
      viewPortRangesOverlap(project, view, {
        id: 'next',
        kind: 'port_range',
        placementId: 'placement',
        side: 'left',
        startPortId: columns.left[1].id,
        endPortId: columns.left[2].id,
        label: '',
      }),
    ).toBe(true);
    expect(
      viewPortRangesOverlap(project, view, {
        id: 'gap',
        kind: 'port_range',
        placementId: 'placement',
        side: 'left',
        startPortId: columns.left[3].id,
        endPortId: columns.left[3].id,
        label: '',
      }),
    ).toBe(false);
    expect(
      viewPortRangesOverlap(project, view, {
        id: 'other',
        kind: 'port_range',
        placementId: 'placement',
        side: 'right',
        startPortId: 'not-on-right',
        endPortId: 'not-on-right',
        label: '',
      }),
    ).toBe(false);
  });

  it('keeps the refined brace width proportional at every supported device size', () => {
    const { project, view, columns } = setup();
    const range: ViewPortRangeAnnotation = {
      id: 'range-scale',
      kind: 'port_range',
      placementId: 'placement',
      side: 'left',
      startPortId: columns.left[0].id,
      endPortId: columns.left[1].id,
      label: 'Router',
    };

    for (const scale of [0.7, 0.8, 0.9, 1]) {
      view.placements[0].scale = scale;
      const bounds = getViewPortRangeBounds(project, view, range);
      expect(bounds?.widthMm).toBeCloseTo(VIEW_PORT_RANGE_OVERLAY_WIDTH_MM * scale);
      expect(bounds?.xMm).toBeCloseTo(20 - VIEW_PORT_RANGE_OVERLAY_WIDTH_MM * scale);
    }
  });

  it('cascades ranges with placement removal and leaves engineering collections unchanged', () => {
    const { project, view, columns } = setup();
    const engineering = structuredClone({
      devices: project.devices,
      ports: project.ports,
      cables: project.cables,
      racks: project.racks,
      locations: project.locations,
      subLocations: project.subLocations,
      numberingLedgers: project.numberingLedgers,
    });
    const added = addViewAnnotation(project, view.id, {
      id: 'range',
      kind: 'port_range',
      placementId: 'placement',
      side: 'left',
      startPortId: columns.left[0].id,
      endPortId: columns.left[1].id,
      label: 'Router',
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect({
      devices: added.project.devices,
      ports: added.project.ports,
      cables: added.project.cables,
      racks: added.project.racks,
      locations: added.project.locations,
      subLocations: added.project.subLocations,
      numberingLedgers: added.project.numberingLedgers,
    }).toEqual(engineering);
    const removed = removeViewPlacement(added.project, view.id, 'placement');
    expect(removed.ok && removed.project.views[0].annotations).toEqual([]);
  });
});
