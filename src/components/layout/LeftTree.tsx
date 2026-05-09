import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import type { Device, Location, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { isSelected, type SelectedObjectType, type SelectionState } from '../common/selection';

type ContextAction = {
  label: string;
  onSelect: () => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  actions: ContextAction[];
} | null;

const UNASSIGNED_KEY = 'unassigned-devices';

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
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const isUnassignedOpen = !collapsedKeys.has(UNASSIGNED_KEY);
  const unassignedDevices = useMemo(
    () =>
      project.devices.filter((device) => {
        const hasKnownLocation = project.locations.some((location) => location.id === device.locationId);

        return !device.locationId || !hasKnownLocation;
      }),
    [project.devices, project.locations],
  );
  const isNavigatorEmpty = project.locations.length === 0 && unassignedDevices.length === 0;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    }

    function closeOnPointerDown() {
      setContextMenu(null);
    }

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnPointerDown);

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnPointerDown);
    };
  }, []);

  function toggle(key: string) {
    setCollapsedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function openContextMenu(event: MouseEvent, actions: ContextAction[]) {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      actions,
    });
  }

  function runContextAction(action: ContextAction) {
    setContextMenu(null);
    action.onSelect();
  }

  return (
    <aside className="left-tree" aria-label="Project tree">
      <div className="panel-heading">
        <span>Navigator</span>
        <strong>{project.schemaVersion}</strong>
      </div>
      <p className="tree-hint">Right-click folders to add items.</p>

      <nav className="tree-nav" aria-label="Project navigator">
        {isNavigatorEmpty ? (
          <EmptyNavigatorPrompt
            onContextMenu={(event) =>
              openContextMenu(event, [
                { label: 'Add Location', onSelect: onAddLocation },
                { label: 'Add Unassigned Device', onSelect: () => onAddDevice(null) },
              ])
            }
          />
        ) : (
          <>
            {project.locations.map((location) => (
              <LocationBranch
                collapsedKeys={collapsedKeys}
                key={location.id}
                location={location}
                onAddDevice={onAddDevice}
                onAddRack={onAddRack}
                onContextMenu={openContextMenu}
                onSelectObject={onSelectObject}
                onToggle={toggle}
                projectDevices={project.devices}
                projectRacks={project.racks}
                selection={selection}
              />
            ))}

            <TreeRow
              count={unassignedDevices.length}
              depth={0}
              isOpen={isUnassignedOpen}
              kind="folder"
              label="Unassigned Devices"
              meta="No location"
              onContextMenu={(event) =>
                openContextMenu(event, [{ label: 'Add Unassigned Device', onSelect: () => onAddDevice(null) }])
              }
              onToggle={() => toggle(UNASSIGNED_KEY)}
            />

            {isUnassignedOpen ? (
              unassignedDevices.length === 0 ? (
                <TreeEmpty depth={1} label="No unassigned devices" />
              ) : (
                unassignedDevices.map((device) => (
                  <TreeRow
                    active={isSelected(selection, 'device', device.id)}
                    depth={1}
                    key={device.id}
                    kind="item"
                    label={device.name}
                    meta={device.code || device.role || 'Device'}
                    onClick={() => onSelectObject('device', device.id)}
                  />
                ))
              )
            ) : null}
          </>
        )}
      </nav>

      {contextMenu ? (
        <div
          className="tree-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {contextMenu.actions.map((action) => (
            <button
              key={action.label}
              onClick={() => runContextAction(action)}
              role="menuitem"
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function LocationBranch({
  collapsedKeys,
  location,
  projectRacks,
  projectDevices,
  selection,
  onSelectObject,
  onAddRack,
  onAddDevice,
  onContextMenu,
  onToggle,
}: {
  collapsedKeys: Set<string>;
  location: Location;
  projectRacks: Rack[];
  projectDevices: Device[];
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string | null) => void;
  onContextMenu: (event: MouseEvent, actions: ContextAction[]) => void;
  onToggle: (key: string) => void;
}) {
  const locationKey = `location:${location.id}`;
  const racksKey = `location:${location.id}:racks`;
  const devicesKey = `location:${location.id}:devices`;
  const isLocationOpen = !collapsedKeys.has(locationKey);
  const isRacksOpen = !collapsedKeys.has(racksKey);
  const isDevicesOpen = !collapsedKeys.has(devicesKey);
  const racks = projectRacks.filter((rack) => rack.locationId === location.id);
  const devices = projectDevices.filter((device) => device.locationId === location.id);

  return (
    <>
      <TreeRow
        active={isSelected(selection, 'location', location.id)}
        count={racks.length + devices.length}
        depth={0}
        isOpen={isLocationOpen}
        kind="folder"
        label={location.name}
        meta={location.type || 'Location'}
        onClick={() => onSelectObject('location', location.id)}
        onContextMenu={(event) =>
          onContextMenu(event, [
            { label: 'Add Rack', onSelect: () => onAddRack(location.id) },
            { label: 'Add Device', onSelect: () => onAddDevice(location.id) },
          ])
        }
        onToggle={() => onToggle(locationKey)}
      />

      {isLocationOpen ? (
        <>
          <TreeRow
            count={racks.length}
            depth={1}
            isOpen={isRacksOpen}
            kind="folder"
            label="Racks"
            meta="Rack list"
            onContextMenu={(event) =>
              onContextMenu(event, [{ label: 'Add Rack', onSelect: () => onAddRack(location.id) }])
            }
            onToggle={() => onToggle(racksKey)}
          />

          {isRacksOpen ? (
            racks.length === 0 ? (
              <TreeEmpty depth={2} label="No racks" />
            ) : (
              racks.map((rack) => (
                <TreeRow
                  active={isSelected(selection, 'rack', rack.id)}
                  depth={2}
                  key={rack.id}
                  kind="item"
                  label={rack.name}
                  meta={`${rack.heightRu} RU`}
                  onClick={() => onSelectObject('rack', rack.id)}
                />
              ))
            )
          ) : null}

          <TreeRow
            count={devices.length}
            depth={1}
            isOpen={isDevicesOpen}
            kind="folder"
            label="Devices"
            meta="Device list"
            onContextMenu={(event) =>
              onContextMenu(event, [{ label: 'Add Device', onSelect: () => onAddDevice(location.id) }])
            }
            onToggle={() => onToggle(devicesKey)}
          />

          {isDevicesOpen ? (
            devices.length === 0 ? (
              <TreeEmpty depth={2} label="No devices" />
            ) : (
              devices.map((device) => (
                <TreeRow
                  active={isSelected(selection, 'device', device.id)}
                  depth={2}
                  key={device.id}
                  kind="item"
                  label={device.name}
                  meta={device.code || device.role || 'Device'}
                  onClick={() => onSelectObject('device', device.id)}
                />
              ))
            )
          ) : null}
        </>
      ) : null}
    </>
  );
}

function TreeRow({
  active = false,
  count,
  depth,
  isOpen = false,
  kind,
  label,
  meta,
  onClick,
  onContextMenu,
  onToggle,
}: {
  active?: boolean;
  count?: number;
  depth: number;
  isOpen?: boolean;
  kind: 'folder' | 'item';
  label: string;
  meta: string;
  onClick?: () => void;
  onContextMenu?: (event: MouseEvent) => void;
  onToggle?: () => void;
}) {
  const indent = 8 + depth * 14;

  return (
    <div
      className={active ? 'tree-row active' : 'tree-row'}
      onContextMenu={onContextMenu}
      style={{ paddingLeft: `${indent}px` }}
    >
      {kind === 'folder' ? (
        <button
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label}`}
          aria-expanded={isOpen}
          className="tree-toggle"
          onClick={onToggle}
          type="button"
        >
          {isOpen ? 'v' : '>'}
        </button>
      ) : (
        <span className="tree-spacer" aria-hidden="true" />
      )}
      <button className="tree-label-button" onClick={onClick ?? onToggle} type="button">
        <span className="tree-icon" aria-hidden="true">
          {kind === 'folder' ? '[ ]' : '-'}
        </span>
        <span className="tree-label-text">
          <span>{label}</span>
          <small>{meta}</small>
        </span>
      </button>
      {typeof count === 'number' ? <span className="tree-count">{count}</span> : null}
    </div>
  );
}

function TreeEmpty({ depth, label }: { depth: number; label: string }) {
  return (
    <div className="tree-empty" style={{ paddingLeft: `${34 + depth * 14}px` }}>
      {label}
    </div>
  );
}

function EmptyNavigatorPrompt({
  onContextMenu,
}: {
  onContextMenu: (event: MouseEvent) => void;
}) {
  return (
    <div className="tree-empty-prompt" onContextMenu={onContextMenu}>
      <strong>Create location or device</strong>
      <span>Right-click here to start the project tree.</span>
    </div>
  );
}
