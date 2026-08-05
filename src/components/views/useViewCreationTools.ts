import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewLineEndpoint, ViewPoint } from '../../domain/types';
import { DEFAULT_VIEW_LINE_STYLE } from '../../domain/viewLineStyles';
import { normalizeViewPortRange, viewPortRangesOverlap } from '../../domain/viewPortRanges';
import { snapViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import type { ViewCanvasSelection, ViewEditorTool } from './viewEditorTypes';

interface GroupDraft {
  viewId: string;
  pointerId: number;
  captureTarget: HTMLElement;
  start: ViewPoint;
  current: ViewPoint;
}

interface PortRangeDraft {
  placementId: string;
  side: 'left' | 'right';
  portId: string;
}

interface ViewCreationToolOptions {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  layoutScale: ViewDeviceScale;
  page: { widthMm: number; heightMm: number };
  addViewLine: ProjectContextValue['addViewLine'];
  addViewAnnotation: ProjectContextValue['addViewAnnotation'];
  selectCanvas: (selection: ViewCanvasSelection | null) => void;
  requestFocus: (inspector?: boolean) => void;
  setNotice: (notice: string) => void;
}

export function useViewCreationTools(options: ViewCreationToolOptions) {
  const {
    project,
    view,
    zoom,
    layoutScale,
    page,
    addViewLine,
    addViewAnnotation,
    selectCanvas,
    requestFocus,
    setNotice,
  } = options;
  const [tool, setToolState] = useState<ViewEditorTool>('select');
  const [lineDraft, setLineDraft] = useState<ViewLineEndpoint | null>(null);
  const [linePointer, setLinePointer] = useState<ViewPoint | null>(null);
  const [portRangeDraft, setPortRangeDraft] = useState<PortRangeDraft | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const groupDraftRef = useRef<GroupDraft | null>(null);
  groupDraftRef.current = groupDraft;

  useEffect(() => {
    if (groupDraft) releasePointerCaptureSafely(groupDraft.captureTarget, groupDraft.pointerId);
    setToolState('select');
    setLineDraft(null);
    setLinePointer(null);
    setPortRangeDraft(null);
    setGroupDraft(null);
  }, [view.id]);

  useEffect(
    () => () => {
      const draft = groupDraftRef.current;
      if (draft) releasePointerCaptureSafely(draft.captureTarget, draft.pointerId);
    },
    [],
  );

  function setTool(next: ViewEditorTool) {
    setToolState(next);
    setLineDraft(null);
    setLinePointer(null);
    setPortRangeDraft(null);
    setGroupDraft(null);
    setNotice('');
  }

  function cancel() {
    if (groupDraft) {
      releasePointerCaptureSafely(groupDraft.captureTarget, groupDraft.pointerId);
      setGroupDraft(null);
      return true;
    }
    if (lineDraft || portRangeDraft) {
      setLineDraft(null);
      setLinePointer(null);
      setPortRangeDraft(null);
      setNotice('');
      return true;
    }
    if (tool !== 'select') {
      setTool('select');
      return true;
    }
    return false;
  }

  function pagePoint(event: PointerEvent<HTMLElement>, snap = true) {
    const raw = {
      xMm: (event.clientX - event.currentTarget.getBoundingClientRect().left) / zoom / VIEW_PIXELS_PER_MM,
      yMm: (event.clientY - event.currentTarget.getBoundingClientRect().top) / zoom / VIEW_PIXELS_PER_MM,
    };
    return snap && !event.altKey ? snapViewLayoutPosition(raw, layoutScale) : raw;
  }

  function handleLineAnchor(endpoint: ViewLineEndpoint) {
    if (tool !== 'line') return;
    if (!lineDraft) {
      setLineDraft(endpoint);
      setNotice('Choose an anchor on a different placement.');
      return;
    }
    if (lineDraft.placementId === endpoint.placementId) {
      setNotice('Choose a different placement.');
      return;
    }
    const id = addViewLine(view.id, {
      from: lineDraft,
      to: endpoint,
      label: '',
      waypoints: [],
      ...DEFAULT_VIEW_LINE_STYLE,
    });
    selectCanvas({ kind: 'line', id });
    setTool('select');
    requestFocus(true);
  }

  function handlePortRangeRow(placementId: string, side: 'left' | 'right', portId: string) {
    if (tool !== 'portRange') return;
    if (!portRangeDraft) {
      setPortRangeDraft({ placementId, side, portId });
      setNotice('Choose the last I/O row on the same side.');
      return;
    }
    if (portRangeDraft.placementId !== placementId || portRangeDraft.side !== side) {
      setNotice('Choose a row on the same device side.');
      return;
    }
    const candidate = normalizeViewPortRange(project, view, {
      id: '__draft__',
      kind: 'port_range',
      placementId,
      side,
      startPortId: portRangeDraft.portId,
      endPortId: portId,
      label: '',
    });
    if (!candidate || viewPortRangesOverlap(project, view, candidate)) {
      setNotice('Those rows overlap an existing I/O Range.');
      return;
    }
    const id = addViewAnnotation(view.id, {
      kind: 'port_range',
      placementId,
      side,
      startPortId: candidate.startPortId,
      endPortId: candidate.endPortId,
      label: '',
    });
    selectCanvas({ kind: 'portRange', id });
    setTool('select');
    requestFocus(true);
  }

  function handlePagePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (tool === 'text') {
      createText(pagePoint(event), false);
      return;
    }
    if (tool === 'group') {
      const start = pagePoint(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      setGroupDraft({
        viewId: view.id,
        pointerId: event.pointerId,
        captureTarget: event.currentTarget,
        start,
        current: start,
      });
      return;
    }
    if (tool === 'line') {
      setNotice(lineDraft ? 'Finish on an anchor on a different placement.' : 'Choose a placement anchor.');
      return;
    }
    if (tool === 'portRange') {
      setNotice('Choose an I/O row beside a standard device.');
      return;
    }
    return;
  }

  function handlePageKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' || event.target !== event.currentTarget) return false;
    if (tool !== 'text' && tool !== 'group') return false;
    event.preventDefault();
    const point = visiblePaperCenter(event.currentTarget, zoom, page, layoutScale);
    if (tool === 'text') createText(point, true);
    else createGroup(point);
    return true;
  }

  function createText(point: ViewPoint, centered: boolean) {
    const widthMm = 40;
    const id = addViewAnnotation(view.id, {
      kind: 'text',
      xMm: Math.max(0, Math.min(centered ? point.xMm - widthMm / 2 : point.xMm, page.widthMm - widthMm)),
      yMm: Math.max(0, Math.min(point.yMm, page.heightMm - 8)),
      widthMm,
      text: 'Text',
      size: 'medium',
    });
    selectCanvas({
      kind: 'movable',
      value: { primary: { kind: 'text', id }, items: [{ kind: 'text', id }] },
    });
    setTool('select');
    requestFocus(true);
  }

  function createGroup(point: ViewPoint) {
    const widthMm = 60;
    const heightMm = 40;
    const id = addViewAnnotation(view.id, {
      kind: 'group',
      xMm: Math.max(0, Math.min(point.xMm - widthMm / 2, page.widthMm - widthMm)),
      yMm: Math.max(0, Math.min(point.yMm - heightMm / 2, page.heightMm - heightMm)),
      widthMm,
      heightMm,
      label: 'Area',
    });
    selectCanvas({
      kind: 'movable',
      value: { primary: { kind: 'group', id }, items: [{ kind: 'group', id }] },
    });
    setTool('select');
    requestFocus(true);
  }

  function updatePointer(event: PointerEvent<HTMLElement>) {
    if (tool === 'line' && lineDraft && !groupDraft) setLinePointer(pagePoint(event, false));
    if (!groupDraft || groupDraft.pointerId !== event.pointerId) return false;
    setGroupDraft({ ...groupDraft, current: pagePoint(event) });
    return true;
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!groupDraft || groupDraft.pointerId !== event.pointerId) return false;
    releasePointerCaptureSafely(groupDraft.captureTarget, groupDraft.pointerId);
    if (groupDraft.viewId !== view.id) {
      setGroupDraft(null);
      return true;
    }
    const bounds = normalizeDraft(groupDraft.start, groupDraft.current);
    const size =
      bounds.widthMm < 20 || bounds.heightMm < 15 ? { ...bounds, widthMm: 60, heightMm: 40 } : bounds;
    const id = addViewAnnotation(view.id, {
      kind: 'group',
      xMm: Math.max(0, Math.min(size.xMm, page.widthMm - size.widthMm)),
      yMm: Math.max(0, Math.min(size.yMm, page.heightMm - size.heightMm)),
      widthMm: Math.max(20, size.widthMm),
      heightMm: Math.max(15, size.heightMm),
      label: 'Area',
    });
    setGroupDraft(null);
    selectCanvas({
      kind: 'movable',
      value: { primary: { kind: 'group', id }, items: [{ kind: 'group', id }] },
    });
    setTool('select');
    requestFocus(true);
    return true;
  }

  return {
    tool,
    setTool,
    cancel,
    lineDraft,
    linePointer,
    portRangeDraft,
    groupDraft,
    handleLineAnchor,
    handlePortRangeRow,
    handlePagePointerDown,
    handlePageKeyDown,
    updatePointer,
    finishPointer,
  };
}

