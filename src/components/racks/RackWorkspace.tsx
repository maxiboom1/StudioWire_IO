import type { CSSProperties } from 'react';
import type { Device, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { EmptyState, WorkspaceHeader } from '../common/WorkspaceBits';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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

export function RackWorkspace({ rack }: { rack: Rack }) {
  const { project } = useProject();
  const location = project.locations.find((candidate) => candidate.id === rack.locationId);
  const rackDevices = project.devices.filter((device) => device.rackId === rack.id);
  const canvasModel = buildRackCanvasModel(rack, rackDevices);

  return (
    <section className="workspace rack-workspace" aria-label="Rack canvas">
      <WorkspaceHeader eyebrow="Rack Elevation" title={rack.name} badge={`${rack.heightRu} RU`} />
      <div className="workspace-context-chips" aria-label="Rack context">
        {location ? <Badge>Location: {location.name}</Badge> : null}
        <Badge>{rack.numberingDirection.replace(/_/g, ' ')}</Badge>
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

      <RackElevationCanvas rack={rack} model={canvasModel} />

      {rackDevices.length === 0 ? (
        <EmptyState title="Rack Is Empty">Assign rack-mounted devices from the device inspector.</EmptyState>
      ) : null}
    </section>
  );
}

function RackElevationCanvas({
  rack,
  model,
}: {
  rack: Rack;
  model: RackCanvasModel;
}) {
  return (
    <Card className="rack-canvas-card">
      <CardHeader className="rack-canvas-header">
        <div>
          <CardTitle>{rack.name}</CardTitle>
          <p>
            Full rack elevation, {rack.heightRu} RU capacity. This view is read-only in v0.2.2.1.
          </p>
        </div>
        <Badge>{model.displayRus.length} RU shown</Badge>
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
