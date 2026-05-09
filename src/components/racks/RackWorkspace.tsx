import type { CSSProperties, DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { analyzeRackPlacements, type RackPlacementDiagnostic } from '../../domain/rackDiagnostics';
import { validateRackPlacement } from '../../domain/rackPlacement';
import type { Device, Location, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { clearDeviceDragData, readDeviceDragData, writeDeviceDragData } from '../common/deviceDrag';
import { EmptyState, WorkspaceHeader } from '../common/WorkspaceBits';
import { CanvasViewport } from '../common/CanvasViewport';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface MountedDevice {
  device: Device;
  bottomRu: number;
  topRu: number;
  rowStart: number;
  rowEnd: number;
  diagnostics: RackPlacementDiagnostic[];
}

interface RackCanvasModel {
  displayRus: number[];
  mountedDevices: MountedDevice[];
  diagnostics: RackPlacementDiagnostic[];
}

interface DropPreview {
  deviceId: string;
  rackId: string;
  bottomRu: number;
  topRu: number;
  ok: boolean;
  message: string;
}

const MAX_VIEWED_RACKS = 4;
const ADD_RACK_PLACEHOLDER = '__add_rack__';

export function RackWorkspace({ rack }: { rack: Rack }) {
  const { project, moveMountedDevice } = useProject();
  const [viewedRackIds, setViewedRackIds] = useState<string[]>([rack.id]);
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [dropMessage, setDropMessage] = useState<string | null>(null);
  const placementDiagnostics = useMemo(() => analyzeRackPlacements(project), [project]);
  const viewedRacks = useMemo(
    () =>
      viewedRackIds
        .map((rackId) => project.racks.find((candidate) => candidate.id === rackId))
        .filter((candidate): candidate is Rack => Boolean(candidate)),
    [project.racks, viewedRackIds],
  );
  const addableRacks = project.racks.filter((candidate) => !viewedRackIds.includes(candidate.id));
  const hasReachedRackLimit = viewedRacks.length >= MAX_VIEWED_RACKS;

  useEffect(() => {
    setViewedRackIds([rack.id]);
  }, [rack.id]);

  function addRackToView(rackId: string) {
    if (rackId === ADD_RACK_PLACEHOLDER) {
      return;
    }

    setViewedRackIds((current) => {
      if (current.includes(rackId) || current.length >= MAX_VIEWED_RACKS) {
        return current;
      }

      return [...current, rackId];
    });
  }

  function removeRackFromView(rackId: string) {
    setViewedRackIds((current) => (current.length <= 1 ? current : current.filter((id) => id !== rackId)));
  }

  function handleDeviceDragStart(event: DragEvent<HTMLDivElement>, device: Device) {
    if (!device.rackSizeRu || device.rackSizeRu <= 0) {
      event.preventDefault();
      setDropMessage(`${device.name} cannot be moved because it has no positive rack size.`);
      return;
    }

    writeDeviceDragData(event, device.id);
    setDraggingDeviceId(device.id);
    setDropMessage(null);
  }

  function handleDeviceDragEnd() {
    setDraggingDeviceId(null);
    setDropPreview(null);
    clearDeviceDragData();
  }

  function handleRackDragOver(event: DragEvent<HTMLDivElement>, targetRack: Rack, model: RackCanvasModel) {
    const deviceId = draggingDeviceId || readDeviceDragData(event);

    if (!deviceId) {
      return;
    }

    const bottomRu = getTargetBottomRu(event, model.displayRus);

    if (bottomRu === null) {
      return;
    }

    event.preventDefault();
    const result = validateRackPlacement(project, {
      deviceId,
      targetRackId: targetRack.id,
      targetBottomRu: bottomRu,
    });

    setDropPreview(
      result.ok
        ? {
            deviceId,
            rackId: targetRack.id,
            bottomRu: result.targetBottomRu,
            topRu: result.targetTopRu,
            ok: true,
            message: `Move to ${targetRack.name} RU ${result.targetBottomRu}-${result.targetTopRu}`,
          }
        : {
            deviceId,
            rackId: targetRack.id,
            bottomRu,
            topRu: bottomRu,
            ok: false,
            message: result.message,
          },
    );
    event.dataTransfer.dropEffect = result.ok ? 'move' : 'none';
  }

  function handleRackDrop(event: DragEvent<HTMLDivElement>, targetRack: Rack, model: RackCanvasModel) {
    event.preventDefault();
    const deviceId = draggingDeviceId || readDeviceDragData(event);
    const bottomRu = getTargetBottomRu(event, model.displayRus);

    if (!deviceId || bottomRu === null) {
      setDropMessage('Device move blocked: no valid target RU was found.');
      setDropPreview(null);
      return;
    }

    const result = validateRackPlacement(project, {
      deviceId,
      targetRackId: targetRack.id,
      targetBottomRu: bottomRu,
    });

    if (!result.ok) {
      setDropMessage(`Device move blocked: ${result.message}`);
      setDropPreview(null);
      return;
    }

    moveMountedDevice({
      deviceId,
      targetRackId: targetRack.id,
      targetBottomRu: result.targetBottomRu,
    });
    setDropMessage(`${result.device.name} moved to ${targetRack.name} RU ${result.targetBottomRu}-${result.targetTopRu}.`);
    setDropPreview(null);
    clearDeviceDragData();
  }

  return (
    <section className="workspace rack-workspace" aria-label="Rack canvas">
      <WorkspaceHeader eyebrow="Rack Elevation" title={rack.name} badge={`${viewedRacks.length} of ${MAX_VIEWED_RACKS} shown`} />
      <RackViewSelector
        addableRacks={addableRacks}
        hasReachedRackLimit={hasReachedRackLimit}
        locations={project.locations}
        onAddRack={addRackToView}
        rackCount={viewedRacks.length}
      />
      {dropMessage ? <p className="rack-drop-message">{dropMessage}</p> : null}

      {viewedRacks.length === 0 ? (
        <EmptyState title="Select A Rack">Select a rack from the navigator to open the rack elevation canvas.</EmptyState>
      ) : (
        <CanvasViewport ariaLabel="Rack canvas zoom and pan viewport" className="rack-canvas-viewport">
          <div className="rack-canvas-grid" aria-label="Viewed rack elevations">
            {viewedRacks.map((viewedRack) => {
              const location = project.locations.find((candidate) => candidate.id === viewedRack.locationId);
              const rackDevices = project.devices.filter((device) => device.rackId === viewedRack.id);
              const canvasModel = buildRackCanvasModel(
                viewedRack,
                rackDevices,
                placementDiagnostics.filter((diagnostic) => diagnostic.rackId === viewedRack.id),
              );

              return (
                <div className="rack-canvas-panel" key={viewedRack.id}>
                  <div className="workspace-context-chips rack-panel-context" aria-label={`${viewedRack.name} context`}>
                    {location ? <Badge>Location: {location.name}</Badge> : null}
                    <Badge>{viewedRack.numberingDirection.replace(/_/g, ' ')}</Badge>
                    <Badge>{canvasModel.mountedDevices.length} drawn</Badge>
                    {canvasModel.diagnostics.length > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800">{canvasModel.diagnostics.length} placement issue(s)</Badge>
                    ) : null}
                  </div>

                  {canvasModel.diagnostics.length > 0 ? (
                    <Alert className="rack-warning border-amber-200 bg-amber-50 text-amber-900">
                      <AlertDescription>
                        {canvasModel.diagnostics.map((diagnostic) => (
                          <span key={`${diagnostic.code}-${diagnostic.deviceId}-${diagnostic.relatedDeviceId ?? ''}`}>
                            {diagnostic.message}
                          </span>
                        ))}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <RackElevationCanvas
                    canRemove={viewedRacks.length > 1}
                    dropPreview={dropPreview?.rackId === viewedRack.id ? dropPreview : null}
                    draggingDeviceId={draggingDeviceId}
                    model={canvasModel}
                    rack={viewedRack}
                    onDeviceDragEnd={handleDeviceDragEnd}
                    onDeviceDragStart={handleDeviceDragStart}
                    onRackDragOver={(event) => handleRackDragOver(event, viewedRack, canvasModel)}
                    onRackDrop={(event) => handleRackDrop(event, viewedRack, canvasModel)}
                    onRemove={() => removeRackFromView(viewedRack.id)}
                  />

                  {rackDevices.length === 0 ? (
                    <EmptyState title="Rack Is Empty">Assign rack-mounted devices from the device inspector.</EmptyState>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CanvasViewport>
      )}
    </section>
  );
}

function RackViewSelector({
  addableRacks,
  hasReachedRackLimit,
  locations,
  rackCount,
  onAddRack,
}: {
  addableRacks: Rack[];
  hasReachedRackLimit: boolean;
  locations: Location[];
  rackCount: number;
  onAddRack: (rackId: string) => void;
}) {
  return (
    <Card className="rack-view-selector">
      <CardContent className="rack-view-selector-content">
        <div>
          <strong>Rack view</strong>
          <p>View up to four racks at once. This selection is local UI state only.</p>
        </div>
        <Select disabled={hasReachedRackLimit || addableRacks.length === 0} value={ADD_RACK_PLACEHOLDER} onValueChange={onAddRack}>
          <SelectTrigger className="rack-view-select" aria-label="Add rack to canvas">
            <SelectValue placeholder="Add rack to view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ADD_RACK_PLACEHOLDER}>Add rack to view</SelectItem>
            {addableRacks.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                {getRackOptionLabel(candidate, locations)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge>{rackCount}/{MAX_VIEWED_RACKS} racks</Badge>
        {hasReachedRackLimit ? (
          <span className="rack-view-limit">Maximum four racks can be viewed at once.</span>
        ) : addableRacks.length === 0 ? (
          <span className="rack-view-limit">No additional racks available.</span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RackElevationCanvas({
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
  dropPreview: DropPreview | null;
  draggingDeviceId: string | null;
  canRemove?: boolean;
  onDeviceDragEnd: () => void;
  onDeviceDragStart: (event: DragEvent<HTMLDivElement>, device: Device) => void;
  onRackDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onRackDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemove?: () => void;
}) {
  const previewRows = dropPreview ? getPreviewRows(model.displayRus, dropPreview.bottomRu, dropPreview.topRu) : null;

  return (
    <Card className="rack-canvas-card">
      <CardHeader className="rack-canvas-header">
        <div>
          <CardTitle>{rack.name}</CardTitle>
          <p>
            Full rack elevation, {rack.heightRu} RU capacity. This view is read-only in v0.2.2.6.
          </p>
        </div>
        <div className="rack-canvas-actions">
          <Badge>{model.displayRus.length} RU shown</Badge>
          {canRemove ? (
            <Button aria-label={`Remove ${rack.name} from rack view`} size="icon" type="button" variant="ghost" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rack-elevation" style={{ '--rack-row-count': model.displayRus.length } as CSSProperties}>
          <div className="rack-rail rack-rail-left" aria-hidden="true" />
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
              >
                <span>RU {String(ru).padStart(2, '0')}</span>
              </div>
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
                  device.status === 'retired' ? 'rack-device-block retired' : 'rack-device-block',
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
                <span>
                  RU {String(bottomRu).padStart(2, '0')}-{String(topRu).padStart(2, '0')}
                  {device.rackSizeRu ? ` · ${device.rackSizeRu} RU` : ''}
                </span>
                {diagnostics.length > 0 ? <em>Placement issue</em> : null}
              </div>
            ))}
          </div>
          <div className="rack-rail rack-rail-right" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function getRackOptionLabel(rack: Rack, locations: Location[]): string {
  const location = locations.find((candidate) => candidate.id === rack.locationId);

  return location ? `${location.name} / ${rack.name}` : rack.name;
}

function getTargetBottomRu(event: DragEvent<HTMLDivElement>, displayRus: number[]): number | null {
  if (displayRus.length === 0) {
    return null;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const rowHeight = rect.height / displayRus.length;

  if (rowHeight <= 0) {
    return null;
  }

  const rowIndex = Math.min(
    displayRus.length - 1,
    Math.max(0, Math.floor((event.clientY - rect.top) / rowHeight)),
  );

  return displayRus[rowIndex] ?? null;
}

function getPreviewRows(
  displayRus: number[],
  bottomRu: number,
  topRu: number,
): { rowStart: number; rowEnd: number } | null {
  const rowIndexes = Array.from({ length: Math.max(0, topRu - bottomRu + 1) }, (_, index) => bottomRu + index)
    .map((ru) => displayRus.indexOf(ru) + 1)
    .filter((rowIndex) => rowIndex > 0);

  if (rowIndexes.length === 0) {
    const fallbackIndex = displayRus.indexOf(bottomRu) + 1;

    return fallbackIndex > 0 ? { rowStart: fallbackIndex, rowEnd: fallbackIndex + 1 } : null;
  }

  return {
    rowStart: Math.min(...rowIndexes),
    rowEnd: Math.max(...rowIndexes) + 1,
  };
}

function buildRackCanvasModel(
  rack: Rack,
  devices: Device[],
  diagnostics: RackPlacementDiagnostic[],
): RackCanvasModel {
  const heightRu = Math.max(0, Math.floor(rack.heightRu));
  const displayRus =
    rack.numberingDirection === 'top_to_bottom'
      ? Array.from({ length: heightRu }, (_, index) => index + 1)
      : Array.from({ length: heightRu }, (_, index) => heightRu - index);
  const mountedDevices: MountedDevice[] = [];

  for (const device of devices) {
    const deviceDiagnostics = diagnostics.filter((diagnostic) => diagnostic.deviceId === device.id);
    const hasBlockingDiagnostic = deviceDiagnostics.some((diagnostic) =>
      [
        'device-references-missing-rack',
        'rack-mounted-device-without-rack',
        'rack-mounted-device-invalid-size-ru',
        'rack-mounted-device-invalid-bottom-ru',
        'rack-mounted-device-below-ru-one',
        'rack-mounted-device-exceeds-rack-height',
      ].includes(diagnostic.code),
    );

    if (hasBlockingDiagnostic) {
      continue;
    }

    if (!device.rackSizeRu || device.rackSizeRu <= 0 || !Number.isSafeInteger(device.rackSizeRu)) {
      continue;
    }

    if (!device.rackBottomRu || device.rackBottomRu <= 0 || !Number.isSafeInteger(device.rackBottomRu)) {
      continue;
    }

    const bottomRu = device.rackBottomRu;
    const topRu = device.rackBottomRu + device.rackSizeRu - 1;

    if (bottomRu < 1 || topRu > heightRu) {
      continue;
    }

    const occupied = Array.from({ length: device.rackSizeRu }, (_, index) => bottomRu + index);
    const rowIndexes = occupied
      .map((ru) => displayRus.indexOf(ru) + 1)
      .filter((rowIndex) => rowIndex > 0);

    if (rowIndexes.length === 0) {
      continue;
    }

    mountedDevices.push({
      device,
      bottomRu,
      topRu,
      rowStart: Math.min(...rowIndexes),
      rowEnd: Math.max(...rowIndexes) + 1,
      diagnostics: deviceDiagnostics,
    });
  }

  return {
    displayRus,
    mountedDevices,
    diagnostics,
  };
}
