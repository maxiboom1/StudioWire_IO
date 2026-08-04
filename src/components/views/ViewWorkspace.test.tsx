/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectView } from '../../domain/types';
import { sampleProject } from '../../domain/sampleProject';

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

    expect(screen.getByText('Drag a device or rack from the navigator, or use Add object.')).toBeTruthy();
    expect(screen.getByLabelText('Signal Overview A3 portrait page')).toBeTruthy();
    expect(screen.getByLabelText('Current zoom').textContent).toBe('100%');

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Current zoom').textContent).toBe('110%');

    rerender(<ViewWorkspace view={view('view-b', 'Rack Overview')} />);
    await waitFor(() => expect(screen.getByLabelText('Current zoom').textContent).toBe('100%'));
  });

  it('searches and adds a live object from the compact picker', async () => {
    const user = userEvent.setup();
    const currentView = view('view-picker', 'Picker View');
    const addViewPlacement = vi.fn(() => 'placement-new');
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [currentView] },
      addViewPlacement,
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
    };
    render(<ViewWorkspace view={currentView} />);

    await user.click(screen.getByRole('button', { name: 'Add object' }));
    await user.type(screen.getByPlaceholderText(/Search name/), 'XR-16');
    const result = screen.getByRole('button', { name: /Router 1/ });
    expect(within(result).getByText(/Device · RTR1 · XR-16/)).toBeTruthy();
    await user.click(result);

    expect(addViewPlacement).toHaveBeenCalledWith('view-picker', {
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
    });
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
    const updateViewPlacement = vi.fn();
    const removeViewPlacement = vi.fn();
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [currentView] },
      addViewPlacement: vi.fn(),
      updateViewPlacement,
      removeViewPlacement,
    };
    render(
      <ViewWorkspace view={currentView} selectedPlacementId={placement.id} onSelectPlacement={vi.fn()} />,
    );

    const block = screen.getByRole('button', { name: /Router 1 placement, selected/ });
    const header = block.querySelector('.device-body-header.is-draggable');
    const page = screen.getByLabelText('Move View A3 portrait page');
    if (!header) throw new Error('Technical device drag header missing.');
    expect(screen.queryByRole('button', { name: /Resize Router 1 placement/ })).toBeNull();

    fireEvent.pointerDown(header, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(page, { pointerId: 1, clientX: 15, clientY: 0 });
    expect(updateViewPlacement).not.toHaveBeenCalled();
    fireEvent.pointerUp(page, { pointerId: 1, clientX: 15, clientY: 0 });
    expect(updateViewPlacement).toHaveBeenCalledTimes(1);
    expect(updateViewPlacement).toHaveBeenLastCalledWith('view-move', placement.id, {
      xMm: 15,
      yMm: 10,
    });

    updateViewPlacement.mockClear();
    fireEvent.pointerDown(header, { button: 0, pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(page, { pointerId: 2, clientX: 30, clientY: 0 });
    fireEvent.keyDown(block, { key: 'Escape' });
    fireEvent.pointerUp(page, { pointerId: 2, clientX: 30, clientY: 0 });
    expect(updateViewPlacement).not.toHaveBeenCalled();

    fireEvent.keyDown(block, { key: 'ArrowDown', shiftKey: true });
    expect(updateViewPlacement).toHaveBeenCalledWith('view-move', placement.id, {
      xMm: 10,
      yMm: 20,
    });
    fireEvent.keyDown(block, { key: 'Delete' });
    expect(removeViewPlacement).toHaveBeenCalledWith('view-move', placement.id);
  });
});
