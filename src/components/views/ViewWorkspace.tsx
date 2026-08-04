import { Maximize2, Minus, Plus, RotateCcw, StretchHorizontal } from 'lucide-react';
import type { ProjectView } from '../../domain/types';
import { Button } from '../ui/button';
import { ViewPage } from './ViewPage';
import { formatViewPageMeta } from './viewUiModel';
import { getViewPageDimensions } from './viewViewport';
import { useViewViewport } from './useViewViewport';
import { useViewEditorController } from './useViewEditorController';
import { ViewObjectPicker } from './ViewObjectPicker';

export function ViewWorkspace({
  view,
  selectedPlacementId = null,
  onSelectPlacement = () => undefined,
}: {
  view: ProjectView;
  selectedPlacementId?: string | null;
  onSelectPlacement?: (placementId: string | null) => void;
}) {
  const page = getViewPageDimensions(view.pageSize, view.orientation);
  const viewport = useViewViewport(view.id, page);
  const editor = useViewEditorController({
    view,
    zoom: viewport.zoom,
    selectedPlacementId,
    onSelectPlacement,
  });

  return (
    <section className="workspace view-workspace" aria-label={`${view.name} View workspace`}>
      <header className="view-workspace-header">
        <div>
          <p className="eyebrow">View</p>
          <h1>{view.name}</h1>
          <p className="view-workspace-meta">
            {formatViewPageMeta(view)} · {page.widthMm} × {page.heightMm} mm
          </p>
        </div>
        <div className="view-viewport-toolbar" aria-label="View controls">
          <ViewObjectPicker project={editor.project} view={view} onAdd={editor.addSource} />
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
