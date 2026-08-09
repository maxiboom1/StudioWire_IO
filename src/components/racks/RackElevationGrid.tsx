import type { CSSProperties, DragEvent } from 'react';
import type { Device, Rack } from '../../domain/types';
import { getPreviewRows, type RackCanvasModel } from './rackCanvasModel';
import type { RackDropPreview } from './rackDropTarget';

export function RackElevationGrid({
  rack,
  model,
  readOnly = false,
  dropPreview = null,
  draggingDeviceId = null,
  onDeviceDragEnd,
  onDeviceDragStart,
  onRackDragOver,
  onRackDrop,
}: {
  rack: Rack;
  model: RackCanvasModel;
  readOnly?: boolean;
  dropPreview?: RackDropPreview | null;
  draggingDeviceId?: string | null;
  onDeviceDragEnd?: () => void;
  onDeviceDragStart?: (event: DragEvent<HTMLDivElement>, device: Device) => void;
  onRackDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onRackDrop?: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const previewRows = dropPreview
    ? getPreviewRows(model.displayRus, dropPreview.bottomRu, dropPreview.topRu)
    : null;

  return (
    <div
      className={`rack-elevation${readOnly ? ' rack-elevation-readonly' : ''}`}
      style={{ '--rack-row-count': model.displayRus.length } as CSSProperties}
    >
      <div className="rack-ru-labels" aria-label="Rack unit labels">
        {model.displayRus.map((ru) => (
          <div className="rack-ru-label" data-ru={ru} key={ru}>
            {String(ru).padStart(2, '0')}
          </div>
        ))}
      </div>
      <div
        className="rack-stack"
        aria-label={`${rack.name} RU stack`}
        onDragLeave={
          readOnly
            ? undefined
            : (event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  event.currentTarget.classList.remove('is-drag-over');
                }
              }
        }
        onDragOver={
          readOnly
            ? undefined
            : (event) => {
                event.currentTarget.classList.add('is-drag-over');
                onRackDragOver?.(event);
              }
        }
        onDrop={
          readOnly
            ? undefined
            : (event) => {
                event.currentTarget.classList.remove('is-drag-over');
                onRackDrop?.(event);
              }
        }
      >
        {model.displayRus.map((ru, index) => (
          <div
            className="rack-ru-row"
            data-ru={ru}
            key={ru}
            style={{ gridRow: `${index + 1} / ${index + 2}` }}
          />
        ))}
        {previewRows ? (
          <div
            className={dropPreview?.ok ? 'rack-drop-preview valid' : 'rack-drop-preview invalid'}
            style={{ gridRow: `${previewRows.rowStart} / ${previewRows.rowEnd}` }}
          >
            <span>{dropPreview?.ok ? 'Move here' : 'Blocked'}</span>
          </div>
        ) : null}
        {model.mountedDevices.map(({ device, rowStart, rowEnd, diagnostics }) => (
          <div
            className={[
              'rack-device-block',
              device.kind === 'terminal_block' ? 'terminal-block-rack-device' : '',
              diagnostics.length > 0 ? 'invalid-placement' : '',
              draggingDeviceId === device.id ? 'is-dragging' : '',
              readOnly ? 'is-readonly' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-canvas-draggable={readOnly ? undefined : 'true'}
            draggable={!readOnly}
            key={device.id}
            style={{ gridRow: `${rowStart} / ${rowEnd}` }}
            onDragEnd={readOnly ? undefined : onDeviceDragEnd}
            onDragStart={
              readOnly || !onDeviceDragStart ? undefined : (event) => onDeviceDragStart(event, device)
            }
          >
            <strong>{device.name}</strong>
            {diagnostics.length > 0 ? <em>Placement issue</em> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
