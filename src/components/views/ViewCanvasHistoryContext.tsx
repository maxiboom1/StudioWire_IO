import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createEmptyViewCanvasHistory,
  createViewCanvasSnapshot,
  getViewCanvasSignature,
  pushViewCanvasHistory,
  redoViewCanvasHistory,
  undoViewCanvasHistory,
  type ViewCanvasHistoryState,
  type ViewCanvasSnapshot,
} from '../../domain/viewCanvasHistory';
import { useProject } from '../../state/ProjectContext';
import type { ProjectCommands, ProjectContextValue } from '../../state/projectContextTypes';

type CanvasCommandName =
  | 'addViewPlacement'
  | 'updateViewPlacement'
  | 'removeViewPlacement'
  | 'addViewLine'
  | 'updateViewLine'
  | 'removeViewLine'
  | 'addViewAnnotation'
  | 'updateViewAnnotation'
  | 'removeViewAnnotation'
  | 'replaceViewCanvas';

type ViewCanvasCommands = Pick<ProjectCommands, CanvasCommandName>;

interface ViewCanvasHistoryValue {
  commands: ViewCanvasCommands;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  notice: string;
  clearNotice: () => void;
}

interface PendingCanvasMutation {
  viewId: string;
  before: ViewCanvasSnapshot;
  beforeSignature: string;
  kind: 'edit' | 'restore';
}

interface ObservedCanvas {
  activeViewId: string | null;
  signature: string | null;
  views: ProjectContextValue['project']['views'];
  devices: ProjectContextValue['project']['devices'];
  racks: ProjectContextValue['project']['racks'];
  locations: ProjectContextValue['project']['locations'];
}

const ViewCanvasHistoryContext = createContext<ViewCanvasHistoryValue | null>(null);

