import { Cable, ChevronDown, ChevronRight, Folder, HardDrive, MapPin, Server } from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';
import {
  clearDeviceDragData,
  readNavigatorDragData,
  writeDeviceDragData,
  writeNavigatorDragData,
  type NavigatorDragPayload,
} from '../common/deviceDrag';
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
import { getDeviceTreeTitle, type LocationTreeBranchModel, type NavigatorTreeItem } from './leftTreeModel';

export type ContextAction = {
  label: string;
  onSelect: () => void;
};

export function LocationBranch({
  branch,
  isOpen,
  isSubLocationOpen,
  selection,
  onSelectObject,
  onAddRack,
  onAddDevice,
  onAddSubLocation,
  onEditDevice,
  onCloneDevice,
  onEditTerminalBlock,
  onExportDeviceTemplate,
  onAddTerminalBlock,
  onMoveNavigatorItemToFolder,
  onRenameSubLocation,
  onToggle,
}: {
  branch: LocationTreeBranchModel;
  isOpen: boolean;
  isSubLocationOpen: (key: string) => boolean;
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string) => void;
  onAddSubLocation: (locationId: string) => void;
  onEditDevice: (deviceId: string) => void;
  onCloneDevice: (deviceId: string) => void;
  onEditTerminalBlock: (deviceId: string) => void;
  onExportDeviceTemplate: (deviceId: string) => void;
  onAddTerminalBlock: (locationId: string | null) => void;
  onMoveNavigatorItemToFolder: (input: {
    itemType: NavigatorDragPayload['type'];
    itemId: string;
    targetLocationId: string;
    targetFolderId: string | null;
  }) => void;
  onRenameSubLocation: (subLocationId: string) => void;
  onToggle: (key: string) => void;
}) {
  const { location } = branch;

  function moveToLocation(payload: NavigatorDragPayload) {
    onMoveNavigatorItemToFolder({
      itemType: payload.type,
      itemId: payload.id,
      targetLocationId: location.id,
      targetFolderId: null,
    });
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={isOpen} onOpenChange={() => onToggle(branch.key)}>
        <ActionContextMenu
          actions={[
            { label: 'Add Rack', onSelect: () => onAddRack(location.id) },
            { label: 'Add Device', onSelect: () => onAddDevice(location.id) },
            { label: 'Add Folder', onSelect: () => onAddSubLocation(location.id) },
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
            <DropTargetButton
              isActive={isSelected(selection, 'location', location.id)}
              onClick={() => onSelectObject('location', location.id)}
              onDropNavigatorItem={moveToLocation}
            >
              <MapPin className="h-4 w-4 text-studio-muted" />
              <span className="min-w-0 flex-1 truncate">{location.name}</span>
              <SidebarMenuBadge>{branch.count}</SidebarMenuBadge>
            </DropTargetButton>
          </div>
        </ActionContextMenu>

        <CollapsibleContent>
          <SidebarMenuSub>
            {branch.subLocations.map((subLocationBranch) => (
              <FolderBranch
                actions={[
                  { label: 'Add Device', onSelect: () => onAddDevice(location.id) },
                  {
                    label: 'Rename Folder',
                    onSelect: () => onRenameSubLocation(subLocationBranch.subLocation.id),
                  },
                ]}
                count={subLocationBranch.count}
                emptyLabel="No items"
                isActive={isSelected(selection, 'folder', subLocationBranch.subLocation.id)}
                isOpen={isSubLocationOpen(subLocationBranch.key)}
                key={subLocationBranch.subLocation.id}
                label={subLocationBranch.subLocation.name}
                onDropNavigatorItem={(payload) =>
                  onMoveNavigatorItemToFolder({
                    itemType: payload.type,
                    itemId: payload.id,
                    targetLocationId: location.id,
                    targetFolderId: subLocationBranch.subLocation.id,
                  })
                }
                onSelect={() => onSelectObject('folder', subLocationBranch.subLocation.id)}
                onToggle={() => onToggle(subLocationBranch.key)}
              >
                <NavigatorItemList
                  items={subLocationBranch.items}
                  selection={selection}
                  onEditDevice={onEditDevice}
                  onCloneDevice={onCloneDevice}
                  onEditTerminalBlock={onEditTerminalBlock}
                  onExportDeviceTemplate={onExportDeviceTemplate}
                  onSelectObject={onSelectObject}
                />
              </FolderBranch>
            ))}

            <NavigatorItemList
              items={branch.items}
              selection={selection}
              onEditDevice={onEditDevice}
              onCloneDevice={onCloneDevice}
              onEditTerminalBlock={onEditTerminalBlock}
              onExportDeviceTemplate={onExportDeviceTemplate}
              onSelectObject={onSelectObject}
            />
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
  isActive,
  isOpen,
  label,
  onDropNavigatorItem,
  onSelect,
  onToggle,
}: {
  actions: ContextAction[];
  children: ReactNode;
  count: number;
  emptyLabel: string;
  isActive: boolean;
  isOpen: boolean;
  label: string;
  onDropNavigatorItem?: (payload: NavigatorDragPayload) => void;
  onSelect: () => void;
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
            <DropTargetSubButton
              isActive={isActive}
              onClick={onSelect}
              onDropNavigatorItem={onDropNavigatorItem}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.66rem] font-semibold">
                {count}
              </span>
            </DropTargetSubButton>
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

export function NavigatorItemList({
  items,
  selection,
  onEditDevice,
  onCloneDevice,
  onEditTerminalBlock,
  onExportDeviceTemplate,
  onSelectObject,
}: {
  items: NavigatorTreeItem[];
  selection: SelectionState;
  onEditDevice: (deviceId: string) => void;
  onCloneDevice: (deviceId: string) => void;
  onEditTerminalBlock: (deviceId: string) => void;
  onExportDeviceTemplate: (deviceId: string) => void;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <NavigatorItem
          active={isSelected(selection, item.type, item.id)}
          item={item}
          key={`${item.type}-${item.id}`}
          onEditDevice={onEditDevice}
          onCloneDevice={onCloneDevice}
          onEditTerminalBlock={onEditTerminalBlock}
          onExportDeviceTemplate={onExportDeviceTemplate}
          onSelect={() => onSelectObject(item.type, item.id)}
        />
      ))}
    </>
  );
}

