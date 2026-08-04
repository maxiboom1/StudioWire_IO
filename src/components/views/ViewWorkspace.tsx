import {
  Braces,
  Cable,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Square,
  StretchHorizontal,
  Type,
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
          <ViewDeviceSizeControl state={editor.deviceScaleState} onChange={editor.changeDeviceScale} />
          <Button
            aria-label="Zoom out"
            disabled={!viewport.canZoomOut}
            size="icon"
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
            variant="outline"
            type="button"
            onClick={viewport.zoomIn}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant={viewport.fitMode === 'page' ? 'default' : 'outline'}
            type="button"
            onClick={viewport.fitPage}
          >
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
            Fit Page
          </Button>
          <Button
            variant={viewport.fitMode === 'width' ? 'default' : 'outline'}
            type="button"
            onClick={viewport.fitWidth}
          >
            <StretchHorizontal aria-hidden="true" className="h-4 w-4" />
            Fit Width
          </Button>
          <Button variant="ghost" type="button" onClick={viewport.reset}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </header>
      {editor.notice ? (
        <p className="view-editor-notice" aria-live="polite">
          {editor.notice}
        </p>
      ) : null}
      <div className="view-viewport" ref={viewport.viewportRef} tabIndex={0}>
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
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
}
