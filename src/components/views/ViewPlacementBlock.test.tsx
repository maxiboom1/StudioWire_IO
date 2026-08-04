/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView, ViewPlacement } from '../../domain/types';
import type { ViewEditorController } from './useViewEditorController';
import { ViewPlacementBlock } from './ViewPlacementBlock';

afterEach(cleanup);

function view(placement: ViewPlacement): ProjectView {
  return {
    id: 'view-main',
    name: 'Main',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [placement],
    lines: [],
    annotations: [],
  };
}

function controller(project = structuredClone(sampleProject)): ViewEditorController {
  return {
    project,
    selectedPlacement: null,
    preview: null,
    dropPreview: null,
    notice: '',
    deviceScaleState: { kind: 'empty', scale: 1 },
    layoutScale: 1,
    focusRequest: 0,
    commitPlacement: vi.fn(),
    removePlacement: vi.fn(),
    changeDeviceScale: vi.fn(),
    selectPlacement: vi.fn(),
    beginGesture: vi.fn(),
    updateGesture: vi.fn(),
    finishGesture: vi.fn(),
    cancelGesture: vi.fn(),
    handlePlacementKeyDown: vi.fn(),
    handlePageDragOver: vi.fn(),
    handlePageDrop: vi.fn(),
    clearDropPreview: vi.fn(),
  };
}

describe('ViewPlacementBlock', () => {
  it('renders a detailed live device without connection editing controls', () => {
    const placement: ViewPlacement = {
      id: 'placement-device',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: 'Core Router',
    };
    const editor = controller();
    render(
      <ViewPlacementBlock
        controller={editor}
        placement={placement}
        project={editor.project}
        selected={false}
        view={view(placement)}
      />,
    );

    expect(screen.getByText('Core Router')).toBeTruthy();
    expect(screen.getByText('RTR1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Connect/ })).toBeNull();
    expect(document.querySelector('[data-canvas-draggable="true"]')).toBeNull();
    expect(document.querySelector('.device-diagram-view')).toBeTruthy();
    expect(document.querySelector('.device-diagram-view-frame')).toBeTruthy();
    const block = screen.getByRole('button', { name: 'Core Router placement' });
    expect(Number(block.style.getPropertyValue('--view-device-diagram-scale'))).toBeCloseTo(276 / 940);
    expect(block.style.height).toBe('82.80000000000001px');
    expect(document.querySelectorAll('.device-body-row')).toHaveLength(4);
    expect(document.querySelectorAll('.device-wire-row-output .device-cable-line').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.device-wire-row-output .device-port-anchor').length).toBeGreaterThan(
      0,
    );
    expect(document.querySelector('.view-device-rows')).toBeNull();
  });

  it('uses live read-only rack contents and a removable missing-source placeholder', () => {
    const project = structuredClone(sampleProject);
    const rackPlacement: ViewPlacement = {
      id: 'placement-rack',
      sourceType: 'rack',
      sourceId: 'rack-mcr-a',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: null,
    };
    const editor = controller(project);
    const { rerender } = render(
      <ViewPlacementBlock
        controller={editor}
        placement={rackPlacement}
        project={project}
        selected={false}
        view={view(rackPlacement)}
      />,
    );
    expect(screen.getByText('MCR Rack A')).toBeTruthy();
    expect(document.querySelector('[draggable="true"]')).toBeNull();

    const missing = { ...rackPlacement, id: 'placement-missing', sourceId: 'rack-missing' };
    rerender(
      <ViewPlacementBlock
        controller={editor}
        placement={missing}
        project={project}
        selected
        view={view(missing)}
      />,
    );
    expect(screen.getAllByText('Missing rack')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Resize Missing rack placement/ })).toBeNull();
  });
});
