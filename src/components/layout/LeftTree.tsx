import { useMemo, useState } from 'react';
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
import { FolderModal } from './FolderModal';
import { buildLeftTreeModel } from './leftTreeModel';
import { useCollapsedTree } from './useCollapsedTree';

const APP_VERSION = STUDIOWIRE_CURRENT_VERSION;

type FolderModalState = { mode: 'add'; locationId: string } | { mode: 'rename'; subLocationId: string };

export function LeftTree({
  selection,
  onSelectObject,
  onAddLocation,
  onAddRack,
  onAddDevice,
  onEditDevice,
  onEditTerminalBlock,
  onAddTerminalBlock,
}: {
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddLocation: () => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string) => void;
  onEditDevice: (deviceId: string) => void;
  onEditTerminalBlock: (deviceId: string) => void;
  onAddTerminalBlock: (locationId: string | null) => void;
}) {
  const { project, addSubLocation, moveNavigatorItemToFolder, updateSubLocation } = useProject();
  const [folderModal, setFolderModal] = useState<FolderModalState | null>(null);
  const tree = useMemo(() => buildLeftTreeModel(project), [project]);
  const collapsedTree = useCollapsedTree();
  const rootActions = [
    { label: 'Add Location', onSelect: onAddLocation },
    { label: 'Add TB', onSelect: () => onAddTerminalBlock(null) },
  ];
  function handleAddSubLocation(locationId: string) {
    setFolderModal({ mode: 'add', locationId });
  }

  function handleRenameSubLocation(subLocationId: string) {
    setFolderModal({ mode: 'rename', subLocationId });
  }

  function handleFolderModalSubmit(name: string) {
    if (folderModal?.mode === 'add') {
      addSubLocation({ locationId: folderModal.locationId, name, description: '' });
      setFolderModal(null);
      return;
    }

    if (folderModal?.mode === 'rename') {
      const subLocation = project.subLocations.find(
        (candidate) => candidate.id === folderModal.subLocationId,
      );

      if (!subLocation) {
        setFolderModal(null);
        return;
      }

      if (name !== subLocation.name) {
        updateSubLocation(subLocation.id, {
          name,
          description: subLocation.description,
        });
      }

      setFolderModal(null);
    }
  }

  const renamingSubLocation =
    folderModal?.mode === 'rename'
      ? project.subLocations.find((candidate) => candidate.id === folderModal.subLocationId)
      : null;

  return (
    <>
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
                        <span className="text-sm font-semibold text-studio-text">Create a location</span>
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
                        isOpen={collapsedTree.isOpen(branch.key)}
                        isSubLocationOpen={collapsedTree.isOpen}
                        key={branch.location.id}
                        onAddDevice={onAddDevice}
                        onAddSubLocation={handleAddSubLocation}
                        onEditDevice={onEditDevice}
                        onEditTerminalBlock={onEditTerminalBlock}
                        onAddRack={onAddRack}
                        onAddTerminalBlock={onAddTerminalBlock}
                        onMoveNavigatorItemToFolder={moveNavigatorItemToFolder}
                        onRenameSubLocation={handleRenameSubLocation}
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
      {folderModal ? (
        <FolderModal
          folderId={renamingSubLocation?.id}
          initialName={renamingSubLocation?.name ?? ''}
          mode={folderModal.mode}
          onClose={() => setFolderModal(null)}
          onSubmit={handleFolderModalSubmit}
        />
      ) : null}
    </>
  );
}
