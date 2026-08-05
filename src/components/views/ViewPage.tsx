import { useEffect, useRef, type CSSProperties } from 'react';
import type { ProjectView } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { isViewPopulated } from './viewUiModel';
import type { ViewPageDimensions } from './viewViewport';
import { VIEW_GRID_MM, VIEW_PIXELS_PER_MM } from './viewViewport';
import type { ViewEditorController } from './useViewEditorController';
import { ViewPlacementBlock } from './ViewPlacementBlock';
import { ViewDrawingLayer } from './ViewDrawingLayer';

export function ViewPage({
  view,
  page,
  zoom,
  controller,
}: {
  view: ProjectView;
  page: ViewPageDimensions;
  zoom: number;
  controller: ViewEditorController;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const widthPx = page.widthMm * VIEW_PIXELS_PER_MM;
  const heightPx = page.heightMm * VIEW_PIXELS_PER_MM;
  const gridPx = VIEW_GRID_MM * VIEW_PIXELS_PER_MM;
  const renderedView = controller.renderedView;

  useEffect(() => {
    if (!controller.selectedPlacement?.id) return;
    const target = pageRef.current?.querySelector<HTMLElement>(
      `[data-view-placement-id="${controller.selectedPlacement.id}"]`,
    );
    target?.focus();
  }, [controller.focusRequest, controller.selectedPlacement?.id]);

  return (
    <div className="view-page-stage" style={{ width: widthPx * zoom, height: heightPx * zoom }}>
      <div
        aria-label={`${view.name} ${view.pageSize.toUpperCase()} ${view.orientation} page`}
        aria-describedby={`view-editor-instructions-${view.id}`}
        className="view-page"
        ref={pageRef}
        role="application"
        tabIndex={0}
        style={
          {
            width: widthPx,
            height: heightPx,
            transform: `scale(${zoom})`,
            '--view-grid-size': `${gridPx}px`,
          } as CSSProperties
        }
        onPointerDown={controller.handlePagePointerDown}
        onKeyDown={controller.handlePageKeyDown}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            controller.clearDropPreview();
          }
        }}
        onDragOver={controller.handlePageDragOver}
        onDrop={controller.handlePageDrop}
        onPointerCancel={controller.cancelGesture}
        onLostPointerCapture={controller.cancelGesture}
        onPointerMove={controller.updateGesture}
        onPointerUp={controller.finishGesture}
      >
        {view.placements.length === 0 ? (
          <div className="view-page-empty">
            <p>
              {isViewPopulated(view)
                ? 'This View contains saved canvas content.'
                : 'Drag a device or rack from the navigator.'}
            </p>
            <span>Objects remain live references to project data.</span>
          </div>
        ) : null}
        {controller.dropPreview ? <DropPreview controller={controller} /> : null}
        <ViewDrawingLayer controller={controller} view={renderedView} />
        {renderedView.placements.map((placement) => (
          <ViewPlacementBlock
            controller={controller}
            key={placement.id}
            placement={placement}
            project={controller.project}
            primary={controller.isMovablePrimary({ kind: 'placement', id: placement.id })}
            selected={controller.isMovableSelected({ kind: 'placement', id: placement.id })}
            view={renderedView}
          />
        ))}
        {controller.marqueeBounds ? (
          <div
            aria-hidden="true"
            className="view-selection-marquee"
            style={{
              left: controller.marqueeBounds.xMm * VIEW_PIXELS_PER_MM,
              top: controller.marqueeBounds.yMm * VIEW_PIXELS_PER_MM,
              width: controller.marqueeBounds.widthMm * VIEW_PIXELS_PER_MM,
              height: controller.marqueeBounds.heightMm * VIEW_PIXELS_PER_MM,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function DropPreview({ controller }: { controller: ViewEditorController }) {
  const preview = controller.dropPreview;
  if (!preview) return null;
  const natural = getPlacementNaturalSize(controller.project, preview.placement);

  return (
    <div
      className={`view-drop-preview${preview.duplicatePlacementId ? ' is-duplicate' : ''}`}
      style={{
        left: preview.placement.xMm * VIEW_PIXELS_PER_MM,
        top: preview.placement.yMm * VIEW_PIXELS_PER_MM,
        width: natural.widthMm * preview.placement.scale * VIEW_PIXELS_PER_MM,
        height: natural.heightMm * preview.placement.scale * VIEW_PIXELS_PER_MM,
      }}
    >
      {preview.duplicatePlacementId ? 'Already in View' : 'Place object'}
    </div>
  );
}