export function ViewCanvasHistoryProvider({
  activeViewId,
  children,
}: {
  activeViewId: string | null;
  children: ReactNode;
}) {
  const projectContext = useProject();
  const { project } = projectContext;
  const [history, setHistory] = useState<ViewCanvasHistoryState>(createEmptyViewCanvasHistory);
  const [notice, setNotice] = useState('');
  const pendingRef = useRef<PendingCanvasMutation | null>(null);
  const activeView = project.views.find((view) => view.id === activeViewId) ?? null;
  const activeSignature = activeView ? getViewCanvasSignature(createViewCanvasSnapshot(activeView)) : null;
  const observedRef = useRef<ObservedCanvas>({
    activeViewId,
    signature: activeSignature,
    views: project.views,
    devices: project.devices,
    racks: project.racks,
    locations: project.locations,
  });

  useEffect(() => {
    const previous = observedRef.current;
    const pending = pendingRef.current;
    const changedView = previous.activeViewId !== activeViewId;
    const changedCanvas = previous.signature !== activeSignature;
    const lifecycleReplacement =
      previous.views !== project.views &&
      previous.devices !== project.devices &&
      previous.racks !== project.racks &&
      previous.locations !== project.locations;

    if (changedView || !activeView) {
      setHistory(createEmptyViewCanvasHistory());
      setNotice('');
      pendingRef.current = null;
    } else if (changedCanvas) {
      if (pending && pending.viewId === activeViewId && pending.beforeSignature === previous.signature) {
        if (pending.kind === 'edit') {
          setHistory((current) =>
            pushViewCanvasHistory(current, pending.before, createViewCanvasSnapshot(activeView)),
          );
        }
      } else {
        setHistory(createEmptyViewCanvasHistory());
        setNotice('View history reset after an external canvas change.');
      }
      pendingRef.current = null;
    } else if (lifecycleReplacement && !pending) {
      setHistory(createEmptyViewCanvasHistory());
      setNotice('');
    } else if (pending) {
      pendingRef.current = null;
    }

    observedRef.current = {
      activeViewId,
      signature: activeSignature,
      views: project.views,
      devices: project.devices,
      racks: project.racks,
      locations: project.locations,
    };
  }, [activeSignature, activeView, activeViewId, project]);

  const markEdit = useCallback(
    (viewId: string) => {
      const view = project.views.find((candidate) => candidate.id === viewId);
      if (!view || viewId !== activeViewId) return;
      const before = createViewCanvasSnapshot(view);
      pendingRef.current = {
        viewId,
        before,
        beforeSignature: getViewCanvasSignature(before),
        kind: 'edit',
      };
      setNotice('');
    },
    [activeViewId, project.views],
  );

  const commands = useMemo<ViewCanvasCommands>(
    () => ({
      addViewPlacement(viewId, input) {
        markEdit(viewId);
        return projectContext.addViewPlacement(viewId, input);
      },
      updateViewPlacement(viewId, placementId, updates) {
        markEdit(viewId);
        projectContext.updateViewPlacement(viewId, placementId, updates);
      },
      removeViewPlacement(viewId, placementId) {
        markEdit(viewId);
        projectContext.removeViewPlacement(viewId, placementId);
      },
      addViewLine(viewId, input) {
        markEdit(viewId);
        return projectContext.addViewLine(viewId, input);
      },
      updateViewLine(viewId, lineId, updates) {
        markEdit(viewId);
        projectContext.updateViewLine(viewId, lineId, updates);
      },
      removeViewLine(viewId, lineId) {
        markEdit(viewId);
        projectContext.removeViewLine(viewId, lineId);
      },
      addViewAnnotation(viewId, input) {
        markEdit(viewId);
        return projectContext.addViewAnnotation(viewId, input);
      },
      updateViewAnnotation(viewId, annotationId, input) {
        markEdit(viewId);
        projectContext.updateViewAnnotation(viewId, annotationId, input);
      },
      removeViewAnnotation(viewId, annotationId) {
        markEdit(viewId);
        projectContext.removeViewAnnotation(viewId, annotationId);
      },
      replaceViewCanvas(viewId, canvas) {
        markEdit(viewId);
        projectContext.replaceViewCanvas(viewId, canvas);
      },
    }),
    [markEdit, projectContext],
  );

  const restore = useCallback(
    (direction: 'undo' | 'redo') => {
      if (!activeView || !activeViewId) return;
      const current = createViewCanvasSnapshot(activeView);
      const transition =
        direction === 'undo'
          ? undoViewCanvasHistory(history, current)
          : redoViewCanvasHistory(history, current);
      if (!transition) return;
      pendingRef.current = {
        viewId: activeViewId,
        before: current,
        beforeSignature: getViewCanvasSignature(current),
        kind: 'restore',
      };
      setHistory(transition.history);
      projectContext.replaceViewCanvas(activeViewId, transition.snapshot);
      setNotice(direction === 'undo' ? 'View edit undone.' : 'View edit redone.');
    },
    [activeView, activeViewId, history, projectContext],
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!activeViewId || isEditingTarget(event.target) || !(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        restore('redo');
      } else if (key === 'z') {
        event.preventDefault();
        restore('undo');
      } else if (key === 'y') {
        event.preventDefault();
        restore('redo');
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activeViewId, restore]);

  const value = useMemo<ViewCanvasHistoryValue>(
    () => ({
      commands,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      undo: () => restore('undo'),
      redo: () => restore('redo'),
      notice,
      clearNotice: () => setNotice(''),
    }),
    [commands, history.future.length, history.past.length, notice, restore],
  );

  return <ViewCanvasHistoryContext.Provider value={value}>{children}</ViewCanvasHistoryContext.Provider>;
}

export function useViewCanvasCommands(): ViewCanvasCommands {
  const context = useContext(ViewCanvasHistoryContext);
  const project = useProject();
  return context?.commands ?? project;
}

export function useViewCanvasHistory(): Omit<ViewCanvasHistoryValue, 'commands'> {
  const context = useContext(ViewCanvasHistoryContext);
  return context
    ? context
    : {
        canUndo: false,
        canRedo: false,
        undo: () => undefined,
        redo: () => undefined,
        notice: '',
        clearNotice: () => undefined,
      };
}

function isEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
