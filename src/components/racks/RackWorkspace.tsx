import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Device, Location, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
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
}

interface RackCanvasModel {
  displayRus: number[];
  mountedDevices: MountedDevice[];
  warnings: string[];
}

const MAX_VIEWED_RACKS = 4;
const ADD_RACK_PLACEHOLDER = '__add_rack__';

export function RackWorkspace({ rack }: { rack: Rack }) {
  const { project } = useProject();
  const [viewedRackIds, setViewedRackIds] = useState<string[]>([rack.id]);
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

      {viewedRacks.length === 0 ? (
        <EmptyState title="Select A Rack">Select a rack from the navigator to open the rack elevation canvas.</EmptyState>
      ) : (
        <CanvasViewport ariaLabel="Rack canvas zoom and pan viewport" className="rack-canvas-viewport">
          <div className="rack-canvas-grid" aria-label="Viewed rack elevations">
            {viewedRacks.map((viewedRack) => {
              const location = project.locations.find((candidate) => candidate.id === viewedRack.locationId);
              const rackDevices = project.devices.filter((device) => device.rackId === viewedRack.id);
              const canvasModel = buildRackCanvasModel(viewedRack, rackDevices);

              return (
                <div className="rack-canvas-panel" key={viewedRack.id}>
                  <div className="workspace-context-chips rack-panel-context" aria-label={`${viewedRack.name} context`}>
                    {location ? <Badge>Location: {location.name}</Badge> : null}
                    <Badge>{viewedRack.numberingDirection.replace(/_/g, ' ')}</Badge>
                    <Badge>{canvasModel.mountedDevices.length} mounted</Badge>
                  </div>

                  {canvasModel.warnings.length > 0 ? (
                    <Alert className="rack-warning border-amber-200 bg-amber-50 text-amber-900">
                      <AlertDescription>
                        {canvasModel.warnings.map((warning) => (
                          <span key={warning}>{warning}</span>
                        ))}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <RackElevationCanvas
                    canRemove={viewedRacks.length > 1}
                    model={canvasModel}
                    rack={viewedRack}
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
  canRemove = false,
  onRemove,
}: {
  rack: Rack;
  model: RackCanvasModel;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  return (
    <Card className="rack-canvas-card">
      <CardHeader className="rack-canvas-header">
        <div>
          <CardTitle>{rack.name}</CardTitle>
          <p>
            Full rack elevation, {rack.heightRu} RU capacity. This view is read-only in v0.2.2.3.
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
          <div className="rack-stack" aria-label={`${rack.name} RU stack`}>
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
            {model.mountedDevices.map(({ device, bottomRu, topRu, rowStart, rowEnd }) => (
              <div
                className={device.status === 'retired' ? 'rack-device-block retired' : 'rack-device-block'}
                key={device.id}
                style={{ gridRow: `${rowStart} / ${rowEnd}` }}
              >
                <strong>{device.name}</strong>
                <span>
                  RU {String(bottomRu).padStart(2, '0')}-{String(topRu).padStart(2, '0')}
                  {device.rackSizeRu ? ` · ${device.rackSizeRu} RU` : ''}
                </span>
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

function buildRackCanvasModel(rack: Rack, devices: Device[]): RackCanvasModel {
  const heightRu = Math.max(0, Math.floor(rack.heightRu));
  const displayRus =
    rack.numberingDirection === 'top_to_bottom'
      ? Array.from({ length: heightRu }, (_, index) => index + 1)
      : Array.from({ length: heightRu }, (_, index) => heightRu - index);
  const warnings: string[] = [];
  const mountedDevices: MountedDevice[] = [];
  const occupiedRus = new Map<number, string>();

  for (const device of devices) {
    if (!device.rackSizeRu || device.rackSizeRu <= 0 || !Number.isSafeInteger(device.rackSizeRu)) {
      warnings.push(`${device.name} references this rack but has no valid rack size.`);
      continue;
    }

    if (!device.rackBottomRu || device.rackBottomRu <= 0 || !Number.isSafeInteger(device.rackBottomRu)) {
      warnings.push(`${device.name} references this rack but has no valid bottom RU.`);
      continue;
    }

    const bottomRu = device.rackBottomRu;
    const topRu = device.rackBottomRu + device.rackSizeRu - 1;

    if (bottomRu < 1 || topRu > heightRu) {
      warnings.push(`${device.name} placement RU ${bottomRu}-${topRu} is outside ${rack.name}.`);
      continue;
    }

    const occupied = Array.from({ length: device.rackSizeRu }, (_, index) => bottomRu + index);
    const overlappingRu = occupied.find((ru) => occupiedRus.has(ru));

    if (overlappingRu) {
      warnings.push(`${device.name} overlaps ${occupiedRus.get(overlappingRu)} at RU ${overlappingRu}.`);
    }

    for (const ru of occupied) {
      occupiedRus.set(ru, device.name);
    }

    const rowIndexes = occupied
      .map((ru) => displayRus.indexOf(ru) + 1)
      .filter((rowIndex) => rowIndex > 0);

    if (rowIndexes.length === 0) {
      warnings.push(`${device.name} could not be mapped to visible rack rows.`);
      continue;
    }

    mountedDevices.push({
      device,
      bottomRu,
      topRu,
      rowStart: Math.min(...rowIndexes),
      rowEnd: Math.max(...rowIndexes) + 1,
    });
  }

  return {
    displayRus,
    mountedDevices,
    warnings,
  };
}
