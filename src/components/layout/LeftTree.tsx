import { ChevronDown, ChevronRight, Folder, HardDrive, MapPin, MoreHorizontal, Server } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import logoUrl from '../../assets/studiowire-logo.svg';
import type { Device, Location, Rack } from '../../domain/types';
import { ProjectJsonInput, useProject } from '../../state/ProjectContext';
import { isSelected, type SelectedObjectType, type SelectionState } from '../common/selection';
import { Badge } from '../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '../ui/sidebar';

type ContextAction = {
  label: string;
  onSelect: () => void;
};

const APP_VERSION = '0.2.1.4';
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
  const {
    project,
    createNewProject,
    loadSampleProject,
    exportProjectJson,
    validateProject,
  } = useProject();
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());
  const unassignedDevices = useMemo(
    () =>
      project.devices.filter((device) => {
        const hasKnownLocation = project.locations.some((location) => location.id === device.locationId);

        return !device.locationId || !hasKnownLocation;
      }),
    [project.devices, project.locations],
  );
  const validationCount = project.validationIssues.length;
  const isNavigatorEmpty = project.locations.length === 0 && unassignedDevices.length === 0;

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

  function selectProject() {
    onSelectObject('project', project.project.id);
  }

  function openSettings() {
    onSelectObject('settings', 'settings');
  }

  function loadSampleAndSelectProject() {
    loadSampleProject();
    onSelectObject('project', project.project.id);
  }

  function createNewAndSelectProject() {
    createNewProject();
    onSelectObject('project', project.project.id);
  }

  return (
    <Sidebar aria-label="StudioWire project sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <button
            className="min-w-0 flex-1 rounded-md border-0 bg-transparent p-0 text-left hover:bg-transparent"
            data-ui="sidebar-project-header"
            onClick={selectProject}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img alt="StudioWire IO logo" className="h-9 w-24 shrink-0 object-contain" src={logoUrl} />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm font-semibold text-studio-text">StudioWire IO</span>
                <span className="truncate text-xs text-studio-muted">{project.project.name}</span>
              </span>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Project actions"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-studio-muted hover:bg-slate-100 hover:text-studio-text"
                data-ui="project-actions-trigger"
                type="button"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Project actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={createNewAndSelectProject}>New Project</DropdownMenuItem>
              <DropdownMenuItem onSelect={loadSampleAndSelectProject}>Load Sample</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100">
                  Import JSON
                  <ProjectJsonInput
                    className="file-input"
                    onImportComplete={() => onSelectObject('project', project.project.id)}
                  />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportProjectJson}>Export JSON</DropdownMenuItem>
              <DropdownMenuItem onSelect={validateProject}>Validate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={openSettings}>Project Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Project navigator</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isNavigatorEmpty ? (
                <SidebarMenuItem>
                  <ActionContextMenu
                    actions={[
                      { label: 'Add Location', onSelect: onAddLocation },
                      { label: 'Add Unassigned Device', onSelect: () => onAddDevice(null) },
                    ]}
                  >
                    <button
                      className="grid w-full gap-1 rounded-lg border border-dashed border-studio-border bg-white p-3 text-left"
                      data-ui="empty-project-prompt"
                      type="button"
                    >
                      <span className="text-sm font-semibold text-studio-text">Create location or device</span>
                      <span className="text-xs leading-5 text-studio-muted">
                        Right-click here to start the project tree.
                      </span>
                    </button>
                  </ActionContextMenu>
                </SidebarMenuItem>
              ) : (
                <>
                  {project.locations.map((location) => (
                    <LocationBranch
                      collapsedKeys={collapsedKeys}
                      key={location.id}
                      location={location}
                      onAddDevice={onAddDevice}
                      onAddRack={onAddRack}
                      onSelectObject={onSelectObject}
                      onToggle={toggle}
                      projectDevices={project.devices}
                      projectRacks={project.racks}
                      selection={selection}
                    />
                  ))}

                  <UnassignedBranch
                    collapsedKeys={collapsedKeys}
                    devices={unassignedDevices}
                    onAddDevice={onAddDevice}
                    onSelectObject={onSelectObject}
                    onToggle={toggle}
                    selection={selection}
                  />
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="grid gap-2 text-xs text-studio-muted">
          <div className="flex items-center justify-between gap-3">
            <span>App {APP_VERSION}</span>
            <Badge className={validationCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}>
              {validationCount > 0 ? `${validationCount} issue(s)` : 'Valid'}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Schema</span>
            <span>{project.schemaVersion}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
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
    <SidebarMenuItem>
      <Collapsible open={isLocationOpen} onOpenChange={() => onToggle(locationKey)}>
        <ActionContextMenu
          actions={[
            { label: 'Add Rack', onSelect: () => onAddRack(location.id) },
            { label: 'Add Device', onSelect: () => onAddDevice(location.id) },
          ]}
        >
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <button
                aria-label={`${isLocationOpen ? 'Collapse' : 'Expand'} ${location.name}`}
                className="grid h-8 w-6 shrink-0 place-items-center rounded-md text-studio-muted hover:bg-slate-100"
                data-ui="location-collapse-trigger"
                type="button"
              >
                {isLocationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
            <SidebarMenuButton
              isActive={isSelected(selection, 'location', location.id)}
              onClick={() => onSelectObject('location', location.id)}
            >
              <MapPin className="h-4 w-4 text-studio-muted" />
              <span className="min-w-0 flex-1 truncate">{location.name}</span>
              <SidebarMenuBadge>{racks.length + devices.length}</SidebarMenuBadge>
            </SidebarMenuButton>
          </div>
        </ActionContextMenu>

        <CollapsibleContent>
          <SidebarMenuSub>
            <FolderBranch
              actions={[{ label: 'Add Rack', onSelect: () => onAddRack(location.id) }]}
              count={racks.length}
              emptyLabel="No racks"
              icon={<Server className="h-3.5 w-3.5" />}
              isOpen={isRacksOpen}
              label="Racks"
              onToggle={() => onToggle(racksKey)}
            >
              {racks.map((rack) => (
                <SidebarMenuSubItem key={rack.id}>
                  <SidebarMenuSubButton
                    isActive={isSelected(selection, 'rack', rack.id)}
                    onClick={() => onSelectObject('rack', rack.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{rack.name}</span>
                    <span className="text-[0.68rem] text-studio-muted">{rack.heightRu} RU</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </FolderBranch>

            <FolderBranch
              actions={[{ label: 'Add Device', onSelect: () => onAddDevice(location.id) }]}
              count={devices.length}
              emptyLabel="No devices"
              icon={<HardDrive className="h-3.5 w-3.5" />}
              isOpen={isDevicesOpen}
              label="Devices"
              onToggle={() => onToggle(devicesKey)}
            >
              {devices.map((device) => (
                <DeviceTreeItem
                  active={isSelected(selection, 'device', device.id)}
                  device={device}
                  key={device.id}
                  onSelect={() => onSelectObject('device', device.id)}
                />
              ))}
            </FolderBranch>
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function FolderBranch({
  actions,
  children,
  count,
  emptyLabel,
  icon,
  isOpen,
  label,
  onToggle,
}: {
  actions: ContextAction[];
  children: ReactNode;
  count: number;
  emptyLabel: string;
  icon: ReactNode;
  isOpen: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <SidebarMenuSubItem>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <ActionContextMenu actions={actions}>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <button
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label}`}
                className="grid h-7 w-5 shrink-0 place-items-center rounded-md text-studio-muted hover:bg-slate-100"
                data-ui="folder-collapse-trigger"
                type="button"
              >
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </CollapsibleTrigger>
            <SidebarMenuSubButton onClick={onToggle}>
              {icon}
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.66rem] font-semibold">{count}</span>
            </SidebarMenuSubButton>
          </div>
        </ActionContextMenu>

        <CollapsibleContent>
          <SidebarMenuSub className="ml-5">
            {count === 0 ? (
              <SidebarMenuSubItem>
                <div className="px-2 py-1 text-xs text-studio-muted">{emptyLabel}</div>
              </SidebarMenuSubItem>
            ) : (
              children
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function UnassignedBranch({
  collapsedKeys,
  devices,
  selection,
  onSelectObject,
  onAddDevice,
  onToggle,
}: {
  collapsedKeys: Set<string>;
  devices: Device[];
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddDevice: (locationId: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const isOpen = !collapsedKeys.has(UNASSIGNED_KEY);

  return (
    <SidebarMenuItem>
      <Collapsible open={isOpen} onOpenChange={() => onToggle(UNASSIGNED_KEY)}>
        <ActionContextMenu actions={[{ label: 'Add Unassigned Device', onSelect: () => onAddDevice(null) }]}>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <button
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} Unassigned Devices`}
                className="grid h-8 w-6 shrink-0 place-items-center rounded-md text-studio-muted hover:bg-slate-100"
                data-ui="unassigned-collapse-trigger"
                type="button"
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
            <SidebarMenuButton onClick={() => onToggle(UNASSIGNED_KEY)}>
              <Folder className="h-4 w-4 text-studio-muted" />
              <span className="min-w-0 flex-1 truncate">Unassigned Devices</span>
              <SidebarMenuBadge>{devices.length}</SidebarMenuBadge>
            </SidebarMenuButton>
          </div>
        </ActionContextMenu>

        <CollapsibleContent>
          <SidebarMenuSub>
            {devices.length === 0 ? (
              <SidebarMenuSubItem>
                <div className="px-2 py-1 text-xs text-studio-muted">No unassigned devices</div>
              </SidebarMenuSubItem>
            ) : (
              devices.map((device) => (
                <DeviceTreeItem
                  active={isSelected(selection, 'device', device.id)}
                  device={device}
                  key={device.id}
                  onSelect={() => onSelectObject('device', device.id)}
                />
              ))
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function DeviceTreeItem({
  active,
  device,
  onSelect,
}: {
  active: boolean;
  device: Device;
  onSelect: () => void;
}) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton isActive={active} onClick={onSelect}>
        <span className="min-w-0 flex-1 truncate">{device.name}</span>
        <span className="text-[0.68rem] text-studio-muted">{device.code || device.role || 'Device'}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function ActionContextMenu({
  actions,
  children,
}: {
  actions: ContextAction[];
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem key={action.label} onSelect={action.onSelect}>
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
