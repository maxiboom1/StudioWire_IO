import {
  Braces,
  Cable,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Redo2,
  Square,
  StretchHorizontal,
  Type,
  Undo2,
} from 'lucide-react';
import type { ProjectView } from '../../domain/types';
import { Button } from '../ui/button';
import { ViewPage } from './ViewPage';
import { getViewPageDimensions } from './viewViewport';
import { useViewViewport } from './useViewViewport';
import { useViewEditorController } from './useViewEditorController';
import { ViewDeviceSizeControl } from './ViewDeviceSizeControl';
import type { ViewCanvasSelection, ViewEditorTool } from './viewEditorTypes';

export function ViewWorkspace({
  view,
  canvasSelection = null,
  onCanvasSelectionChange = () => undefined,
}: {
  view: ProjectView;
  canvasSelection?: ViewCanvasSelection | null;
  onCanvasSelectionChange?: (selection: ViewCanvasSelection | null) => void;
}) {
  const page = getViewPageDimensions(view.pageSize, view.orientation);
  const viewport = useViewViewport(view.id, page);
  const editor = useViewEditorController({
    view,
    zoom: viewport.zoom,
    canvasSelection,
    onCanvasSelectionChange,
  });

  return (
    <section className="workspace view-workspace" aria-label={`${view.name} View workspace`}>
      <header className="view-workspace-header">
        <div>
          <p className="eyebrow">View</p>
          <h1>{view.name}</h1>
        </div>
        <div className="view-viewport-toolbar" aria-label="View controls">
          <ViewToolStrip tool={editor.tool} onChange={editor.setTool} />
          <div className="view-history-controls" aria-label="View edit history">
            <Button
              aria-label="Undo View edit"
              disabled={!editor.history.canUndo}
              size="icon"
              title="Undo View edit (Ctrl+Z)"
              type="button"
              variant="outline"
              onClick={editor.history.undo}
            >
              <Undo2 aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Redo View edit"
              disabled={!editor.history.canRedo}
              size="icon"
              title="Redo View edit (Ctrl+Shift+Z or Ctrl+Y)"
              type="button"
              variant="outline"
              onClick={editor.history.redo}
            >
              <Redo2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <ViewDeviceSizeControl state={editor.deviceScaleState} onChange={editor.changeDeviceScale} />
          <Button
            aria-label="Zoom out"
            disabled={!viewport.canZoomOut}
            size="icon"
            title="Zoom out"
            variant="outline"
            type="button"
            onClick={viewport.zoomOut}
          >
            <Minus aria-hidden="true" className="h-4 w-4" />
          </Button>
          <output className="view-zoom-value" aria-label="Current zoom">
            {Math.round(viewport.zoom * 100)}%
          </output>
          <Button
            aria-label="Zoom in"
            disabled={!viewport.canZoomIn}
            size="icon"
            title="Zoom in"
            variant="outline"
            type="button"
            onClick={viewport.zoomIn}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            className="view-fit-control"
            variant={viewport.fitMode === 'page' ? 'default' : 'outline'}
            aria-label="Fit page"
            title="Fit page"
            type="button"
            onClick={viewport.fitPage}
          >
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
            <span>Fit Page</span>
          </Button>
          <Button
            className="view-fit-control"
            variant={viewport.fitMode === 'width' ? 'default' : 'outline'}
            aria-label="Fit width"
            title="Fit width"
            type="button"
            onClick={viewport.fitWidth}
          >
            <StretchHorizontal aria-hidden="true" className="h-4 w-4" />
            <span>Fit Width</span>
          </Button>
          <Button
            className="view-reset-control"
            aria-label="Reset zoom"
            title="Reset zoom"
            variant="ghost"
            type="button"
            onClick={viewport.reset}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            <span>Reset</span>
          </Button>
        </div>
      </header>
      {editor.notice ? (
        <p className="view-editor-notice" aria-live="polite">
          {editor.notice}
        </p>
      ) : null}
      <p className="sr-only" id={`view-editor-instructions-${view.id}`}>
        Select items with click. Use Control or Command click to change a multi-selection, or draw a marquee
        on paper. Line mode uses eligible device I/O and I/O Range anchors. On a selected line, drag a segment
        midpoint to move it in parallel, or Shift-drag an eligible midpoint to create a Flex path. Escape
        cancels the current action. Delete removes the selection. Arrow keys nudge selected items. Control or
        Command Z undoes, and Control or Command Shift Z or Y redoes.
      </p>
      <div className="view-viewport" ref={viewport.viewportRef}>
        <ViewPage controller={editor} page={page} view={view} zoom={viewport.zoom} />
      </div>
    </section>
  );
}

function ViewToolStrip({
  tool,
  onChange,
}: {
  tool: ViewEditorTool;
  onChange: (tool: ViewEditorTool) => void;
}) {
  const tools = [
    ['select', 'Select', MousePointer2],
    ['line', 'Line', Cable],
    ['text', 'Text', Type],
    ['group', 'Area', Square],
    ['portRange', 'I/O Range', Braces],
  ] as const;
  return (
    <div className="view-tool-strip" aria-label="View drawing tools">
      {tools.map(([id, label, Icon]) => (
        <Button
          aria-label={label}
          aria-pressed={tool === id}
          className={tool === id ? 'is-active' : ''}
          key={id}
          title={label}
          type="button"
          variant={tool === id ? 'default' : 'outline'}
          onClick={() => {
            onChange(id);
            window.setTimeout(() => document.querySelector<HTMLElement>('.view-page')?.focus(), 0);
          }}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
}
