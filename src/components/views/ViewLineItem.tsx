import { useMemo, type CSSProperties } from 'react';
import type { ProjectView, ViewLine } from '../../domain/types';
import { getViewPageDimensions, isBoundsOutsidePage, isPointOutsidePage } from '../../domain/viewGeometry';
import { resolveViewLineEndpoint } from '../../domain/viewLineEndpoints';
import { getViewLineLabelBounds, getViewLineLabelPoint } from '../../domain/viewLineLabelGeometry';
import { VIEW_LINE_COLOR_MAP, VIEW_LINE_WIDTH_MAP } from '../../domain/viewLineStyles';
import { getRenderedLinePoints } from '../../domain/viewRouting';
import type { ViewEditorController } from './useViewEditorController';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

export function ViewLineItem({
  controller,
  line,
  view,
  warningIndex,
}: {
  controller: ViewEditorController;
  line: ViewLine;
  view: ProjectView;
  warningIndex: number;
}) {
  const renderedLine = controller.linePreview?.id === line.id ? controller.linePreview : line;
  const endpoints = useMemo(
    () => ({
      from: resolveViewLineEndpoint(controller.project, view, renderedLine.from),
      to: resolveViewLineEndpoint(controller.project, view, renderedLine.to),
    }),
    [controller.project, renderedLine, view],
  );
  const { from, to } = endpoints;
  const points = useMemo(
    () => getRenderedLinePoints(controller.project, view, renderedLine),
    [controller.project, renderedLine, view],
  );
  const selected = controller.canvasSelection?.kind === 'line' && controller.canvasSelection.id === line.id;
  if (!from || !to) {
    const surviving = from ?? to;
    const point = surviving
      ? {
          xMm: surviving.point.xMm + surviving.normal.xMm * 5,
          yMm: surviving.point.yMm,
        }
      : { xMm: 12, yMm: 12 + warningIndex * 8 };
    return (
      <g
        aria-label="Missing line endpoint"
        aria-pressed={selected}
        className={`view-line-missing${selected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        transform={`translate(${point.xMm * VIEW_PIXELS_PER_MM} ${point.yMm * VIEW_PIXELS_PER_MM})`}
        onClick={(event) => {
          event.stopPropagation();
          controller.selectCanvas({ kind: 'line', id: line.id });
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          controller.selectCanvas({ kind: 'line', id: line.id });
        }}
      >
        <rect height="18" rx="3" width="94" x="-3" y="-9" />
        <text x="4" y="1">
          Missing line endpoint
        </text>
      </g>
    );
  }

  if (points.length < 2) return null;
  const page = getViewPageDimensions(view.pageSize, view.orientation);
  const labelPoint = getViewLineLabelPoint(points, renderedLine.labelPosition);
  const labelOutside = Boolean(
    renderedLine.label &&
      labelPoint &&
      isBoundsOutsidePage(
        getViewLineLabelBounds(labelPoint, renderedLine.label, renderedLine.labelOrientation),
        page,
      ),
  );
  const outside = points.some((point) => isPointOutsidePage(point, page)) || labelOutside;
  const handles = renderedLine.waypoints.length ? renderedLine.waypoints : points.slice(1, -1);
  const style = {
    '--view-line-color': VIEW_LINE_COLOR_MAP[renderedLine.color],
    '--view-line-width': `${VIEW_LINE_WIDTH_MAP[renderedLine.width]}px`,
  } as CSSProperties;

  return (
    <g
      aria-label={`${renderedLine.label || 'Unlabeled'} View line${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      className={`${selected ? 'is-selected' : ''}${outside ? ' is-outside-page' : ''}`}
      role="button"
      style={style}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        if (event.ctrlKey || event.metaKey) return;
        controller.selectCanvas({ kind: 'line', id: line.id });
      }}
      onPointerDown={(event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        const page = event.currentTarget.closest('.view-page')?.getBoundingClientRect();
        if (!page) return;
        controller.beginInsertedWaypointGesture(event, line, {
          xMm: (event.clientX - page.left) / VIEW_PIXELS_PER_MM / controller.zoom,
          yMm: (event.clientY - page.top) / VIEW_PIXELS_PER_MM / controller.zoom,
        });
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        controller.selectCanvas({ kind: 'line', id: line.id });
      }}
    >
      {selected ? <polyline className="view-line-selection-halo" points={toSvgPoints(points)} /> : null}
      {outside ? <polyline className="view-line-warning-halo" points={toSvgPoints(points)} /> : null}
      <polyline className="view-line-hit" points={toSvgPoints(points)} />
      <polyline className="view-line-stroke" points={toSvgPoints(points)} />
      {renderedLine.label && labelPoint ? (
        <>
          <g
            className={`view-line-label is-${renderedLine.labelOrientation}`}
            transform={`translate(${labelPoint.xMm * VIEW_PIXELS_PER_MM} ${labelPoint.yMm * VIEW_PIXELS_PER_MM})${renderedLine.labelOrientation === 'vertical' ? ' rotate(-90)' : ''}`}
            onDoubleClick={(event) => {
              event.stopPropagation();
              focusInspector();
            }}
            onPointerDown={(event) => controller.beginLineLabelGesture(event, renderedLine)}
          >
            <text>{renderedLine.label}</text>
          </g>
        </>
      ) : null}
      {selected &&
        handles.map((point, index) => (
          <circle
            className="view-line-bend"
            cx={point.xMm * VIEW_PIXELS_PER_MM}
            cy={point.yMm * VIEW_PIXELS_PER_MM}
            key={index}
            r={3 / controller.zoom}
            onPointerDown={(event) => controller.beginWaypointGesture(event, line, index)}
          />
        ))}
    </g>
  );
}

function focusInspector() {
  document.getElementById('view-element-label')?.focus();
}

function toSvgPoints(points: { xMm: number; yMm: number }[]) {
  return points
    .map((point) => `${point.xMm * VIEW_PIXELS_PER_MM},${point.yMm * VIEW_PIXELS_PER_MM}`)
    .join(' ');
}
