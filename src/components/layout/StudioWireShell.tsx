import { useEffect, useState } from 'react';
import { useProject } from '../../state/ProjectContext';
import { AddDeviceModal } from '../devices/AddDeviceModal';
import { AddLocationModal } from '../locations/AddLocationModal';
import { AddRackModal } from '../racks/AddRackModal';
import { resolveIssueSelection, resolveSelection, type SelectedObjectType, type SelectionState } from '../common/selection';
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
  | { type: 'device'; locationId: string | null };

export function StudioWireShell() {
  const { project, importError, dismissImportError } = useProject();
  const [selection, setSelection] = useState<SelectionState>({
    selectedObjectType: null,
    selectedObjectId: null,
  });
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    if (selection.selectedObjectType === 'settings') {
      return;
    }

    if (
      selection.selectedObjectType === 'project' &&
      selection.selectedObjectId !== project.project.id
    ) {
      setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
      return;
    }

    if (selection.selectedObjectType && !resolveSelection(project, selection)) {
      setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
    }
  }, [project, selection]);

  function selectObject(selectedObjectType: SelectedObjectType, selectedObjectId: string) {
    setSelection({ selectedObjectType, selectedObjectId });
  }

  function selectProject() {
    selectObject('project', project.project.id);
  }

  function selectSettings() {
    selectObject('settings', 'settings');
  }

  function openAddDevice(locationId: string | null) {
    setModal({ type: 'device', locationId });
  }

  return (
    <SidebarProvider className="app-frame">
      <TopBar
        activeView={activeView}
        onSelectProject={selectProject}
        onSelectSettings={selectSettings}
        onViewChange={setActiveView}
      />
      <div className="app-body">
        <LeftTree
          selection={selection}
          onSelectObject={selectObject}
          onAddLocation={() => setModal({ type: 'location' })}
          onAddRack={(locationId) => setModal({ type: 'rack', locationId })}
          onAddDevice={openAddDevice}
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
              <Workspace selection={selection} onAddDevice={openAddDevice} />
            ) : (
              <CablesWorkspace />
            )}
            <Inspector selection={selection} />
            <ValidationPanel
              onSelectIssue={(issue) => {
                const target = resolveIssueSelection(project, issue);

                if (target) {
                  setActiveView('workspace');
                  selectObject(target.selectedObjectType, target.selectedObjectId);
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
            selectObject('location', id);
          }}
        />
      ) : null}
      {modal?.type === 'rack' ? (
        <AddRackModal
          locationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObject('rack', id);
          }}
        />
      ) : null}
      {modal?.type === 'device' ? (
        <AddDeviceModal
          initialLocationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObject('device', id);
          }}
        />
      ) : null}
    </SidebarProvider>
  );
}
