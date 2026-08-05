import { useCallback, useEffect, useRef, useState } from 'react';
import { buildUnsavedInspectorChangesConfirmation } from '../../domain/prompts';
import { useProject } from '../../state/ProjectContext';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
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
import { useViewShellController } from '../views/useViewShellController';
import { StudioWireObjectModals, type ObjectModalState } from './StudioWireObjectModals';
import type { ViewCanvasSelection } from '../views/viewEditorTypes';
import { normalizeViewMovableSelection } from '../../domain/viewSelection';
import { ViewCanvasHistoryProvider } from '../views/ViewCanvasHistoryContext';

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
  const [modal, setModal] = useState<ObjectModalState>(null);
  const [inspectorGuard, setInspectorGuard] = useState<InspectorDirtyGuard | null>(null);
  const [viewCanvasSelection, setViewCanvasSelection] = useState<ViewCanvasSelection | null>(null);
  const observedProjectRef = useRef({
    locations: project.locations,
    racks: project.racks,
    devices: project.devices,
    views: project.views,
    settings: project.settings,
  });

  useEffect(() => {
    const previous = observedProjectRef.current;
    const replaced =
      previous.locations !== project.locations &&
      previous.racks !== project.racks &&
      previous.devices !== project.devices &&
      previous.views !== project.views &&
      previous.settings !== project.settings;
    observedProjectRef.current = {
      locations: project.locations,
      racks: project.racks,
      devices: project.devices,
      views: project.views,
      settings: project.settings,
    };
    if (!replaced) return;
    setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
    setActiveView('workspace');
    setModal(null);
    setInspectorGuard(null);
    setViewCanvasSelection(null);
  }, [project]);

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
        if (!(await inspectorGuard.save())) {
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
  const viewShell = useViewShellController({
    runWithUnsavedGuard,
    onSelectView: (viewId) => {
      setActiveView('workspace');
      selectObjectImmediately('view', viewId);
    },
  });

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

  useEffect(() => {
    if (selection.selectedObjectType !== 'view' || !selection.selectedObjectId) {
      setViewCanvasSelection(null);
      return;
    }

    const currentView = project.views.find((view) => view.id === selection.selectedObjectId);
    if (!viewCanvasSelection || !currentView) return;
    if (viewCanvasSelection.kind === 'movable') {
      const normalized = normalizeViewMovableSelection(currentView, viewCanvasSelection.value);
      if (!normalized) setViewCanvasSelection(null);
      else if (JSON.stringify(normalized) !== JSON.stringify(viewCanvasSelection.value)) {
        setViewCanvasSelection({ kind: 'movable', value: normalized });
      }
      return;
    }
    const exists =
      viewCanvasSelection.kind === 'line'
        ? currentView.lines.some((item) => item.id === viewCanvasSelection.id)
        : currentView.annotations.some(
            (item) => item.kind === 'port_range' && item.id === viewCanvasSelection.id,
          );
    if (!exists) setViewCanvasSelection(null);
  }, [project, viewCanvasSelection, selection]);

  function selectObject(selectedObjectType: SelectedObjectType, selectedObjectId: string) {
    void runWithUnsavedGuard(() => {
      if (selectedObjectType === 'view') {
        setActiveView('workspace');
      }
      setSelection({ selectedObjectType, selectedObjectId });
      setViewCanvasSelection(null);
    });
  }

  function selectObjectImmediately(selectedObjectType: SelectedObjectType, selectedObjectId: string) {
    setSelection({ selectedObjectType, selectedObjectId });
    setViewCanvasSelection(null);
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

  function openCloneDevice(deviceId: string) {
    const sourceDevice = project.devices.find((device) => device.id === deviceId && device.kind === 'device');

    if (!sourceDevice) {
      return;
    }

    void runWithUnsavedGuard(() =>
      setModal({
        type: 'device',
        locationId: sourceDevice.locationId,
        sourceDeviceId: sourceDevice.id,
      }),
    );
  }

  function openEditTerminalBlock(deviceId: string) {
    void runWithUnsavedGuard(() => setModal({ type: 'edit_terminal_block', deviceId }));
  }

  function openAddTerminalBlock(locationId: string | null) {
    void runWithUnsavedGuard(() => setModal({ type: 'terminal_block', locationId }));
  }

  const activeCanvasViewId =
    activeView === 'workspace' && selection.selectedObjectType === 'view'
      ? selection.selectedObjectId
      : null;

  return (
    <ViewCanvasHistoryProvider activeViewId={activeCanvasViewId}>
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
          onCloneDevice={openCloneDevice}
          onEditDevice={openEditDevice}
          onEditTerminalBlock={openEditTerminalBlock}
          onAddTerminalBlock={openAddTerminalBlock}
          onAddView={viewShell.openAddView}
          onRenameView={viewShell.openRenameView}
          onDeleteView={viewShell.requestDeleteView}
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
                viewCanvasSelection={viewCanvasSelection}
                onViewCanvasSelectionChange={setViewCanvasSelection}
                onAddDevice={openAddDevice}
                onAddTerminalBlock={openAddTerminalBlock}
              />
            ) : (
              <CablesWorkspace />
            )}
            <Inspector
              selection={selection}
              viewCanvasSelection={viewCanvasSelection}
              onViewCanvasSelectionChange={setViewCanvasSelection}
              onOpenObject={(type, id) => selectObject(type, id)}
              onInspectorDirtyGuardChange={setInspectorGuard}
            />
            <ValidationPanel
              onSelectIssue={(issue) => {
                const target = resolveIssueSelection(project, issue);

                if (target) {
                  void runWithUnsavedGuard(() => {
                    setActiveView('workspace');
                    setSelection(target);
                    setViewCanvasSelection(null);
                  });
                }
              }}
            />
          </section>
        </SidebarInset>
      </div>
      <StudioWireObjectModals
        modal={modal}
        project={project}
        onClose={() => setModal(null)}
        onSubmitted={(type, id) => {
          setModal(null);
          selectObjectImmediately(type, id);
        }}
      />
      {viewShell.modalElement}
      </SidebarProvider>
    </ViewCanvasHistoryProvider>
  );
}
