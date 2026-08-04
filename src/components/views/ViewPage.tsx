import type { CSSProperties } from 'react';
import type { ProjectView } from '../../domain/types';
import { isViewPopulated } from './viewUiModel';
import type { ViewPageDimensions } from './viewViewport';
import { VIEW_GRID_MM, VIEW_PIXELS_PER_MM } from './viewViewport';

export function ViewPage({
  view,
  page,
  zoom,
}: {
  view: ProjectView;
  page: ViewPageDimensions;
  zoom: number;
}) {
  const widthPx = page.widthMm * VIEW_PIXELS_PER_MM;
  const heightPx = page.heightMm * VIEW_PIXELS_PER_MM;
  const gridPx = VIEW_GRID_MM * VIEW_PIXELS_PER_MM;

  return (
    <div className="view-page-stage" style={{ width: widthPx * zoom, height: heightPx * zoom }}>
      <div
        aria-label={`${view.name} ${view.pageSize.toUpperCase()} ${view.orientation} page`}
        className="view-page"
        style={
          {
            width: widthPx,
            height: heightPx,
            transform: `scale(${zoom})`,
            '--view-grid-size': `${gridPx}px`,
          } as CSSProperties
        }
      >
        <div className="view-page-empty">
          <p>
            {isViewPopulated(view)
              ? 'This View contains saved canvas content.'
              : 'Add a device or rack to start this View.'}
          </p>
          <span>
            {isViewPopulated(view)
              ? 'Placement rendering is not available in this workspace yet.'
              : 'Objects remain live references to project data.'}
          </span>
        </div>
      </div>
    </div>
  );
}