export function NavigatorItem({
  active,
  item,
  onEditDevice,
  onCloneDevice,
  onEditTerminalBlock,
  onExportDeviceTemplate,
  onSelect,
}: {
  active: boolean;
  item: NavigatorTreeItem;
  onEditDevice: (deviceId: string) => void;
  onCloneDevice: (deviceId: string) => void;
  onEditTerminalBlock: (deviceId: string) => void;
  onExportDeviceTemplate: (deviceId: string) => void;
  onSelect: () => void;
}) {
  const button = (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        className="device-tree-draggable"
        data-canvas-draggable="true"
        draggable
        isActive={active}
        title={item.type === 'device' ? getDeviceTreeTitle(item.device) : 'Drag to organize this rack'}
        onClick={onSelect}
        onDragEnd={clearDeviceDragData}
        onDragStart={(event) =>
          item.type === 'device'
            ? writeDeviceDragData(event, item.id)
            : writeNavigatorDragData(event, { type: 'rack', id: item.id })
        }
      >
        {item.type === 'rack' ? (
          <Server className="h-3.5 w-3.5 text-studio-muted" />
        ) : item.device.kind === 'terminal_block' ? (
          <Cable className="h-3.5 w-3.5 text-studio-muted" />
        ) : (
          <HardDrive className="h-3.5 w-3.5 text-studio-muted" />
        )}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.66rem] font-semibold text-studio-muted">
          {item.type === 'rack' ? 'Rack' : item.device.kind === 'terminal_block' ? 'TB' : 'Device'}
        </span>
        <span className="text-[0.68rem] text-studio-muted">{item.meta}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  if (item.type === 'device') {
    return (
      <ActionContextMenu
        actions={[
          item.device.kind === 'terminal_block'
            ? { label: 'Edit TB', onSelect: () => onEditTerminalBlock(item.id) }
            : { label: 'Edit Device', onSelect: () => onEditDevice(item.id) },
          ...(item.device.kind === 'device'
            ? [
                {
                  label: 'Clone and Edit',
                  onSelect: () => onCloneDevice(item.id),
                },
                {
                  label: 'Export Device Template',
                  onSelect: () => onExportDeviceTemplate(item.id),
                },
              ]
            : []),
        ]}
      >
        {button}
      </ActionContextMenu>
    );
  }

  return button;
}

function DropTargetButton({
  children,
  isActive,
  onClick,
  onDropNavigatorItem,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  onDropNavigatorItem: (payload: NavigatorDragPayload) => void;
}) {
  const dragHandlers = useNavigatorDropTarget(onDropNavigatorItem);

  return (
    <SidebarMenuButton isActive={isActive} onClick={onClick} {...dragHandlers}>
      {children}
    </SidebarMenuButton>
  );
}

function DropTargetSubButton({
  children,
  isActive,
  onClick,
  onDropNavigatorItem,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  onDropNavigatorItem?: (payload: NavigatorDragPayload) => void;
}) {
  const dragHandlers = useNavigatorDropTarget(onDropNavigatorItem);

  return (
    <SidebarMenuSubButton isActive={isActive} onClick={onClick} {...dragHandlers}>
      {children}
    </SidebarMenuSubButton>
  );
}

function useNavigatorDropTarget(onDropNavigatorItem?: (payload: NavigatorDragPayload) => void) {
  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!onDropNavigatorItem || !readNavigatorDragData(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!onDropNavigatorItem) {
      return;
    }

    const payload = readNavigatorDragData(event);

    if (!payload) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onDropNavigatorItem(payload);
    clearDeviceDragData();
  }

  return { onDragOver: handleDragOver, onDrop: handleDrop };
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
