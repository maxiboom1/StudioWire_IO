import { useMemo } from 'react';
import type { Device, Location, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { isSelected, type SelectedObjectType, type SelectionState } from '../common/selection';

type TreeSection = 'racks' | 'devices';

export function LeftTree({
  selection,
  onSelectObject,
  onAddLocation,
  onAddRack,
  onAddDevice,
}: {
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddLocation: () => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const unassignedDevices = useMemo(
    () =>
      project.devices.filter((device) => {
        const hasKnownLocation = project.locations.some((location) => location.id === device.locationId);

        return !device.locationId || !hasKnownLocation;
      }),
    [project.devices, project.locations],
  );

  return (
    <aside className="left-tree" aria-label="Project tree">
      <div className="panel-heading">
        <span>Navigator</span>
        <strong>{project.schemaVersion}</strong>
      </div>
      <nav className="tree-nav">
        <TreeButton
          active={isSelected(selection, 'project', project.project.id)}
          depth={0}
          label={project.project.name}
          meta="Project root"
          onClick={() => onSelectObject('project', project.project.id)}
        />
        <TreeButton
          active={isSelected(selection, 'settings', 'settings')}
          depth={0}
          label="Settings"
          meta="Project config"
          onClick={() => onSelectObject('settings', 'settings')}
        />

        <TreeGroup
          label="Locations"
          count={project.locations.length}
          actionLabel="Add Location"
          onAction={onAddLocation}
        />
        {project.locations.length === 0 ? <TreeEmpty label="No locations" /> : null}
        {project.locations.map((location) => (
          <LocationBranch
            key={location.id}
            location={location}
            projectRacks={project.racks}
            projectDevices={project.devices}
            selection={selection}
            onSelectObject={onSelectObject}
            onAddRack={onAddRack}
            onAddDevice={onAddDevice}
          />
        ))}

        <TreeGroup
          label="Unassigned Devices"
          count={unassignedDevices.length}
          actionLabel="Add Device"
          onAction={() => onAddDevice(null)}
        />
        {unassignedDevices.length === 0 ? (
          <TreeEmpty label="No unassigned devices" />
        ) : (
          unassignedDevices.map((device) => (
            <TreeButton
              active={isSelected(selection, 'device', device.id)}
              depth={1}
              key={device.id}
              label={device.name}
              meta={device.code || device.role || 'Device'}
              onClick={() => onSelectObject('device', device.id)}
            />
          ))
        )}
      </nav>
    </aside>
  );
}

function LocationBranch({
  location,
  projectRacks,
  projectDevices,
  selection,
  onSelectObject,
  onAddRack,
  onAddDevice,
}: {
  location: Location;
  projectRacks: Rack[];
  projectDevices: Device[];
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string | null) => void;
}) {
  const racks = projectRacks.filter((rack) => rack.locationId === location.id);
  const devices = projectDevices.filter((device) => device.locationId === location.id);

  return (
    <div className="tree-branch">
      <TreeButton
        active={isSelected(selection, 'location', location.id)}
        depth={1}
        label={location.name}
        meta={location.type || 'Location'}
        onClick={() => onSelectObject('location', location.id)}
        onContextMenu={() => onAddDevice(location.id)}
      />
      <TreeCollection
        depth={2}
        label="Racks"
        section="racks"
        count={racks.length}
        actionLabel="Add Rack"
        onAction={() => onAddRack(location.id)}
      />
      {racks.length === 0 ? <TreeEmpty depth={3} label="No racks" /> : null}
      {racks.map((rack) => (
        <TreeButton
          active={isSelected(selection, 'rack', rack.id)}
          depth={3}
          key={rack.id}
          label={rack.name}
          meta={`${rack.heightRu} RU`}
          onClick={() => onSelectObject('rack', rack.id)}
        />
      ))}

      <TreeCollection
        depth={2}
        label="Devices"
        section="devices"
        count={devices.length}
        actionLabel="Add Device"
        onAction={() => onAddDevice(location.id)}
      />
      {devices.length === 0 ? <TreeEmpty depth={3} label="No devices" /> : null}
      {devices.map((device) => (
        <TreeButton
          active={isSelected(selection, 'device', device.id)}
          depth={3}
          key={device.id}
          label={device.name}
          meta={device.code || device.role || 'Device'}
          onClick={() => onSelectObject('device', device.id)}
        />
      ))}
    </div>
  );
}

function TreeGroup({
  label,
  count,
  actionLabel,
  onAction,
}: {
  label: string;
  count: number;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="tree-group"
      onContextMenu={(event) => {
        if (onAction) {
          event.preventDefault();
          onAction();
        }
      }}
    >
      <span>{label}</span>
      <div className="tree-group-actions">
        <strong>{count}</strong>
        {onAction ? (
          <button aria-label={actionLabel} className="tree-add-button" onClick={onAction} type="button">
            +
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TreeCollection({
  depth,
  label,
  section,
  count,
  actionLabel,
  onAction,
}: {
  depth: number;
  label: string;
  section: TreeSection;
  count: number;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`tree-collection ${section}`} style={{ paddingLeft: `${depth * 14}px` }}>
      <span>{label}</span>
      <div className="tree-group-actions">
        <strong>{count}</strong>
        {onAction ? (
          <button aria-label={actionLabel} className="tree-add-button" onClick={onAction} type="button">
            +
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TreeButton({
  active,
  depth,
  label,
  meta,
  onClick,
  onContextMenu,
}: {
  active: boolean;
  depth: number;
  label: string;
  meta: string;
  onClick: () => void;
  onContextMenu?: () => void;
}) {
  return (
    <button
      className={active ? 'tree-item active' : 'tree-item'}
      onClick={onClick}
      onContextMenu={(event) => {
        if (onContextMenu) {
          event.preventDefault();
          onContextMenu();
        }
      }}
      style={{ paddingLeft: `${10 + depth * 14}px` }}
      type="button"
    >
      <span>{label}</span>
      <small>{meta}</small>
    </button>
  );
}

function TreeEmpty({ depth = 1, label }: { depth?: number; label: string }) {
  return (
    <div className="tree-empty" style={{ paddingLeft: `${10 + depth * 14}px` }}>
      {label}
    </div>
  );
}
