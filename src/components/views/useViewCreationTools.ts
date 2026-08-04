import { useEffect, useState, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewLineEndpoint, ViewPoint } from '../../domain/types';
import { normalizeViewPortRange, viewPortRangesOverlap } from '../../domain/viewPortRanges';
import { snapViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import type { ViewCanvasSelection, ViewEditorTool } from './viewEditorTypes';

interface GroupDraft {
  pointerId: number;
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

  useEffect(() => {
    setToolState('select');
    setLineDraft(null);
    setLinePointer(null);
    setPortRangeDraft(null);
    setGroupDraft(null);
  }, [view.id]);

  function setTool(next: ViewEditorTool) {
    setToolState(next);
    setLineDraft(null);
    setLinePointer(null);
    setPortRangeDraft(null);
    setGroupDraft(null);
    setNotice('');
  }

  function cancel() {
    setTool('select');
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
    const id = addViewLine(view.id, { from: lineDraft, to: endpoint, label: '', waypoints: [] });
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
      const point = pagePoint(event);
      const id = addViewAnnotation(view.id, {
        kind: 'text',
        xMm: Math.min(point.xMm, page.widthMm - 40),
        yMm: point.yMm,
        widthMm: 40,
        text: 'Text',
        size: 'medium',
      });
      selectCanvas({
        kind: 'movable',
        value: { primary: { kind: 'text', id }, items: [{ kind: 'text', id }] },
      });
      setTool('select');
      requestFocus(true);
      return;
    }
    if (tool === 'group') {
      const start = pagePoint(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      setGroupDraft({ pointerId: event.pointerId, start, current: start });
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

  function updatePointer(event: PointerEvent<HTMLElement>) {
    if (tool === 'line' && lineDraft && !groupDraft) setLinePointer(pagePoint(event, false));
    if (!groupDraft || groupDraft.pointerId !== event.pointerId) return false;
    setGroupDraft({ ...groupDraft, current: pagePoint(event) });
    return true;
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!groupDraft || groupDraft.pointerId !== event.pointerId) return false;
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
    updatePointer,
    finishPointer,
  };
}

function normalizeDraft(start: ViewPoint, end: ViewPoint) {
  return {
    xMm: Math.min(start.xMm, end.xMm),
    yMm: Math.min(start.yMm, end.yMm),
    widthMm: Math.abs(end.xMm - start.xMm),
    heightMm: Math.abs(end.yMm - start.yMm),
  };
}
