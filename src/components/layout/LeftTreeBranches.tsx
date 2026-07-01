import { Cable, ChevronDown, ChevronRight, HardDrive, MapPin, Server } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Device } from '../../domain/types';
import { clearDeviceDragData, writeDeviceDragData } from '../common/deviceDrag';
import { isSelected, type SelectedObjectType, type SelectionState } from '../common/selection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu';
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '../ui/sidebar';
import {
  getDeviceTreeMeta,
  getDeviceTreeTitle,
  type LocationTreeBranchModel,
} from './leftTreeModel';

export type ContextAction = {
  label: string;
  onSelect: () => void;
};

export function LocationBranch({
  branch,
  isOpen,
  isRacksOpen,
  isDevicesOpen,
  isTerminalBlocksOpen,
  selection,
  onSelectObject,
  onAddRack,
  onAddDevice,
  onEditDevice,
  onAddTerminalBlock,
  onToggle,
}: {
  branch: LocationTreeBranchModel;
  isOpen: boolean;
  isRacksOpen: boolean;
  isDevicesOpen: boolean;
  isTerminalBlocksOpen: boolean;
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string) => void;
  onEditDevice: (deviceId: string) => void;
  onAddTerminalBlock: (locationId: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const { location, racks, devices, terminalBlocks } = branch;

  return (
    <SidebarMenuItem>
      <Collapsible open={isOpen} onOpenChange={() => onToggle(branch.key)}>
        <ActionContextMenu
          actions={[
            { label: 'Add Rack', onSelect: () => onAddRack(location.id) },
            { label: 'Add Device', onSelect: () => onAddDevice(location.id) },
            { label: 'Add TB', onSelect: () => onAddTerminalBlock(location.id) },
          ]}
        >
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <button
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${location.name}`}
                className="grid h-8 w-6 shrink-0 place-items-center rounded-md text-studio-muted hover:bg-slate-100"
                data-ui="location-collapse-trigger"
                type="button"
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
            <SidebarMenuButton
              isActive={isSelected(selection, 'location', location.id)}
              onClick={() => onSelectObject('location', location.id)}
            >
              <MapPin className="h-4 w-4 text-studio-muted" />
              <span className="min-w-0 flex-1 truncate">{location.name}</span>
              <SidebarMenuBadge>{branch.count}</SidebarMenuBadge>
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
              onToggle={() => onToggle(branch.racksKey)}
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
              onToggle={() => onToggle(branch.devicesKey)}
            >
              {devices.map((device) => (
                <DeviceTreeItem
                  active={isSelected(selection, 'device', device.id)}
                  actions={[{ label: 'Edit Device', onSelect: () => onEditDevice(device.id) }]}
                  device={device}
                  key={device.id}
                  onSelect={() => onSelectObject('device', device.id)}
                />
              ))}
            </FolderBranch>

            <FolderBranch
              actions={[{ label: 'Add TB', onSelect: () => onAddTerminalBlock(location.id) }]}
              count={terminalBlocks.length}
              emptyLabel="No terminal blocks"
              icon={<Cable className="h-3.5 w-3.5" />}
              isOpen={isTerminalBlocksOpen}
              label="TBs"
              onToggle={() => onToggle(branch.terminalBlocksKey)}
            >
              {terminalBlocks.map((device) => (
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

export function FolderBranch({
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
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.66rem] font-semibold">
                {count}
              </span>
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

export function DeviceTreeItem({
  actions = [],
  active,
  device,
  onSelect,
}: {
  actions?: ContextAction[];
  active: boolean;
  device: Device;
  onSelect: () => void;
}) {
  const item = (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        className="device-tree-draggable"
        data-canvas-draggable="true"
        draggable
        isActive={active}
        title={getDeviceTreeTitle(device)}
        onClick={onSelect}
        onDragEnd={clearDeviceDragData}
        onDragStart={(event) => writeDeviceDragData(event, device.id)}
      >
        <span className="min-w-0 flex-1 truncate">{device.name}</span>
        <span className="text-[0.68rem] text-studio-muted">{getDeviceTreeMeta(device)}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  return actions.length > 0 ? <ActionContextMenu actions={actions}>{item}</ActionContextMenu> : item;
}

export function ActionContextMenu({ actions, children }: { actions: ContextAction[]; children: ReactNode }) {
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
