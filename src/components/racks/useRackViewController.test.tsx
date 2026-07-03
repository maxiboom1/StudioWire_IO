/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { Device, ProjectRoot, Rack } from '../../domain/types';
import { useRackViewController } from './useRackViewController';

interface DragDataTransfer {
  dropEffect: string;
  effectAllowed: string;
  getData: ReturnType<typeof vi.fn>;
  setData: ReturnType<typeof vi.fn>;
}

function projectFixture(): ProjectRoot {
  const project = structuredClone(sampleProject);
  const baseRack = project.racks[0];

  project.racks = [
    baseRack,
    rack('rack-b', 'MCR Rack B'),
    rack('rack-c', 'MCR Rack C'),
    rack('rack-d', 'MCR Rack D'),
    rack('rack-e', 'MCR Rack E'),
  ];
  project.devices = [
    {
      ...project.devices[0],
      rackSizeRu: 2,
      rackBottomRu: null,
      rackId: null,
      mountType: 'rack',
    } as Device,
  ];

  return project;
}

function rack(id: string, name: string): Rack {
  return {
    id,
    locationId: 'location-machine-room',
    subLocationId: null,
    name,
    heightRu: 10,
    numberingDirection: 'bottom_to_top',
  };
}

function dataTransfer(deviceId = ''): DragDataTransfer {
  const data = new Map<string, string>();

  if (deviceId) {
    data.set('application/x-studiowire-device-id', deviceId);
  }

  return {
    dropEffect: '',
    effectAllowed: '',
    getData: vi.fn((key: string) => data.get(key) ?? ''),
    setData: vi.fn((key: string, value: string) => data.set(key, value)),
  };
}

function dragEvent(options: {
  clientY?: number;
  transfer?: DragDataTransfer;
  top?: number;
  height?: number;
}) {
  return {
    clientY: options.clientY ?? 0,
    dataTransfer: options.transfer ?? dataTransfer(),
    preventDefault: vi.fn(),
    currentTarget: {
      getBoundingClientRect: () => ({
        top: options.top ?? 0,
        height: options.height ?? 100,
      }),
    },
  } as any;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.__studioWireDraggingDeviceId = undefined;
});

describe('useRackViewController', () => {
  it('initializes from the selected rack, resets on selected rack change, and clears stale drag state', () => {
    const project = projectFixture();
    const moveMountedDevice = vi.fn();
    const { result, rerender } = renderHook(
      ({ selectedRack }) => useRackViewController({ project, selectedRack, moveMountedDevice }),
      { initialProps: { selectedRack: project.racks[0] } },
    );

    act(() => {
      result.current.addRackToView('rack-b');
      result.current.handleDeviceDragStart(dragEvent({ transfer: dataTransfer() }), project.devices[0]);
    });
    expect(result.current.viewedRackIds).toEqual(['rack-mcr-a', 'rack-b']);
    expect(result.current.draggingDeviceId).toBe('device-router-1');

    rerender({ selectedRack: project.racks[2] });

    expect(result.current.viewedRackIds).toEqual(['rack-c']);
    expect(result.current.draggingDeviceId).toBeNull();
    expect(result.current.dropPreview).toBeNull();
  });

  it('adds up to four unique racks, ignores duplicates, and preserves at least one viewed rack on removal', () => {
    const project = projectFixture();
    const { result } = renderHook(() =>
      useRackViewController({ project, selectedRack: project.racks[0], moveMountedDevice: vi.fn() }),
    );

    act(() => {
      result.current.addRackToView('rack-b');
      result.current.addRackToView('rack-c');
      result.current.addRackToView('rack-d');
      result.current.addRackToView('rack-e');
      result.current.addRackToView('rack-b');
    });

    expect(result.current.viewedRackIds).toEqual(['rack-mcr-a', 'rack-b', 'rack-c', 'rack-d']);
    expect(result.current.hasReachedRackLimit).toBe(true);
    expect(result.current.addableRacks.map((rack) => rack.id)).toEqual(['rack-e']);

    act(() => {
      result.current.removeRackFromView('rack-b');
      result.current.removeRackFromView('rack-c');
      result.current.removeRackFromView('rack-d');
      result.current.removeRackFromView('rack-mcr-a');
    });

    expect(result.current.viewedRackIds).toEqual(['rack-mcr-a']);
  });

  it('sets valid and invalid dragover previews and drop effects', () => {
    const project = projectFixture();
    project.devices.push({
      ...project.devices[0],
      id: 'device-blocker',
      name: 'Blocker',
      rackId: 'rack-b',
      rackBottomRu: 8,
      rackSizeRu: 2,
    });
    const { result } = renderHook(() =>
      useRackViewController({ project, selectedRack: project.racks[0], moveMountedDevice: vi.fn() }),
    );
    const startTransfer = dataTransfer();

    act(() => {
      result.current.handleDeviceDragStart(dragEvent({ transfer: startTransfer }), project.devices[0]);
    });

    const validTransfer = dataTransfer();
    act(() => {
      result.current.handleRackDragOver(
        dragEvent({ clientY: 90, transfer: validTransfer }),
        project.racks[1],
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      );
    });
    expect(result.current.dropPreview).toMatchObject({
      rackId: 'rack-b',
      bottomRu: 1,
      topRu: 2,
      ok: true,
      message: 'Move to MCR Rack B RU 1-2',
    });
    expect(validTransfer.dropEffect).toBe('move');

    const invalidTransfer = dataTransfer();
    act(() => {
      result.current.handleRackDragOver(
        dragEvent({ clientY: 20, transfer: invalidTransfer }),
        project.racks[1],
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      );
    });
    expect(result.current.dropPreview).toMatchObject({
      rackId: 'rack-b',
      bottomRu: 8,
      topRu: 8,
      ok: false,
      message: 'Target RU range overlaps Blocker.',
    });
    expect(invalidTransfer.dropEffect).toBe('none');
  });

  it('moves only after valid drop and clears drag data for valid, invalid, missing, and drag-end paths', () => {
    const project = projectFixture();
    const moveMountedDevice = vi.fn();
    const { result } = renderHook(() =>
      useRackViewController({ project, selectedRack: project.racks[0], moveMountedDevice }),
    );

    act(() => {
      result.current.handleRackDrop(
        dragEvent({ transfer: dataTransfer() }),
        project.racks[1],
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      );
    });
    expect(moveMountedDevice).not.toHaveBeenCalled();

    act(() => {
      result.current.handleDeviceDragStart(dragEvent({ transfer: dataTransfer() }), project.devices[0]);
      result.current.handleRackDrop(
        dragEvent({ clientY: 90, transfer: dataTransfer() }),
        project.racks[1],
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      );
    });
    expect(moveMountedDevice).toHaveBeenCalledWith({
      deviceId: 'device-router-1',
      targetRackId: 'rack-b',
      targetBottomRu: 1,
    });
    expect(result.current.draggingDeviceId).toBeNull();
    expect(result.current.dropPreview).toBeNull();
    expect(window.__studioWireDraggingDeviceId).toBeUndefined();

    act(() => {
      result.current.handleDeviceDragEnd();
    });
    expect(result.current.draggingDeviceId).toBeNull();
  });
});