function releasePointerCaptureSafely(target: HTMLElement, pointerId: number) {
  if (
    typeof target.hasPointerCapture === 'function' &&
    typeof target.releasePointerCapture === 'function' &&
    target.hasPointerCapture(pointerId)
  ) {
    target.releasePointerCapture(pointerId);
  }
}

function visiblePaperCenter(
  pageElement: HTMLElement,
  zoom: number,
  page: { widthMm: number; heightMm: number },
  layoutScale: ViewDeviceScale,
): ViewPoint {
  const pageRect = pageElement.getBoundingClientRect();
  const viewportRect = pageElement.closest<HTMLElement>('.view-viewport')?.getBoundingClientRect();
  const left = Math.max(pageRect.left, viewportRect?.left ?? pageRect.left);
  const top = Math.max(pageRect.top, viewportRect?.top ?? pageRect.top);
  const right = Math.min(pageRect.right, viewportRect?.right ?? pageRect.right);
  const bottom = Math.min(pageRect.bottom, viewportRect?.bottom ?? pageRect.bottom);
  const raw = {
    xMm: Math.max(0, Math.min(((left + right) / 2 - pageRect.left) / zoom / VIEW_PIXELS_PER_MM, page.widthMm)),
    yMm: Math.max(0, Math.min(((top + bottom) / 2 - pageRect.top) / zoom / VIEW_PIXELS_PER_MM, page.heightMm)),
  };
  return snapViewLayoutPosition(raw, layoutScale);
}

function normalizeDraft(start: ViewPoint, end: ViewPoint) {
  return {
    xMm: Math.min(start.xMm, end.xMm),
    yMm: Math.min(start.yMm, end.yMm),
    widthMm: Math.abs(end.xMm - start.xMm),
    heightMm: Math.abs(end.yMm - start.yMm),
  };
}
