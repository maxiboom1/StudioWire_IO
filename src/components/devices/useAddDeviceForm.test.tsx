/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { AddDeviceInput } from '../../state/projectContextTypes';
import { createSequentialAddDeviceLocalIdFactory } from './addDeviceLocalIds';
import { useAddDeviceForm, type AddDeviceFormController } from './useAddDeviceForm';

function projectFixture(): ProjectRoot {
  const project = structuredClone(sampleProject);

  project.subLocations = [
    {
      id: 'sub-location-front-table',
      locationId: 'location-control-room',
      name: 'Front Table',
      description: '',
    },
    {
      id: 'sub-location-mcr-racks',
      locationId: 'location-machine-room',
      name: 'MCR Racks',
      description: '',
    },
  ];

  return project;
}

function renderController(project = projectFixture()) {
  let controller: AddDeviceFormController | null = null;
  const addDevice = vi.fn((input: AddDeviceInput) => {
    void input;
    return 'device-created';
  });
  const onCreated = vi.fn();

  function Harness() {
    controller = useAddDeviceForm({
      addDevice,
      initialLocationId: 'location-machine-room',
      makeLocalId: createSequentialAddDeviceLocalIdFactory('controller'),
      onCreated,
      project,
    });

    return null;
  }

  render(<Harness />);

  if (!controller) {
    throw new Error('controller not initialized');
  }

  return { addDevice, controller: () => controller as AddDeviceFormController, onCreated };
}

afterEach(() => cleanup());

describe('useAddDeviceForm', () => {
  it('initializes draft state from project and initial location', () => {
    const { controller } = renderController();

    expect(controller().device).toEqual(
      expect.objectContaining({
        name: '',
        categoryId: 'category-video',
        locationId: 'location-machine-room',
        mountType: 'virtual',
      }),
    );
    expect(
      controller().portGroups.map((group) => [group.localId, group.name, group.firstCableNumber]),
    ).toEqual([
      ['controller-1', 'SDI IN', 9],
      ['controller-2', 'SDI OUT', 13],
    ]);
  });

  it('updates category by preserving device fields and rebuilding quick groups for the new category', () => {
    const { controller } = renderController();

    act(() => {
      controller().setDevice({ name: 'Audio Console', manufacturer: 'Maker' });
    });
    act(() => {
      controller().updateDeviceCategory('category-audio');
    });

    expect(controller().device).toEqual(
      expect.objectContaining({
        name: 'Audio Console',
        manufacturer: 'Maker',
        categoryId: 'category-audio',
      }),
    );
    expect(
      controller().portGroups.map((group) => [group.localId, group.name, group.connectorTypeId]),
    ).toEqual([
      ['controller-3', 'AUDIO IN', 'connector-xlr'],
      ['controller-4', 'AUDIO OUT', 'connector-xlr'],
    ]);
  });

  it('clears sub-location when location changes to a location that does not own it', () => {
    const { controller } = renderController();

    act(() => {
      controller().setDevice({ subLocationId: 'sub-location-mcr-racks' });
    });
    expect(controller().device.subLocationId).toBe('sub-location-mcr-racks');

    act(() => {
      controller().setDevice({ locationId: 'location-control-room' });
    });

    expect(controller().device).toEqual(
      expect.objectContaining({
        locationId: 'location-control-room',
        subLocationId: null,
      }),
    );
  });

  it('coordinates add, remove, group updates, category changes, and planned toggles', () => {
    const { controller } = renderController();

    act(() => {
      controller().setDevice({ name: 'Router' });
      controller().addPortGroup();
    });
    expect(controller().portGroups.at(-1)).toEqual(
      expect.objectContaining({ localId: 'controller-3', name: 'PORTS', firstCableNumber: 17 }),
    );

    act(() => {
      controller().updatePortGroup('controller-3', { name: 'AUX', count: '2' as any });
    });
    expect(controller().portGroups.at(-1)).toEqual(
      expect.objectContaining({ name: 'AUX', count: 2, firstCableNumber: 17 }),
    );

    act(() => {
      controller().updatePortGroupCategory('controller-3', 'category-network');
    });
    expect(controller().portGroups.at(-1)).toEqual(
      expect.objectContaining({
        categoryId: 'category-network',
        connectorTypeId: 'connector-fiber',
        cablePrefix: 'N',
      }),
    );

    act(() => {
      controller().togglePlannedCables('controller-3', false);
    });
    expect(controller().portGroups.at(-1)).toEqual(expect.objectContaining({ createPlannedCables: false }));

    act(() => {
      controller().removePortGroup('controller-3');
    });
    expect(controller().portGroups.map((group) => group.localId)).toEqual(['controller-1', 'controller-2']);
  });

  it('reorders interface drafts by offset and target ID', () => {
    const { controller } = renderController();

    act(() => {
      controller().movePortGroupByOffset('controller-2', -1);
    });
    expect(controller().portGroups.map((group) => group.localId)).toEqual(['controller-2', 'controller-1']);

    act(() => {
      controller().movePortGroup('controller-2', 'controller-1');
    });
    expect(controller().portGroups.map((group) => group.localId)).toEqual(['controller-1', 'controller-2']);
  });

  it('blocks failed validation and does not dispatch or complete', () => {
    const { addDevice, controller, onCreated } = renderController();

    expect(controller().submit(() => true)).toBe(false);
    expect(addDevice).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('dispatches exact payload and completes after successful validation', () => {
    const { addDevice, controller, onCreated } = renderController();

    act(() => {
      controller().setDevice({ name: 'Router One', code: 'rtr one' });
      controller().removePortGroup('controller-2');
    });

    expect(controller().validation).toEqual({ errors: [], warnings: [] });
    const confirm = vi.fn(() => true);
    expect(controller().submit(confirm)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(addDevice).toHaveBeenCalledWith({
      device: expect.objectContaining({
        name: 'Router One',
        code: 'RTR-ONE',
        labelPrefix: 'RTR-ONE',
        mountType: 'virtual',
        rackId: null,
      }),
      portGroups: [
        expect.objectContaining({
          name: 'SDI IN',
          firstCableNumber: 9,
          createPlannedCables: true,
        }),
      ],
    });
    expect(onCreated).toHaveBeenCalledWith('device-created');
  });
});
