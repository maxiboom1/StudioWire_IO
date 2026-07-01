import type { CSSProperties, DragEvent } from 'react';
import { X } from 'lucide-react';
import type { Device, Rack } from '../../domain/types';
import { Button } from '../ui/button';
import { getPreviewRows, type RackCanvasModel } from './rackCanvasModel';
import type { RackDropPreview } from './rackDropTarget';

export function RackElevationCanvas({
  rack,
  model,
  dropPreview,
  draggingDeviceId,
  canRemove = false,
  onDeviceDragEnd,
  onDeviceDragStart,
  onRackDragOver,
  onRackDrop,
  onRemove,
}: {
  rack: Rack;
  model: RackCanvasModel;
  dropPreview: RackDropPreview | null;
  draggingDeviceId: string | null;
  canRemove?: boolean;
  onDeviceDragEnd: () => void;
  onDeviceDragStart: (event: DragEvent<HTMLDivElement>, device: Device) => void;
  onRackDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onRackDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemove?: () => void;
}) {
  const previewRows = dropPreview
    ? getPreviewRows(model.displayRus, dropPreview.bottomRu, dropPreview.topRu)
    : null;

  return (
    <div className="rack-canvas-card">
      <div className="rack-name-label">{rack.name}</div>
      {canRemove ? (
        <Button
          aria-label={`Remove ${rack.name} from rack view`}
          className="rack-remove-button"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      <div
        className="rack-elevation"
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
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              event.currentTarget.classList.remove('is-drag-over');
            }
          }}
          onDragOver={(event) => {
            event.currentTarget.classList.add('is-drag-over');
            onRackDragOver(event);
          }}
          onDrop={(event) => {
            event.currentTarget.classList.remove('is-drag-over');
            onRackDrop(event);
          }}
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
          {model.mountedDevices.map(({ device, bottomRu, topRu, rowStart, rowEnd, diagnostics }) => (
            <div
              className={[
                'rack-device-block',
                device.kind === 'terminal_block' ? 'terminal-block-rack-device' : '',
                diagnostics.length > 0 ? 'invalid-placement' : '',
                draggingDeviceId === device.id ? 'is-dragging' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-canvas-draggable="true"
              draggable
              key={device.id}
              style={{ gridRow: `${rowStart} / ${rowEnd}` }}
              onDragEnd={onDeviceDragEnd}
              onDragStart={(event) => onDeviceDragStart(event, device)}
            >
              <strong>{device.name}</strong>
              {device.kind !== 'terminal_block' ? (
                <span>
                  {String(bottomRu).padStart(2, '0')}-{String(topRu).padStart(2, '0')}
                  {device.rackSizeRu ? ` / ${device.rackSizeRu} RU` : ''}
                </span>
              ) : null}
              {diagnostics.length > 0 ? <em>Placement issue</em> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
