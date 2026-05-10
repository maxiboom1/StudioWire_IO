import { useState } from 'react';
import type { Device } from '../../domain/types';
import { cn } from '../../lib/utils';
import { useCanvasInteraction } from '../../state/CanvasInteractionContext';
import { useProject } from '../../state/ProjectContext';
import { CrosspointPanel, type CrosspointAnchor } from '../common/CrosspointPanel';
import { EmptyState, WorkspaceHeader } from '../common/WorkspaceBits';
import { Badge } from '../ui/badge';
import { PortCableColumn } from './canvas/PortCableColumn';

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project, disconnectCableEndpoint } = useProject();
  const { clearObjectDropPicker, getObjectDropState, objectDropPicker } = useCanvasInteraction();
  const [crosspointAnchor, setCrosspointAnchor] = useState<CrosspointAnchor | null>(null);
  const location = device.locationId ? project.locations.find((candidate) => candidate.id === device.locationId) : null;
  const rack = device.rackId ? project.racks.find((candidate) => candidate.id === device.rackId) : null;
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const ports = project.ports.filter((port) => port.deviceId === device.id);
  const groupsByDirection = {
    input: portGroups.filter((group) => group.direction === 'input'),
    output: portGroups.filter((group) => group.direction === 'output'),
    bidirectional: portGroups.filter((group) => group.direction === 'bidirectional'),
  };
  const sideOutputGroups = [...groupsByDirection.output, ...groupsByDirection.bidirectional];
  const canvasTarget = { objectType: 'device' as const, objectId: device.id, label: device.name };
  const objectDropState = getObjectDropState(canvasTarget);
  const objectDropAnchor =
    objectDropPicker?.target.objectType === 'device' && objectDropPicker.target.objectId === device.id
      ? objectDropPicker.anchor
      : null;

  return (
    <section className="workspace" aria-label="Device canvas">
      <WorkspaceHeader eyebrow="Device" title={device.name} badge={device.status} />
      {location || rack ? (
        <div className="workspace-context-chips" aria-label="Device context">
          {location ? <Badge>Location: {location.name}</Badge> : null}
          {rack ? <Badge>Rack: {rack.name}</Badge> : null}
        </div>
      ) : null}
      <div className="device-canvas">
        <div
          className={cn(
            'device-block',
            device.status === 'retired' ? 'retired' : null,
            objectDropState !== 'idle' ? `canvas-object-drop-${objectDropState}` : null,
          )}
          data-crosspoint-object-id={device.id}
          data-crosspoint-object-label={device.name}
          data-crosspoint-object-type="device"
        >
          <div className="device-title">
            <strong>{device.name}</strong>
            <span>{device.status === 'retired' ? 'Retired' : device.code || device.labelPrefix || 'No code'}</span>
          </div>
          <div className="device-io-grid">
            <PortCableColumn
              title="Inputs"
              side="left"
              groups={groupsByDirection.input}
              onDisconnectEndpoint={disconnectCableEndpoint}
              onSelectAnchor={setCrosspointAnchor}
              ports={ports}
              project={project}
            />
            <div className="device-core">
              <span>{device.manufacturer || 'Manufacturer not set'}</span>
              <strong>{device.model || device.role || 'Device'}</strong>
              <small>{device.mountType}</small>
            </div>
            <PortCableColumn
              title="Outputs / Bidirectional"
              side="right"
              groups={sideOutputGroups}
              onDisconnectEndpoint={disconnectCableEndpoint}
              onSelectAnchor={setCrosspointAnchor}
              ports={ports}
              project={project}
            />
          </div>
        </div>
        {ports.length === 0 ? (
          <EmptyState title="No Generated Ports">
            This device has no port groups yet. v0.1 locks port group creation to the Add Device workflow.
          </EmptyState>
        ) : null}
        <CrosspointPanel anchor={crosspointAnchor} onClear={() => setCrosspointAnchor(null)} />
        <CrosspointPanel
          anchor={objectDropAnchor}
          objectFilter={objectDropPicker?.target}
          onClear={clearObjectDropPicker}
        />
      </div>
    </section>
  );
}
