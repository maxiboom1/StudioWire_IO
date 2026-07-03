import { useMemo, useRef, useState } from 'react';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { Device, ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectContextTypes';
import type { DeviceDraft } from '../../state/projectTypes';
import { createRuntimeAddDeviceLocalIdFactory, type AddDeviceLocalIdFactory } from './addDeviceLocalIds';
import type { DevicePortGroupForm } from './addDeviceDraft';
import {
  addNewEditPortGroup,
  createEditDeviceCommandInput,
  createEditDeviceDraft,
  createExistingPortGroupForms,
  getEditDeviceValidation,
  removeNewEditPortGroup,
  toggleNewEditPortGroupPlannedCables,
  updateExistingPortGroupForms,
  updateNewEditPortGroup,
  updateNewEditPortGroupCategory,
  type ExistingPortGroupForm,
} from './editDeviceDraft';

export interface EditDeviceFormController {
  device: DeviceDraft;
  existingPortGroups: ExistingPortGroupForm[];
  newPortGroups: DevicePortGroupForm[];
  validation: ReturnType<typeof getEditDeviceValidation>;
  addPortGroup: () => void;
  removeNewPortGroup: (localId: string) => void;
  setDevice: (updates: Partial<DeviceDraft>) => void;
  submit: (confirmWarnings: (message: string) => boolean) => boolean;
  updateExistingPortGroup: (
    id: string,
    updates: Pick<Partial<ExistingPortGroupForm>, 'name' | 'portLabelPattern'>,
  ) => void;
  updateNewPortGroup: (localId: string, updates: Partial<DevicePortGroupForm>) => void;
  updateNewPortGroupCategory: (localId: string, categoryId: string) => void;
  toggleNewPortGroupPlannedCables: (localId: string, checked: boolean) => void;
}

export function useEditDeviceForm({
  device: initialDevice,
  editDevice,
  makeLocalId,
  onSaved,
  project,
}: {
  device: Device;
  editDevice: (input: EditDeviceInput) => void;
  makeLocalId?: AddDeviceLocalIdFactory;
  onSaved: (id: string) => void;
  project: ProjectRoot;
}): EditDeviceFormController {
  const localIdFactory = useRef<AddDeviceLocalIdFactory>(
    makeLocalId ?? createRuntimeAddDeviceLocalIdFactory(),
  );
  const [device, setDeviceState] = useState<DeviceDraft>(() => createEditDeviceDraft(initialDevice));
  const [existingPortGroups, setExistingPortGroups] = useState<ExistingPortGroupForm[]>(() =>
    createExistingPortGroupForms(project, initialDevice.id),
  );
  const [newPortGroups, setNewPortGroups] = useState<DevicePortGroupForm[]>([]);
  const validation = useMemo(
    () => getEditDeviceValidation(project, device, existingPortGroups, newPortGroups),
    [device, existingPortGroups, newPortGroups, project],
  );

  function setDevice(updates: Partial<DeviceDraft>) {
    setDeviceState((current) => {
      const locationId = updates.locationId ?? current.locationId;
      const requestedSubLocationId =
        updates.subLocationId !== undefined ? updates.subLocationId : current.subLocationId;

      return {
        ...current,
        ...updates,
        subLocationId: normalizeSubLocationForLocation(project, requestedSubLocationId, locationId),
      };
    });
  }

  function updateExistingPortGroup(
    id: string,
    updates: Pick<Partial<ExistingPortGroupForm>, 'name' | 'portLabelPattern'>,
  ) {
    setExistingPortGroups((current) => updateExistingPortGroupForms(current, id, updates));
  }

  function updateNewPortGroup(localId: string, updates: Partial<DevicePortGroupForm>) {
    setNewPortGroups((current) => updateNewEditPortGroup(project, current, localId, updates));
  }

  function updateNewPortGroupCategory(localId: string, categoryId: string) {
    setNewPortGroups((current) => updateNewEditPortGroupCategory(project, current, localId, categoryId));
  }

  function toggleNewPortGroupPlannedCables(localId: string, checked: boolean) {
    setNewPortGroups((current) =>
      toggleNewEditPortGroupPlannedCables(project, current, localId, checked),
    );
  }

  function addPortGroup() {
    setNewPortGroups((current) => addNewEditPortGroup(project, current, device, localIdFactory.current));
  }

  function removeNewPortGroup(localId: string) {
    setNewPortGroups((current) => removeNewEditPortGroup(project, current, localId));
  }

  function submit(confirmWarnings: (message: string) => boolean): boolean {
    if (validation.errors.length > 0) {
      return false;
    }

    if (validation.warnings.length > 0) {
      const confirmed = confirmWarnings(
        `${validation.warnings.join('\n')}\n\nContinue and reserve these cable number gaps?`,
      );

      if (!confirmed) {
        return false;
      }
    }

    editDevice(createEditDeviceCommandInput(device, existingPortGroups, newPortGroups));
    onSaved(initialDevice.id);

    return true;
  }

  return {
    device,
    existingPortGroups,
    newPortGroups,
    validation,
    addPortGroup,
    removeNewPortGroup,
    setDevice,
    submit,
    updateExistingPortGroup,
    updateNewPortGroup,
    updateNewPortGroupCategory,
    toggleNewPortGroupPlannedCables,
  };
}
