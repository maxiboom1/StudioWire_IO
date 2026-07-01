import { useMemo } from 'react';
import { STUDIOWIRE_CURRENT_VERSION } from '../../domain/version';
import { useProject } from '../../state/ProjectContext';
import { type SelectedObjectType, type SelectionState } from '../common/selection';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '../ui/sidebar';
import { ActionContextMenu, LocationBranch } from './LeftTreeBranches';
import { buildLeftTreeModel } from './leftTreeModel';
import { useCollapsedTree } from './useCollapsedTree';

const APP_VERSION = STUDIOWIRE_CURRENT_VERSION;

export function LeftTree({
  selection,
  onSelectObject,
  onAddLocation,
  onAddRack,
  onAddDevice,
  onAddTerminalBlock,
}: {
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddLocation: () => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string) => void;
  onAddTerminalBlock: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const tree = useMemo(() => buildLeftTreeModel(project), [project]);
  const collapsedTree = useCollapsedTree();
  const rootActions = [
    { label: 'Add Location', onSelect: onAddLocation },
    { label: 'Add TB', onSelect: () => onAddTerminalBlock(null) },
  ];

  return (
    <Sidebar aria-label="StudioWire project sidebar" className="app-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <ActionContextMenu actions={rootActions}>
            <SidebarGroupLabel className="cursor-context-menu">Project navigator</SidebarGroupLabel>
          </ActionContextMenu>
          <SidebarGroupContent>
            <SidebarMenu>
              {tree.isNavigatorEmpty ? (
                <SidebarMenuItem>
                  <ActionContextMenu actions={rootActions}>
                    <button
                      className="grid w-full gap-1 rounded-lg border border-dashed border-studio-border bg-white p-3 text-left"
                      data-ui="empty-project-prompt"
                      type="button"
                    >
                      <span className="text-sm font-semibold text-studio-text">
                        Create a location
                      </span>
                      <span className="text-xs leading-5 text-studio-muted">
                        Devices are added from a location branch.
                      </span>
                    </button>
                  </ActionContextMenu>
                </SidebarMenuItem>
              ) : (
                <>
                  {tree.locations.map((branch) => (
                    <LocationBranch
                      branch={branch}
                      isDevicesOpen={collapsedTree.isOpen(branch.devicesKey)}
                      isOpen={collapsedTree.isOpen(branch.key)}
                      isRacksOpen={collapsedTree.isOpen(branch.racksKey)}
                      isTerminalBlocksOpen={collapsedTree.isOpen(branch.terminalBlocksKey)}
                      key={branch.location.id}
                      onAddDevice={onAddDevice}
                      onAddRack={onAddRack}
                      onAddTerminalBlock={onAddTerminalBlock}
                      onSelectObject={onSelectObject}
                      onToggle={collapsedTree.toggle}
                      selection={selection}
                    />
                  ))}
                  <SidebarMenuItem>
                    <ActionContextMenu actions={rootActions}>
                      <div
                        className="cursor-context-menu rounded-md px-2 py-2 text-xs text-studio-muted hover:bg-slate-50"
                        data-ui="navigator-context-hint"
                      >
                        Right-click navigator to add items.
                      </div>
                    </ActionContextMenu>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="app-sidebar-footer">
        <p className="sidebar-version-line">
          App {APP_VERSION}, Schema {project.schemaVersion}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
