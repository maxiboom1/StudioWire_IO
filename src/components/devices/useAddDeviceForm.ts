import { useMemo, useRef, useState } from 'react';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { ProjectRoot } from '../../domain/types';
import type { AddDeviceInput } from '../../state/projectContextTypes';
import type { DeviceDraft } from '../../state/projectTypes';
import {
  addPortGroupDraft,
  createAddDeviceCommandInput,
  createInitialDeviceDraft,
  createInitialPortGroups,
  getAddDeviceValidation,
  normalizeDeviceToken,
  removePortGroupDraft,
  togglePortGroupPlannedCables,
  updatePortGroupCategory,
  updatePortGroupDrafts,
  type DevicePortGroupForm,
} from './addDeviceDraft';
import { createRuntimeAddDeviceLocalIdFactory, type AddDeviceLocalIdFactory } from './addDeviceLocalIds';

export interface AddDeviceFormController {
  device: DeviceDraft;
  effectiveLabelPrefix: string;
  portGroups: DevicePortGroupForm[];
  validation: ReturnType<typeof getAddDeviceValidation>;
  addPortGroup: () => void;
  removePortGroup: (localId: string) => void;
  setDevice: (updates: Partial<DeviceDraft>) => void;
  submit: (confirmWarnings: (message: string) => boolean) => boolean;
  updatePortGroup: (localId: string, updates: Partial<DevicePortGroupForm>) => void;
  updatePortGroupCategory: (localId: string, categoryId: string) => void;
  updateDeviceCategory: (categoryId: string) => void;
  togglePlannedCables: (localId: string, checked: boolean) => void;
}

export function useAddDeviceForm({
  addDevice,
  initialLocationId,
  makeLocalId,
  onCreated,
  project,
}: {
  addDevice: (input: AddDeviceInput) => string;
  initialLocationId: string | null;
  makeLocalId?: AddDeviceLocalIdFactory;
  onCreated: (id: string) => void;
  project: ProjectRoot;
}): AddDeviceFormController {
  const localIdFactory = useRef<AddDeviceLocalIdFactory>(
    makeLocalId ?? createRuntimeAddDeviceLocalIdFactory(),
  );
  const [device, setDeviceState] = useState<DeviceDraft>(() =>
    createInitialDeviceDraft(project, initialLocationId),
  );
  const [portGroups, setPortGroups] = useState<DevicePortGroupForm[]>(() =>
    createInitialPortGroups(project, project.settings.categories[0]?.id ?? '', localIdFactory.current),
  );
  const validation = useMemo(
    () => getAddDeviceValidation(project, device, portGroups),
    [device, portGroups, project],
  );
  const effectiveLabelPrefix = normalizeDeviceToken(device.labelPrefix || device.name);

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

  function updateDeviceCategory(categoryId: string) {
    setDeviceState((current) => ({ ...current, categoryId }));
    setPortGroups(createInitialPortGroups(project, categoryId, localIdFactory.current));
  }

  function updatePortGroup(localId: string, updates: Partial<DevicePortGroupForm>) {
    setPortGroups((current) => updatePortGroupDrafts(project, current, localId, updates));
  }

  function handlePortGroupCategoryChange(localId: string, categoryId: string) {
    setPortGroups((current) => updatePortGroupCategory(project, current, localId, categoryId));
  }

  function togglePlannedCables(localId: string, checked: boolean) {
    setPortGroups((current) => togglePortGroupPlannedCables(project, current, localId, checked));
  }

  function addPortGroup() {
    setPortGroups((current) => addPortGroupDraft(project, current, device, localIdFactory.current));
  }

  function removePortGroup(localId: string) {
    setPortGroups((current) => removePortGroupDraft(project, current, localId));
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

    const id = addDevice(createAddDeviceCommandInput(device, portGroups));
    onCreated(id);

    return true;
  }

  return {
    device,
    effectiveLabelPrefix,
    portGroups,
    validation,
    addPortGroup,
    removePortGroup,
    setDevice,
    submit,
    updateDeviceCategory,
    updatePortGroup,
    updatePortGroupCategory: handlePortGroupCategoryChange,
    togglePlannedCables,
  };
}
