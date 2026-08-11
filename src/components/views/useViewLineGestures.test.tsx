/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView, ViewLine } from '../../domain/types';
import { makeLineRouteManual, moveLineSegment } from '../../domain/viewRouteEditing';
import { getRenderedLineRoute, getViewLineSegments } from '../../domain/viewRouting';
import { useViewLineGestures } from './useViewLineGestures';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

afterEach(cleanup);

describe('useViewLineGestures Flex path interaction', () => {
  it('previews and commits one Shift-drag Flex transaction, while cancellation restores the line', () => {
    const project = structuredClone(sampleProject);
    const view = project.views[0];
    const line = view.lines[0];
    const manual = makeLineRouteManual(project, view, line);
    const segment = getViewLineSegments(getRenderedLineRoute(project, view, manual)).find(
      (candidate) => candidate.orientation === 'horizontal' && candidate.lengthMm >= 20,
    )!;
    const updateViewLine = vi.fn();
    const setNotice = vi.fn();
    const selectCanvas = vi.fn();
    const { result } = renderHook(() =>
      useViewLineGestures({
        project,
        view,
        zoom: 1,
        layoutScale: 0.8,
        selectCanvas,
        updateViewLine,
        setNotice,
      }),
    );
    const captureTarget = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperties(captureTarget, {
      setPointerCapture: { value: setPointerCapture },
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: releasePointerCapture },
    });

    act(() => {
      result.current.beginSegmentGesture(
        pointerEvent(captureTarget, { pointerId: 7, clientX: 10, clientY: 10, shiftKey: true }),
        line,
        segment.index,
      );
    });
    act(() => {
      result.current.updatePointer(
        pointerEvent(document.createElement('div'), {
          pointerId: 7,
          clientX: 10,
          clientY: 90,
        }),
      );
    });
    expect(result.current.flexPathPreview).toMatchObject({ lineId: line.id });
    expect(result.current.linePreview?.waypoints.filter((point) => point.flexPathId !== null)).toHaveLength(
      4,
    );
    act(() => {
      result.current.finishPointer(
        pointerEvent(document.createElement('div'), { pointerId: 7, clientX: 10, clientY: 90 }),
      );
    });
    expect(updateViewLine).toHaveBeenCalledTimes(1);
    expect(updateViewLine).toHaveBeenCalledWith(
      view.id,
      line.id,
      expect.objectContaining({ waypoints: expect.any(Array) }),
    );
    expect(releasePointerCapture).toHaveBeenCalledWith(7);

    updateViewLine.mockClear();
    act(() => {
      result.current.beginSegmentGesture(
        pointerEvent(captureTarget, { pointerId: 8, clientX: 10, clientY: 10, shiftKey: true }),
        line,
        segment.index,
      );
    });
    act(() => {
      result.current.updatePointer(
        pointerEvent(document.createElement('div'), {
          pointerId: 8,
          clientX: 10,
          clientY: 90,
        }),
      );
      result.current.cancel();
    });
    expect(updateViewLine).not.toHaveBeenCalled();
    expect(result.current.linePreview).toBeNull();
    expect(result.current.flexPathPreview).toBeNull();
  });

  it('does not commit a Shift-click without meaningful depth', () => {
    const project = structuredClone(sampleProject);
    const view = project.views[0];
    const line = view.lines[0];
    const manual = makeLineRouteManual(project, view, line);
    const segment = getViewLineSegments(getRenderedLineRoute(project, view, manual)).find(
      (candidate) => candidate.lengthMm >= 20,
    )!;
    const updateViewLine = vi.fn();
    const { result } = renderHook(() =>
      useViewLineGestures({
        project,
        view,
        zoom: 1,
        layoutScale: 0.8,
        selectCanvas: vi.fn(),
        updateViewLine,
        setNotice: vi.fn(),
      }),
    );
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    act(() => {
      result.current.beginSegmentGesture(
        pointerEvent(target, { pointerId: 3, clientX: 0, clientY: 0, shiftKey: true }),
        line,
        segment.index,
      );
    });
    act(() => {
      result.current.finishPointer(
        pointerEvent(document.createElement('div'), { pointerId: 3, clientX: 0, clientY: 0 }),
      );
    });
    expect(updateViewLine).not.toHaveBeenCalled();
  });

  it('selects a bend without recording a no-op pointer transaction', () => {
    const project = structuredClone(sampleProject);
    const view = project.views[0];
    const line = makeLineRouteManual(project, view, {
      ...view.lines[0],
      waypoints: [{ xMm: 125, yMm: 120, flexPathId: null }],
    });
    const updateViewLine = vi.fn();
    const { result } = renderHook(() =>
      useViewLineGestures({
        project,
        view,
        zoom: 1,
        layoutScale: 0.8,
        selectCanvas: vi.fn(),
        updateViewLine,
        setNotice: vi.fn(),
      }),
    );
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    act(() => {
      result.current.beginWaypointGesture(
        pointerEvent(target, { pointerId: 11, clientX: 0, clientY: 0 }),
        line,
        0,
      );
    });
    act(() => {
      result.current.finishPointer(
        pointerEvent(document.createElement('div'), { pointerId: 11, clientX: 0, clientY: 0 }),
      );
    });
    expect(updateViewLine).not.toHaveBeenCalled();
  });

  it('magnetically restores a displaced end segment to its exact live port axis', () => {
    const project = structuredClone(sampleProject);
    const view: ProjectView = {
      ...project.views[0],
      id: 'route-snap-view',
      placements: [
        {
          id: 'router',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 10,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
        {
          id: 'multiviewer',
          sourceType: 'device',
          sourceId: 'device-multiviewer-1',
          xMm: 160,
          yMm: 80,
          scale: 1,
          labelOverride: null,
        },
      ],
      lines: [],
      annotations: [],
    };
    const line: ViewLine = {
      ...project.views[0].lines[0],
      from: { kind: 'port', placementId: 'router', portId: 'port-group-router-outputs-port-0001' },
      to: {
        kind: 'port',
        placementId: 'multiviewer',
        portId: 'port-group-multiviewer-inputs-port-0001',
      },
      waypoints: [],
    };
    const original = makeLineRouteManual(project, view, line);
    const originalRoute = getRenderedLineRoute(project, view, original);
    const endSegment = getViewLineSegments(originalRoute).at(-1)!;
    const endpointAxis = endSegment.end.yMm;
    const displacedLine = {
      ...line,
      waypoints: moveLineSegment(project, view, original, endSegment.index, endpointAxis + 30),
    };
    const displacedSegment = getViewLineSegments(getRenderedLineRoute(project, view, displacedLine)).find(
      (segment) => segment.orientation === 'horizontal' && segment.start.yMm > endpointAxis + 20,
    )!;
    const updateViewLine = vi.fn();
    const { result } = renderHook(() =>
      useViewLineGestures({
        project,
        view,
        zoom: 1,
        layoutScale: 1,
        selectCanvas: vi.fn(),
        updateViewLine,
        setNotice: vi.fn(),
      }),
    );
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    act(() => {
      result.current.beginSegmentGesture(
        pointerEvent(target, { pointerId: 15, clientX: 0, clientY: 0 }),
        displacedLine,
        displacedSegment.index,
      );
    });
    act(() => {
      result.current.updatePointer(
        pointerEvent(document.createElement('div'), {
          pointerId: 15,
          clientX: 0,
          clientY: (endpointAxis + 0.1 - displacedSegment.start.yMm) * VIEW_PIXELS_PER_MM,
        }),
      );
    });
    expect(getRenderedLineRoute(project, view, result.current.linePreview ?? displacedLine)).toEqual(
      originalRoute,
    );
    act(() => {
      result.current.finishPointer(
        pointerEvent(document.createElement('div'), { pointerId: 15, clientX: 0, clientY: 0 }),
      );
    });
    expect(updateViewLine).toHaveBeenCalledWith(view.id, line.id, { waypoints: original.waypoints });
  });
});

function pointerEvent<T extends Element>(
  currentTarget: T,
  values: Partial<ReactPointerEvent<T>> & { pointerId: number },
): ReactPointerEvent<T> {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget,
    clientX: 0,
    clientY: 0,
    altKey: false,
    shiftKey: false,
    ...values,
  } as unknown as ReactPointerEvent<T>;
}
