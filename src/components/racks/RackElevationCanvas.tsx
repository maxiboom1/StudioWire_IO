import type { DragEvent } from 'react';
import { X } from 'lucide-react';
import type { Device, Rack } from '../../domain/types';
import { Button } from '../ui/button';
import type { RackCanvasModel } from './rackCanvasModel';
import type { RackDropPreview } from './rackDropTarget';
import { RackElevationGrid } from './RackElevationGrid';

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
      <RackElevationGrid
        rack={rack}
        model={model}
        dropPreview={dropPreview}
        draggingDeviceId={draggingDeviceId}
        onDeviceDragEnd={onDeviceDragEnd}
        onDeviceDragStart={onDeviceDragStart}
        onRackDragOver={onRackDragOver}
        onRackDrop={onRackDrop}
      />
    </div>
  );
}
