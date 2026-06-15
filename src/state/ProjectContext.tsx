import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ChangeEvent,
  type Ref,
  type ReactNode,
} from 'react';
import { makeUniqueId } from '../domain/id';
import type {
  CablePrefix,
  Category,
  ConnectorCompatibilityGroup,
  ConnectorType,
  Location,
  ProjectInfo,
  ProjectRoot,
  Rack,
} from '../domain/types';
import {
  createInitialProjectState,
  parseImportedProject,
  projectReducer,
  type DeviceDraft,
  type DevicePortGroupDraft,
  type DeviceUpdate,
  type ProjectState,
  type TerminalBlockDraft,
} from './projectReducer';

const STORAGE_KEY = 'studiowire.io.project.v0.2.6';
const LEGACY_STORAGE_KEYS = ['studiowire.io.project.v0.2.5', 'studiowire.io.project.v0.1'];

interface ProjectContextValue extends ProjectState {
  createNewProject: () => void;
  loadSampleProject: () => void;
  importProjectJson: (file: File) => Promise<void>;
  exportProjectJson: () => void;
  validateProject: () => void;
  dismissImportError: () => void;
  updateProjectInfo: (updates: Pick<ProjectInfo, 'name' | 'customer' | 'revision'>) => void;
  addCategory: (input: Pick<Category, 'name' | 'defaultCablePrefix'>) => string;
  updateCategory: (id: string, updates: Pick<Category, 'name' | 'defaultCablePrefix'>) => void;
  addConnectorGroup: (input: Pick<ConnectorCompatibilityGroup, 'categoryId' | 'name'>) => string;
  updateConnectorGroup: (id: string, updates: Pick<ConnectorCompatibilityGroup, 'name'>) => void;
  addConnectorType: (input: Pick<ConnectorType, 'name' | 'categoryId' | 'compatibilityGroupId'>) => string;
  updateConnectorType: (id: string, updates: Partial<Pick<ConnectorType, 'name' | 'compatibilityGroupId'>>) => void;
  addCablePrefix: (input: Pick<CablePrefix, 'prefix' | 'name'>) => string;
  addLocation: (input: Pick<Location, 'name' | 'type' | 'description'>) => string;
  updateLocation: (id: string, updates: Pick<Location, 'name' | 'type' | 'description'>) => void;
  deleteLocation: (id: string) => void;
  addRack: (input: Pick<Rack, 'locationId' | 'name' | 'heightRu' | 'numberingDirection'>) => string;
  updateRack: (id: string, updates: Pick<Rack, 'name' | 'heightRu' | 'numberingDirection'>) => void;
  deleteRack: (id: string) => void;
  addDevice: (input: { device: DeviceDraft; portGroups: DevicePortGroupDraft[] }) => string;
  addTerminalBlock: (input: TerminalBlockDraft) => string;
  connectPorts: (input: { fromPortId: string; toPortId: string }) => void;
  disconnectPort: (input: { portId: string }) => void;
  moveMountedDevice: (input: { deviceId: string; targetRackId: string; targetBottomRu: number }) => void;
  updateDevice: (id: string, updates: DeviceUpdate) => void;
  retireDevice: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, undefined, loadInitialState);
  const projectRef = useRef(state.project);

  useEffect(() => {
    projectRef.current = state.project;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project, null, 2));
  }, [state.project]);

  const createNewProject = useCallback(() => {
    dispatch({ type: 'NEW_PROJECT' });
  }, []);

  const loadSampleProject = useCallback(() => {
    dispatch({ type: 'LOAD_SAMPLE_PROJECT' });
  }, []);

  const importProjectJson = useCallback(async (file: File) => {
    const text = await file.text();

    try {
      dispatch({ type: 'IMPORT_PROJECT_JSON', payload: JSON.parse(text) });
    } catch {
      dispatch({
        type: 'IMPORT_PROJECT_JSON',
        payload: 'invalid-json',
      });
    }
  }, []);

  const exportProjectJson = useCallback(() => {
    downloadProjectJson(projectRef.current);
  }, []);

  const validateProject = useCallback(() => {
    dispatch({ type: 'VALIDATE_PROJECT' });
  }, []);

  const dismissImportError = useCallback(() => {
    dispatch({ type: 'DISMISS_IMPORT_ERROR' });
  }, []);

  const updateProjectInfo = useCallback(
    (updates: Pick<ProjectInfo, 'name' | 'customer' | 'revision'>) => {
      dispatch({ type: 'UPDATE_PROJECT_INFO', payload: updates });
    },
    [],
  );

  const addCategory = useCallback((input: Pick<Category, 'name' | 'defaultCablePrefix'>) => {
    const id = makeUniqueId('category', input.name);

    dispatch({
      type: 'ADD_CATEGORY',
      payload: {
        id,
        name: input.name,
        defaultCablePrefix: input.defaultCablePrefix,
      },
    });

    return id;
  }, []);

  const updateCategory = useCallback(
    (id: string, updates: Pick<Category, 'name' | 'defaultCablePrefix'>) => {
      dispatch({ type: 'UPDATE_CATEGORY', payload: { id, updates } });
    },
    [],
  );

  const addConnectorGroup = useCallback((input: Pick<ConnectorCompatibilityGroup, 'categoryId' | 'name'>) => {
    const id = makeUniqueId('group', `${input.categoryId}-${input.name}`);

    dispatch({
      type: 'ADD_CONNECTOR_GROUP',
      payload: {
        id,
        categoryId: input.categoryId,
        name: input.name,
      },
    });

    return id;
  }, []);

  const updateConnectorGroup = useCallback(
    (id: string, updates: Pick<ConnectorCompatibilityGroup, 'name'>) => {
      dispatch({ type: 'UPDATE_CONNECTOR_GROUP', payload: { id, updates } });
    },
    [],
  );

  const addConnectorType = useCallback((input: Pick<ConnectorType, 'name' | 'categoryId' | 'compatibilityGroupId'>) => {
    const id = makeUniqueId('connector', `${input.categoryId}-${input.name}`);

    dispatch({
      type: 'ADD_CONNECTOR_TYPE',
      payload: {
        id,
        name: input.name,
        categoryId: input.categoryId,
        compatibilityGroupId: input.compatibilityGroupId,
      },
    });

    return id;
  }, []);

  const updateConnectorType = useCallback(
    (id: string, updates: Partial<Pick<ConnectorType, 'name' | 'compatibilityGroupId'>>) => {
      dispatch({ type: 'UPDATE_CONNECTOR_TYPE', payload: { id, updates } });
    },
    [],
  );

  const addCablePrefix = useCallback(
    (input: Pick<CablePrefix, 'prefix' | 'name'>) => {
      const normalizedPrefix = input.prefix.trim().toUpperCase();
      const id = makeUniqueId('prefix', normalizedPrefix);

      dispatch({
        type: 'ADD_CABLE_PREFIX',
        payload: {
          id,
          prefix: normalizedPrefix,
          name: input.name,
        },
      });

      return id;
    },
    [],
  );

  const addLocation = useCallback((input: Pick<Location, 'name' | 'type' | 'description'>) => {
    const id = makeUniqueId('location', input.name);

    dispatch({
      type: 'ADD_LOCATION',
      payload: {
        id,
        name: input.name,
        type: input.type,
        description: input.description,
      },
    });

    return id;
  }, []);

  const updateLocation = useCallback(
    (id: string, updates: Pick<Location, 'name' | 'type' | 'description'>) => {
      dispatch({ type: 'UPDATE_LOCATION', payload: { id, updates } });
    },
    [],
  );

  const deleteLocation = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LOCATION', payload: { id } });
  }, []);

  const addRack = useCallback(
    (input: Pick<Rack, 'locationId' | 'name' | 'heightRu' | 'numberingDirection'>) => {
      const id = makeUniqueId('rack', `${input.locationId}-${input.name}`);

      dispatch({
        type: 'ADD_RACK',
        payload: {
          id,
          locationId: input.locationId,
          name: input.name,
          heightRu: input.heightRu,
          numberingDirection: input.numberingDirection,
        },
      });

      return id;
    },
    [],
  );

  const updateRack = useCallback(
    (id: string, updates: Pick<Rack, 'name' | 'heightRu' | 'numberingDirection'>) => {
      dispatch({ type: 'UPDATE_RACK', payload: { id, updates } });
    },
    [],
  );

  const deleteRack = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RACK', payload: { id } });
  }, []);

  const addDevice = useCallback((input: { device: DeviceDraft; portGroups: DevicePortGroupDraft[] }) => {
    const id = input.device.id ?? makeUniqueId('device', input.device.code || input.device.name);

    dispatch({ type: 'ADD_DEVICE', payload: { ...input, device: { ...input.device, id } } });

    return id;
  }, []);

  const addTerminalBlock = useCallback((input: TerminalBlockDraft) => {
    const id = input.id ?? makeUniqueId('terminal-block', input.labelPrefix || input.name);

    dispatch({ type: 'ADD_TERMINAL_BLOCK', payload: { terminalBlock: { ...input, id } } });

    return id;
  }, []);

  const connectPorts = useCallback((input: { fromPortId: string; toPortId: string }) => {
    dispatch({ type: 'CONNECT_PORTS', payload: input });
  }, []);

  const disconnectPort = useCallback((input: { portId: string }) => {
    dispatch({ type: 'DISCONNECT_PORT', payload: input });
  }, []);

  const updateDevice = useCallback((id: string, updates: DeviceUpdate) => {
    dispatch({ type: 'UPDATE_DEVICE', payload: { id, updates } });
  }, []);

  const moveMountedDevice = useCallback(
    (input: { deviceId: string; targetRackId: string; targetBottomRu: number }) => {
      dispatch({ type: 'MOVE_MOUNTED_DEVICE', payload: input });
    },
    [],
  );

  const retireDevice = useCallback((id: string) => {
    dispatch({ type: 'RETIRE_DEVICE', payload: { id } });
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      ...state,
      createNewProject,
      loadSampleProject,
      importProjectJson,
      exportProjectJson,
      validateProject,
      dismissImportError,
      updateProjectInfo,
      addCategory,
      updateCategory,
      addConnectorGroup,
      updateConnectorGroup,
      addConnectorType,
      updateConnectorType,
      addCablePrefix,
      addLocation,
      updateLocation,
      deleteLocation,
      addRack,
      updateRack,
      deleteRack,
      addDevice,
      addTerminalBlock,
      connectPorts,
      disconnectPort,
      moveMountedDevice,
      updateDevice,
      retireDevice,
    }),
    [
      state,
      createNewProject,
      loadSampleProject,
      importProjectJson,
      exportProjectJson,
      validateProject,
      dismissImportError,
      updateProjectInfo,
      addCategory,
      updateCategory,
      addConnectorGroup,
      updateConnectorGroup,
      addConnectorType,
      updateConnectorType,
      addCablePrefix,
      addLocation,
      updateLocation,
      deleteLocation,
      addRack,
      updateRack,
      deleteRack,
      addDevice,
      addTerminalBlock,
      connectPorts,
      disconnectPort,
      moveMountedDevice,
      updateDevice,
      retireDevice,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used inside ProjectProvider');
  }

  return context;
}

export function ProjectJsonInput({
  className,
  id,
  inputRef,
  onImportComplete,
}: {
  className?: string;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  onImportComplete?: () => void;
}) {
  const { importProjectJson } = useProject();

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      await importProjectJson(file);
      onImportComplete?.();
      event.target.value = '';
    }
  }

  return (
    <input
      aria-label="Import Project JSON"
      aria-hidden="true"
      className={className}
      id={id}
      ref={inputRef}
      tabIndex={-1}
      type="file"
      accept=".json,.studiowire,application/json"
      onChange={handleChange}
    />
  );
}

function loadInitialState(): ProjectState {
  const storageKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  const storageKey = storageKeys.find((key) => localStorage.getItem(key));
  const storedProject = storageKey ? localStorage.getItem(storageKey) : null;

  if (!storedProject) {
    return createInitialProjectState();
  }

  try {
    const parsedProject = JSON.parse(storedProject);
    const result = parseImportedProject(parsedProject);

    if (result.ok) {
      return {
        project: result.project,
        statusMessage: 'Project restored from local storage',
        importError: null,
      };
    }
  } catch {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }

  return createInitialProjectState();
}

function downloadProjectJson(project: ProjectRoot): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'project.studiowire.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
