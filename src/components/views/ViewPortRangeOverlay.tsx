import { Fragment } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ProjectView, ViewPlacement, ViewPortRangeAnnotation } from '../../domain/types';
import {
  DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  VIEW_DEVICE_WIDTH_MM,
  getViewPageDimensions,
  isBoundsOutsidePage,
} from '../../domain/viewGeometry';
import { getViewPortRangeBounds, resolveViewPortRange } from '../../domain/viewPortRanges';
import type { ViewEditorController } from './useViewEditorController';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

export function ViewPortRangeOverlay({
  controller,
  placement,
  view,
}: {
  controller: ViewEditorController;
  placement: ViewPlacement;
  view: ProjectView;
}) {
  const scalePx = (VIEW_DEVICE_WIDTH_MM * VIEW_PIXELS_PER_MM) / DEVICE_DIAGRAM_SOURCE_WIDTH_PX;
  const header = DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX * scalePx;
  const rowHeight = DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX * scalePx;
  const ranges = view.annotations.filter(
    (item): item is ViewPortRangeAnnotation =>
      item.kind === 'port_range' && item.placementId === placement.id,
  );
  return (
    <div className="view-port-range-overlay">
      {ranges.map((range) => {
        const resolved = resolveViewPortRange(controller.project, view, range);
        const bounds = getViewPortRangeBounds(controller.project, view, range);
        const outside = Boolean(
          bounds && isBoundsOutsidePage(bounds, getViewPageDimensions(view.pageSize, view.orientation)),
        );
        const selected =
          controller.canvasSelection?.kind === 'portRange' && controller.canvasSelection.id === range.id;
        if (!resolved)
          return (
            <button
              key={range.id}
              aria-pressed={selected}
              className={`view-port-range-missing is-${range.side}${selected ? ' is-selected' : ''}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                controller.selectCanvas({ kind: 'portRange', id: range.id });
              }}
            >
              <AlertTriangle />
              Missing I/O Range
            </button>
          );
        return (
          <Fragment key={range.id}>
            <button
              aria-pressed={selected}
              type="button"
              className={`view-port-range is-${range.side}${selected ? ' is-selected' : ''}${outside ? ' is-outside-page' : ''}`}
              style={{
                top: header + resolved.startIndex * rowHeight,
                height: (resolved.endIndex - resolved.startIndex + 1) * rowHeight,
              }}
              onClick={(event) => {
                event.stopPropagation();
                controller.selectCanvas({ kind: 'portRange', id: range.id });
              }}
              onDoubleClick={() => document.getElementById('view-element-label')?.focus()}
            >
              <span className="view-port-range-brace" />
              <span className="view-port-range-label">{range.label}</span>
            </button>
            {controller.tool === 'line' ? (
              <button
                aria-label={`Use ${range.label || 'I/O Range'} as View line anchor`}
                className={`view-port-range-line-anchor is-${range.side}`}
                title={`Use ${range.label || 'I/O Range'} as View line anchor`}
                style={{
                  top:
                    header +
                    ((resolved.startIndex + resolved.endIndex + 1) / 2) * rowHeight,
                }}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  controller.handleLineAnchor({
                    kind: 'port_range',
                    placementId: placement.id,
                    annotationId: range.id,
                  });
                }}
              />
            ) : null}
          </Fragment>
        );
      })}
      {controller.tool === 'portRange'
        ? (['left', 'right'] as const).flatMap((side) =>
            controller.getPortRangeRows(placement, side).map((port, index) => (
              <button
                aria-label={`Select ${port.label} for I/O Range`}
                className={`view-port-range-target is-${side}`}
                key={`${side}-${port.id}`}
                style={{ top: header + index * rowHeight, height: rowHeight }}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  controller.handlePortRangeRow(placement.id, side, port.id);
                }}
              />
            )),
          )
        : null}
    </div>
  );
}
