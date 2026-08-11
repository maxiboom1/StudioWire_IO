import { useMemo, type CSSProperties } from 'react';
import type { ProjectView, ViewLine } from '../../domain/types';
import { getViewPageDimensions, isBoundsOutsidePage, isPointOutsidePage } from '../../domain/viewGeometry';
import { resolveViewLineEndpoint } from '../../domain/viewLineEndpoints';
import { getViewLineLabelBounds, getViewLineLabelPoint } from '../../domain/viewLineLabelGeometry';
import { VIEW_LINE_COLOR_MAP, VIEW_LINE_WIDTH_MAP } from '../../domain/viewLineStyles';
import { getRenderedLineRoute, getViewLineSegments } from '../../domain/viewRouting';
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
  const flexPreviewActive = controller.flexPathPreview?.lineId === line.id;
  const activePreview = controller.linePreview?.id === line.id ? controller.linePreview : null;
  const renderedLine = flexPreviewActive ? line : (activePreview ?? line);
  const endpoints = useMemo(
    () => ({
      from: resolveViewLineEndpoint(controller.project, view, renderedLine.from),
      to: resolveViewLineEndpoint(controller.project, view, renderedLine.to),
    }),
    [controller.project, renderedLine, view],
  );
  const { from, to } = endpoints;
  const route = useMemo(
    () => getRenderedLineRoute(controller.project, view, renderedLine),
    [controller.project, renderedLine, view],
  );
  const points = useMemo(() => route.map(({ xMm, yMm }) => ({ xMm, yMm })), [route]);
  const previewPoints = useMemo(() => {
    if (!flexPreviewActive || !activePreview || !controller.flexPathPreview) return [];
    return getRenderedLineRoute(controller.project, view, activePreview)
      .filter((point) => point.flexPathId === controller.flexPathPreview!.flexPathId)
      .map(({ xMm, yMm }) => ({ xMm, yMm }));
  }, [activePreview, controller.flexPathPreview, controller.project, flexPreviewActive, view]);
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
  const bends = route.slice(1, -1);
  const segments = getViewLineSegments(route);
  const style = {
    '--view-line-color': VIEW_LINE_COLOR_MAP[renderedLine.color],
    '--view-line-width': `${VIEW_LINE_WIDTH_MAP[renderedLine.width]}px`,
  } as CSSProperties;

  return (
    <g
      aria-label={`${renderedLine.label || 'Unlabeled'} View line${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      className={`view-line-item${selected ? ' is-selected' : ''}${outside ? ' is-outside-page' : ''}`}
      role="button"
      style={style}
      tabIndex={0}
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
      {outside ? <polyline className="view-line-warning-halo" points={toSvgPoints(points)} /> : null}
      <polyline className="view-line-hit" points={toSvgPoints(points)} />
      <polyline className="view-line-stroke" points={toSvgPoints(points)} />
      {flexPreviewActive && previewPoints.length > 1 ? (
        <>
          <polyline className="view-line-flex-preview" points={toSvgPoints(previewPoints)} />
          <line
            className="view-line-flex-guide"
            x1={controller.flexPathPreview!.guideStart.xMm * VIEW_PIXELS_PER_MM}
            x2={controller.flexPathPreview!.guideEnd.xMm * VIEW_PIXELS_PER_MM}
            y1={controller.flexPathPreview!.guideStart.yMm * VIEW_PIXELS_PER_MM}
            y2={controller.flexPathPreview!.guideEnd.yMm * VIEW_PIXELS_PER_MM}
          />
        </>
      ) : null}
      {renderedLine.label && labelPoint ? (
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
      ) : null}
      {selected && !flexPreviewActive
        ? bends.map((point, index) => (
            <circle
              aria-label={point.flexPathId ? 'Adjust Flex path corner' : 'Adjust line bend'}
              className={`view-line-bend${point.flexPathId ? ' is-flex' : ''}`}
              cx={point.xMm * VIEW_PIXELS_PER_MM}
              cy={point.yMm * VIEW_PIXELS_PER_MM}
              key={`bend-${index}`}
              r={2.5 / controller.zoom}
              role="button"
              tabIndex={0}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => controller.beginWaypointGesture(event, renderedLine, index)}
            />
          ))
        : null}
      {selected && !flexPreviewActive
        ? segments.map((segment) => (
            <circle
              aria-label={`Move ${segment.orientation} line segment; Shift-drag to create Flex path`}
              className={`view-line-segment-handle${segment.flexPathId ? ' is-flex' : ''}`}
              cx={segment.midpoint.xMm * VIEW_PIXELS_PER_MM}
              cy={segment.midpoint.yMm * VIEW_PIXELS_PER_MM}
              key={`segment-${segment.index}`}
              r={2 / controller.zoom}
              role="button"
              tabIndex={0}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => controller.beginSegmentGesture(event, renderedLine, segment.index)}
            />
          ))
        : null}
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
