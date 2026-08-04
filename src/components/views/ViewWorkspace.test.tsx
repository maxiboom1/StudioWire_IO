/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { ProjectView } from '../../domain/types';
import { sampleProject } from '../../domain/sampleProject';
import type { ViewCanvasSelection } from './viewEditorTypes';

const contextHarness = vi.hoisted(() => ({ current: null as any }));

vi.mock('../../state/ProjectContext', () => ({
  useProject: () => contextHarness.current,
}));
import { ViewWorkspace } from './ViewWorkspace';

function view(id: string, name: string): ProjectView {
  return {
    id,
    name,
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
  };
}

afterEach(cleanup);

describe('ViewWorkspace', () => {
  it('renders the exact empty state on an ISO page and resets transient zoom for another View', async () => {
    const user = userEvent.setup();
    const first = view('view-a', 'Signal Overview');
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [first] },
      addViewPlacement: vi.fn(),
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
    };
    const { rerender } = render(<ViewWorkspace view={first} />);

    expect(screen.getByText('Drag a device or rack from the navigator.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add object' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Area' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Group' })).toBeNull();
    expect(screen.getByLabelText('Signal Overview A3 portrait page')).toBeTruthy();
    expect(screen.getByLabelText('Current zoom').textContent).toBe('100%');

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Current zoom').textContent).toBe('110%');

    rerender(<ViewWorkspace view={view('view-b', 'Rack Overview')} />);
    await waitFor(() => expect(screen.getByLabelText('Current zoom').textContent).toBe('100%'));
  });

  it('commits move-only pointer gestures once, cancels cleanly, and supports keyboard nudge/delete', () => {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: MouseEvent,
    });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    const placement = {
      id: 'placement-router',
      sourceType: 'device' as const,
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: null,
    };
    const currentView = { ...view('view-move', 'Move View'), placements: [placement] };
    const replaceViewCanvas = vi.fn();
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [currentView] },
      addViewPlacement: vi.fn(),
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
      replaceViewCanvas,
    };
    render(
      <ViewWorkspace
        view={currentView}
        canvasSelection={{
          kind: 'movable',
          value: {
            primary: { kind: 'placement', id: placement.id },
            items: [{ kind: 'placement', id: placement.id }],
          },
        }}
        onCanvasSelectionChange={vi.fn()}
      />,
    );

    const block = screen.getByRole('button', { name: /Router 1 placement, selected/ });
    const header = block.querySelector('.device-body-header.is-draggable');
    const page = screen.getByLabelText('Move View A3 portrait page');
    if (!header) throw new Error('Technical device drag header missing.');
    expect(screen.queryByRole('button', { name: /Resize Router 1 placement/ })).toBeNull();

    fireEvent.pointerDown(header, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(page, { pointerId: 1, clientX: 180, clientY: 0 });
    expect(replaceViewCanvas).not.toHaveBeenCalled();
    fireEvent.pointerUp(page, { pointerId: 1, clientX: 180, clientY: 0 });
    expect(replaceViewCanvas).toHaveBeenCalledTimes(1);
    expect(replaceViewCanvas).toHaveBeenLastCalledWith('view-move', {
      placements: [expect.objectContaining({ id: placement.id, xMm: 68.723404, yMm: 10 })],
      lines: [],
      annotations: [],
    });

    replaceViewCanvas.mockClear();
    fireEvent.pointerDown(header, { button: 0, pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(page, { pointerId: 2, clientX: 30, clientY: 0 });
    fireEvent.keyDown(block, { key: 'Escape' });
    fireEvent.pointerUp(page, { pointerId: 2, clientX: 30, clientY: 0 });
    expect(replaceViewCanvas).not.toHaveBeenCalled();

    fireEvent.keyDown(block, { key: 'ArrowDown', shiftKey: true });
    expect(replaceViewCanvas).toHaveBeenCalledWith('view-move', {
      placements: [expect.objectContaining({ id: placement.id, xMm: 10, yMm: 34.468085 })],
      lines: [],
      annotations: [],
    });
    replaceViewCanvas.mockClear();
    fireEvent.keyDown(block, { key: 'Delete' });
    expect(replaceViewCanvas).toHaveBeenCalledWith('view-move', {
      placements: [],
      lines: [],
      annotations: [],
    });
  });

  it('applies one preset size to every View device while preserving logical grid cells', async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    const currentView = {
      ...view('view-scale', 'Scale View'),
      placements: [
        {
          id: 'placement-router',
          sourceType: 'device' as const,
          sourceId: 'device-router-1',
          xMm: 10,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
        {
          id: 'placement-multiviewer',
          sourceType: 'device' as const,
          sourceId: 'device-multiviewer-1',
          xMm: 112,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
      ],
    };
    const replaceViewCanvas = vi.fn();
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [currentView] },
      addViewPlacement: vi.fn(),
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
      replaceViewCanvas,
    };
    render(<ViewWorkspace view={currentView} />);

    await user.click(screen.getByRole('combobox', { name: 'Device size for all devices in this View' }));
    await user.click(await screen.findByRole('option', { name: '80%' }));

    expect(replaceViewCanvas).toHaveBeenCalledWith('view-scale', {
      placements: [
        expect.objectContaining({ id: 'placement-router', xMm: 10, yMm: 10, scale: 0.8 }),
        expect.objectContaining({ id: 'placement-multiviewer', xMm: 92.212774, yMm: 10, scale: 0.8 }),
      ],
      lines: [],
      annotations: [],
    });
    expect(screen.queryByText(/Device size set to/)).toBeNull();
  });

  it('adds fully enclosed items with Shift-marquee and moves the resulting selection once', () => {
    Object.defineProperty(window, 'PointerEvent', { configurable: true, value: MouseEvent });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    const currentView = {
      ...view('view-multi', 'Multi View'),
      placements: [
        {
          id: 'placement-router',
          sourceType: 'device' as const,
          sourceId: 'device-router-1',
          xMm: 10,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
        {
          id: 'placement-multiviewer',
          sourceType: 'device' as const,
          sourceId: 'device-multiviewer-1',
          xMm: 110,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
      ],
    };
    const replaceViewCanvas = vi.fn();
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [currentView] },
      addViewPlacement: vi.fn(),
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
      replaceViewCanvas,
    };

    function Harness() {
      const [selection, setSelection] = useState<ViewCanvasSelection | null>({
        kind: 'movable',
        value: {
          primary: { kind: 'placement', id: 'placement-router' },
          items: [{ kind: 'placement', id: 'placement-router' }],
        },
      });
      return (
        <ViewWorkspace
          view={currentView}
          canvasSelection={selection}
          onCanvasSelectionChange={setSelection}
        />
      );
    }

    render(<Harness />);
    const page = screen.getByLabelText('Multi View A3 portrait page');
    fireEvent.pointerDown(page, {
      button: 0,
      pointerId: 20,
      clientX: 100 * 3,
      clientY: 0,
      shiftKey: true,
    });
    fireEvent.pointerMove(page, { pointerId: 20, clientX: 210 * 3, clientY: 100 * 3 });
    fireEvent.pointerUp(page, {
      pointerId: 20,
      clientX: 210 * 3,
      clientY: 100 * 3,
      shiftKey: true,
    });

    const router = screen.getByRole('button', { name: /Router 1 placement, selected/ });
    expect(screen.getByRole('button', { name: /Multiviewer 1 placement, selected/ })).toBeTruthy();
    const header = router.querySelector('.device-body-header.is-draggable');
    if (!header) throw new Error('Technical device drag header missing.');
    fireEvent.pointerDown(header, { button: 0, pointerId: 21, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(page, { pointerId: 21, clientX: 45, clientY: 45 });
    expect(replaceViewCanvas).not.toHaveBeenCalled();
    fireEvent.pointerUp(page, { pointerId: 21, clientX: 45, clientY: 45 });

    expect(replaceViewCanvas).toHaveBeenCalledTimes(1);
    const canvas = replaceViewCanvas.mock.calls[0][1];
    expect(canvas.placements[0].xMm - currentView.placements[0].xMm).toBeCloseTo(
      canvas.placements[1].xMm - currentView.placements[1].xMm,
      6,
    );
    expect(canvas.placements[0].yMm - currentView.placements[0].yMm).toBeCloseTo(
      canvas.placements[1].yMm - currentView.placements[1].yMm,
      6,
    );
    expect(canvas.placements[1].xMm - canvas.placements[0].xMm).toBe(100);
    expect(canvas.placements[1].yMm - canvas.placements[0].yMm).toBe(0);
  });

  it('previews a route-constrained label drag and commits one normalized position on release', () => {
    Object.defineProperty(window, 'PointerEvent', { configurable: true, value: MouseEvent });
    Object.defineProperty(SVGElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    const currentView: ProjectView = {
      ...view('view-line-label', 'Line Label View'),
      placements: [
        {
          id: 'router',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 20,
          yMm: 20,
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
      lines: [
        {
          id: 'line-label',
          from: {
            kind: 'port',
            placementId: 'router',
            portId: 'port-group-router-outputs-port-0001',
          },
          to: {
            kind: 'port',
            placementId: 'multiviewer',
            portId: 'port-group-multiviewer-inputs-port-0001',
          },
          label: '12x SDI',
          waypoints: [],
          color: 'black',
          width: 'thin',
          labelOrientation: 'horizontal',
          labelPosition: 0.5,
        },
      ],
    };
    const updateViewLine = vi.fn();
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [currentView] },
      addViewPlacement: vi.fn(),
      replaceViewCanvas: vi.fn(),
      addViewLine: vi.fn(),
      updateViewLine,
      removeViewLine: vi.fn(),
      addViewAnnotation: vi.fn(),
      updateViewAnnotation: vi.fn(),
      removeViewAnnotation: vi.fn(),
    };
    const { container } = render(
      <ViewWorkspace
        view={currentView}
        canvasSelection={{ kind: 'line', id: 'line-label' }}
        onCanvasSelectionChange={vi.fn()}
      />,
    );
    const label = container.querySelector('.view-line-label');
    const page = screen.getByLabelText('Line Label View A3 portrait page');
    if (!label) throw new Error('Expected line label.');
    fireEvent.pointerDown(label, { pointerId: 31, clientX: 300, clientY: 150 });
    fireEvent.pointerMove(page, { pointerId: 31, clientX: 420, clientY: 240 });
    expect(updateViewLine).not.toHaveBeenCalled();
    fireEvent.pointerUp(page, { pointerId: 31, clientX: 420, clientY: 240 });
    expect(updateViewLine).toHaveBeenCalledTimes(1);
    expect(updateViewLine).toHaveBeenCalledWith('view-line-label', 'line-label', {
      labelPosition: expect.any(Number),
    });
    expect(updateViewLine.mock.calls[0][2].labelPosition).toBeGreaterThanOrEqual(0);
    expect(updateViewLine.mock.calls[0][2].labelPosition).toBeLessThanOrEqual(1);
  });
});
