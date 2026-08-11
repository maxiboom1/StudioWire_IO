/**
 * @vitest-environment jsdom
 */
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView } from '../../domain/types';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { NAVIGATOR_DRAG_MIME } from '../common/deviceDrag';
import { useViewEditorController } from './useViewEditorController';
import { ViewPage } from './ViewPage';

const contextHarness = vi.hoisted(() => ({
  current: null as ProjectContextValue | null,
}));

vi.mock('../../state/ProjectContext', () => ({
  useProject: () => {
    if (!contextHarness.current) throw new Error('missing test project context');
    return contextHarness.current;
  },
}));

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  window.__studioWireNavigatorDragPayload = undefined;
  vi.clearAllMocks();
});

describe('ViewPage navigator drop', () => {
  it('adds a navigator device at the paper drop point through the shared payload', () => {
    const project = structuredClone(sampleProject);
    const view = emptyView();
    const addViewPlacement = vi.fn(() => 'placement-from-drop');
    contextHarness.current = {
      project,
      addViewPlacement,
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
    } as unknown as ProjectContextValue;

    render(<Harness view={view} />);
    const page = screen.getByLabelText('Main A3 portrait page');
    const transfer = createNavigatorTransfer({ type: 'device', id: 'device-router-1' });

    dispatchDrag(page, 'dragOver', transfer);
    expect(screen.getByText('Place object')).toBeTruthy();

    dispatchDrag(page, 'drop', transfer);

    expect(addViewPlacement).toHaveBeenCalledWith('view-main', {
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 24.680851,
      yMm: 19.787234,
      scale: 1,
    });
  });

  it('focuses the existing placement instead of duplicating a dropped device', () => {
    const project = structuredClone(sampleProject);
    const view = emptyView();
    view.placements.push({
      id: 'placement-existing',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: null,
    });
    const addViewPlacement = vi.fn(() => 'placement-from-drop');
    contextHarness.current = {
      project,
      addViewPlacement,
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
    } as unknown as ProjectContextValue;

    render(<Harness view={view} />);
    const page = screen.getByLabelText('Main A3 portrait page');
    const transfer = createNavigatorTransfer({ type: 'device', id: 'device-router-1' });

    dispatchDrag(page, 'dragOver', transfer);
    expect(screen.getByText('Already in View')).toBeTruthy();
    dispatchDrag(page, 'drop', transfer);

    expect(addViewPlacement).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Router 1 placement, selected' })).toBeTruthy();
  });

  it('inherits the current View-wide device size for a newly dropped device', () => {
    const project = structuredClone(sampleProject);
    const view = emptyView();
    view.placements.push({
      id: 'placement-existing',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 0.8,
      labelOverride: null,
    });
    const addViewPlacement = vi.fn(() => 'placement-from-drop');
    contextHarness.current = {
      project,
      addViewPlacement,
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
    } as unknown as ProjectContextValue;

    render(<Harness view={view} />);
    const page = screen.getByLabelText('Main A3 portrait page');
    const transfer = createNavigatorTransfer({ type: 'device', id: 'device-multiviewer-1' });
    dispatchDrag(page, 'drop', transfer);

    expect(addViewPlacement).toHaveBeenCalledWith(
      'view-main',
      expect.objectContaining({
        sourceId: 'device-multiviewer-1',
        sourceType: 'device',
        scale: 0.8,
      }),
    );
  });

  it('limits canvas focus emphasis to keyboard input modality', () => {
    const project = structuredClone(sampleProject);
    contextHarness.current = {
      project,
      addViewPlacement: vi.fn(),
      updateViewPlacement: vi.fn(),
      removeViewPlacement: vi.fn(),
    } as unknown as ProjectContextValue;

    render(<Harness view={emptyView()} />);
    const page = screen.getByLabelText('Main A3 portrait page');
    expect(page.dataset.inputModality).toBe('pointer');
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(page.dataset.inputModality).toBe('keyboard');
    fireEvent.pointerDown(window, { pointerId: 4 });
    expect(page.dataset.inputModality).toBe('pointer');
  });
});

function Harness({ view }: { view: ProjectView }) {
  const [canvasSelection, setCanvasSelection] = useState<
    import('./viewEditorTypes').ViewCanvasSelection | null
  >(null);
  const controller = useViewEditorController({
    view,
    zoom: 1,
    canvasSelection,
    onCanvasSelectionChange: setCanvasSelection,
  });

  return <ViewPage controller={controller} page={{ widthMm: 297, heightMm: 420 }} view={view} zoom={1} />;
}

function emptyView(): ProjectView {
  return {
    id: 'view-main',
    name: 'Main',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
  };
}

function createNavigatorTransfer(payload: { type: 'device' | 'rack'; id: string }) {
  const data = new Map([[NAVIGATOR_DRAG_MIME, JSON.stringify(payload)]]);

  return {
    dropEffect: 'none',
    effectAllowed: 'move',
    getData: (type: string) => data.get(type) ?? '',
    setData: (type: string, value: string) => data.set(type, value),
  } as unknown as DataTransfer;
}

function dispatchDrag(element: HTMLElement, type: 'dragOver' | 'drop', dataTransfer: DataTransfer) {
  const event = createEvent[type](element, { dataTransfer });
  Object.defineProperties(event, {
    clientX: { value: 75 },
    clientY: { value: 60 },
    altKey: { value: false },
  });
  fireEvent(element, event);
}
