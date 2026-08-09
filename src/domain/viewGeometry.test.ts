import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { Device, ViewPlacement } from './types';
import {
  DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  getPlacementNaturalSize,
  VIEW_DEVICE_WIDTH_MM,
} from './viewGeometry';

describe('View device geometry', () => {
  it('uses one uniform Device Workspace ratio for standard-device width and height', () => {
    const placement: ViewPlacement = {
      id: 'placement-router',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 0,
      yMm: 0,
      scale: 1,
      labelOverride: null,
    };

    const size = getPlacementNaturalSize(sampleProject, placement);
    const expectedHeight =
      ((DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX + 4 * DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX) *
        VIEW_DEVICE_WIDTH_MM) /
      DEVICE_DIAGRAM_SOURCE_WIDTH_PX;

    expect(size.widthMm).toBe(VIEW_DEVICE_WIDTH_MM);
    expect(size.heightMm).toBeCloseTo(expectedHeight);
  });

  it('keeps the compact terminal-block geometry independent from the standard-device diagram', () => {
    const project = structuredClone(sampleProject);
    const deviceIndex = project.devices.findIndex((device) => device.id === 'device-router-1');
    const source = project.devices[deviceIndex];
    if (!source) throw new Error('Expected sample router.');
    project.devices[deviceIndex] = { ...source, kind: 'terminal_block' } as Device;

    const size = getPlacementNaturalSize(project, {
      id: 'placement-tb',
      sourceType: 'device',
      sourceId: source.id,
      xMm: 0,
      yMm: 0,
      scale: 1,
      labelOverride: null,
    });

    expect(size.widthMm).toBe(VIEW_DEVICE_WIDTH_MM);
    expect(size.heightMm).toBeCloseTo(14.2562, 4);
  });
});
