import { useCallback, useEffect, useState } from 'react';
import { buildUnsavedInspectorChangesConfirmation } from '../../domain/prompts';
import { useProject } from '../../state/ProjectContext';
import { AddDeviceModal } from '../devices/AddDeviceModal';
import { AddTerminalBlockModal } from '../devices/AddTerminalBlockModal';
import { EditDeviceModal } from '../devices/EditDeviceModal';
import { EditTerminalBlockModal } from '../devices/EditTerminalBlockModal';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { AddLocationModal } from '../locations/AddLocationModal';
import { AddRackModal } from '../racks/AddRackModal';
import { ConfirmationProvider, useConfirmationChoice } from '../common/ConfirmationDialog';
import {
  resolveIssueSelection,
  resolveSelection,
  type SelectedObjectType,
  type SelectionState,
} from '../common/selection';
import { SidebarInset, SidebarProvider } from '../ui/sidebar';
import { CablesWorkspace } from './CablesWorkspace';
import { Inspector } from './Inspector';
import { LeftTree } from './LeftTree';
import { TopBar, type AppView } from './TopBar';
import { ValidationPanel } from './ValidationPanel';
import { Workspace } from './Workspace';

type ModalState =
  | null
  | { type: 'location' }
  | { type: 'rack'; locationId: string }
  | { type: 'device'; locationId: string }
  | { type: 'edit_device'; deviceId: string }
  | { type: 'edit_terminal_block'; deviceId: string }
  | { type: 'terminal_block'; locationId: string | null };

export function StudioWireShell() {
  return (
    <ConfirmationProvider>
      <StudioWireShellContent />
    </ConfirmationProvider>
  );
}

function StudioWireShellContent() {
  const { project, importError, dismissImportError } = useProject();
  const chooseConfirmation = useConfirmationChoice();
  const [selection, setSelection] = useState<SelectionState>({
    selectedObjectType: null,
    selectedObjectId: null,
  });
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [modal, setModal] = useState<ModalState>(null);
  const [inspectorGuard, setInspectorGuard] = useState<InspectorDirtyGuard | null>(null);

  const runWithUnsavedGuard = useCallback(
    async (action: () => void) => {
      if (!inspectorGuard?.isDirty) {
        action();
        return;
      }

      const copy = buildUnsavedInspectorChangesConfirmation();
      const choice = await chooseConfirmation({
        title: copy.title,
        message: copy.message,
        choices: [
          { id: 'cancel', label: 'Cancel', tone: 'secondary' },
          { id: 'discard', label: 'Discard', tone: 'secondary' },
          { id: 'save', label: 'Save', tone: 'default' },
        ],
      });

      if (choice === 'save') {
        if (!inspectorGuard.save()) {
          return;
        }

        action();
        return;
      }

      if (choice === 'discard') {
        inspectorGuard.discard();
        action();
      }
    },
    [chooseConfirmation, inspectorGuard],
  );

  useEffect(() => {
    if (selection.selectedObjectType === 'settings') {
      return;
    }

    if (selection.selectedObjectType === 'project' && selection.selectedObjectId !== project.project.id) {
      setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
      return;
    }

    if (selection.selectedObjectType && !resolveSelection(project, selection)) {
      setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
    }
  }, [project, selection]);

  function selectObject(selectedObjectType: SelectedObjectType, selectedObjectId: string) {
    void runWithUnsavedGuard(() => setSelection({ selectedObjectType, selectedObjectId }));
  }

  function selectObjectImmediately(selectedObjectType: SelectedObjectType, selectedObjectId: string) {
    setSelection({ selectedObjectType, selectedObjectId });
  }

  function selectProject() {
    selectObject('project', project.project.id);
  }

  function selectSettings() {
    selectObject('settings', 'settings');
  }

  function openAddDevice(locationId: string) {
    void runWithUnsavedGuard(() => setModal({ type: 'device', locationId }));
  }

  function openEditDevice(deviceId: string) {
    void runWithUnsavedGuard(() => setModal({ type: 'edit_device', deviceId }));
  }

  function openEditTerminalBlock(deviceId: string) {
    void runWithUnsavedGuard(() => setModal({ type: 'edit_terminal_block', deviceId }));
  }

  function openAddTerminalBlock(locationId: string | null) {
    void runWithUnsavedGuard(() => setModal({ type: 'terminal_block', locationId }));
  }

  return (
    <SidebarProvider className="app-frame">
      <TopBar
        activeView={activeView}
        onSelectProject={selectProject}
        onSelectSettings={selectSettings}
        onViewChange={(view) => void runWithUnsavedGuard(() => setActiveView(view))}
      />
      <div className="app-body">
        <LeftTree
          selection={selection}
          onSelectObject={selectObject}
          onAddLocation={() => void runWithUnsavedGuard(() => setModal({ type: 'location' }))}
          onAddRack={(locationId) => void runWithUnsavedGuard(() => setModal({ type: 'rack', locationId }))}
          onAddDevice={openAddDevice}
          onEditDevice={openEditDevice}
          onEditTerminalBlock={openEditTerminalBlock}
          onAddTerminalBlock={openAddTerminalBlock}
        />
        <SidebarInset className="app-shell">
          {importError ? (
            <div className="app-alert" role="alert">
              <span>{importError}</span>
              <button type="button" onClick={dismissImportError}>
                Dismiss
              </button>
            </div>
          ) : null}
          <section className="app-grid" aria-label={`${project.project.name} project editor`}>
            {activeView === 'workspace' ? (
              <Workspace
                selection={selection}
                onAddDevice={openAddDevice}
                onAddTerminalBlock={openAddTerminalBlock}
              />
            ) : (
              <CablesWorkspace />
            )}
            <Inspector selection={selection} onInspectorDirtyGuardChange={setInspectorGuard} />
            <ValidationPanel
              onSelectIssue={(issue) => {
                const target = resolveIssueSelection(project, issue);

                if (target) {
                  void runWithUnsavedGuard(() => {
                    setActiveView('workspace');
                    setSelection(target);
                  });
                }
              }}
            />
          </section>
        </SidebarInset>
      </div>
      {modal?.type === 'location' ? (
        <AddLocationModal
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObjectImmediately('location', id);
          }}
        />
      ) : null}
      {modal?.type === 'rack' ? (
        <AddRackModal
          locationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObjectImmediately('rack', id);
          }}
        />
      ) : null}
      {modal?.type === 'device' ? (
        <AddDeviceModal
          initialLocationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObjectImmediately('device', id);
          }}
        />
      ) : null}
      {modal?.type === 'edit_device' ? (
        <EditDeviceModal
          device={project.devices.find((device) => device.id === modal.deviceId)!}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            setModal(null);
            selectObjectImmediately('device', id);
          }}
        />
      ) : null}
      {modal?.type === 'terminal_block' ? (
        <AddTerminalBlockModal
          initialLocationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObjectImmediately('device', id);
          }}
        />
      ) : null}
      {modal?.type === 'edit_terminal_block' ? (
        <EditTerminalBlockModal
          device={project.devices.find((device) => device.id === modal.deviceId)!}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            setModal(null);
            selectObjectImmediately('device', id);
          }}
        />
      ) : null}
    </SidebarProvider>
  );
}
