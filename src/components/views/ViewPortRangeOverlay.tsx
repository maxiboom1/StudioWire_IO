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
import { getDevicePortLabel } from '../../domain/devicePortLabels';
import type { Port, ProjectRoot } from '../../domain/types';
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
        const endpoint = {
          kind: 'port_range' as const,
          placementId: placement.id,
          annotationId: range.id,
        };
        const reconnectRole = controller.getReconnectEndpointRole(endpoint);
        const reconnectTarget = controller.isReconnectTarget(endpoint);
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
            {controller.tool === 'line' || reconnectRole || reconnectTarget ? (
              <button
                aria-label={`Use ${range.label || 'I/O Range'} as View line anchor`}
                className={`view-port-range-line-anchor is-${range.side}${reconnectRole ? ' is-reconnect-handle' : ''}${reconnectTarget ? ' is-reconnect-target' : ''}`}
                data-view-line-endpoint-id={range.id}
                data-view-line-endpoint-kind="port_range"
                data-view-line-endpoint-placement-id={placement.id}
                title={`Use ${range.label || 'I/O Range'} as View line anchor`}
                style={{
                  top: header + ((resolved.startIndex + resolved.endIndex + 1) / 2) * rowHeight,
                }}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!controller.endpointReconnect && controller.tool === 'line') {
                    controller.handleLineAnchor(endpoint);
                  }
                }}
                onPointerDown={(event) => {
                  if (reconnectRole && controller.selectedLine) {
                    controller.beginEndpointReconnect(event, controller.selectedLine, reconnectRole);
                  }
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
                aria-label={`Select ${getPresentationPortLabel(controller.project, port)} for I/O Range`}
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

function getPresentationPortLabel(project: ProjectRoot, port: Port): string {
  const device = project.devices.find((item) => item.id === port.deviceId);
  const group = project.portGroups.find((item) => item.id === port.portGroupId);
  return device && group ? getDevicePortLabel(device, group, port) : port.label;
}
