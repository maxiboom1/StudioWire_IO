import { useMemo, useRef, useState } from 'react';
import { buildCableReservationConfirmation, type ConfirmationCopy } from '../../domain/prompts';
import type { DeviceTemplate, DeviceTemplateCompatibility } from '../../domain/deviceTemplates/types';
import { mapDeviceTemplateToFormDraft } from '../../domain/deviceTemplates/templateMapping';
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
import { moveByOffset, reorderById } from './portGroupOrdering';

export interface AddDeviceFormController {
  device: DeviceDraft;
  effectiveLabelPrefix: string;
  hasUnsavedChanges: boolean;
  portGroups: DevicePortGroupForm[];
  validation: ReturnType<typeof getAddDeviceValidation>;
  addPortGroup: () => void;
  removePortGroup: (localId: string) => void;
  movePortGroup: (localId: string, targetLocalId: string) => void;
  movePortGroupByOffset: (localId: string, offset: -1 | 1) => void;
  loadTemplate: (template: DeviceTemplate, compatibility: DeviceTemplateCompatibility) => boolean;
  setDevice: (updates: Partial<DeviceDraft>) => void;
  submit: (confirmWarnings: (request: ConfirmationCopy) => Promise<boolean>) => Promise<boolean>;
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
  const baselineFingerprint = useRef<string | null>(null);
  const currentFingerprint = createFormFingerprint(device, portGroups);

  if (baselineFingerprint.current === null) {
    baselineFingerprint.current = currentFingerprint;
  }

  const hasUnsavedChanges = baselineFingerprint.current !== currentFingerprint;
  const validation = useMemo(
    () => getAddDeviceValidation(project, device, portGroups),
    [device, portGroups, project],
  );
  const effectiveLabelPrefix = normalizeDeviceToken(device.code || device.name);

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

  function movePortGroup(localId: string, targetLocalId: string) {
    setPortGroups((current) => reorderById(current, localId, targetLocalId, (group) => group.localId));
  }

  function movePortGroupByOffset(localId: string, offset: -1 | 1) {
    setPortGroups((current) => moveByOffset(current, localId, offset, (group) => group.localId));
  }

  function loadTemplate(template: DeviceTemplate, compatibility: DeviceTemplateCompatibility): boolean {
    const draft = mapDeviceTemplateToFormDraft(project, template, compatibility, localIdFactory.current);

    if (!draft) {
      return false;
    }

    setDeviceState(draft.device);
    setPortGroups(draft.portGroups);
    baselineFingerprint.current = createFormFingerprint(draft.device, draft.portGroups);
    return true;
  }

  async function submit(confirmWarnings: (request: ConfirmationCopy) => Promise<boolean>): Promise<boolean> {
    if (validation.errors.length > 0) {
      return false;
    }

    if (validation.warnings.length > 0) {
      const confirmed = await confirmWarnings(buildCableReservationConfirmation(validation.warnings));

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
    hasUnsavedChanges,
    portGroups,
    validation,
    addPortGroup,
    removePortGroup,
    movePortGroup,
    movePortGroupByOffset,
    loadTemplate,
    setDevice,
    submit,
    updateDeviceCategory,
    updatePortGroup,
    updatePortGroupCategory: handlePortGroupCategoryChange,
    togglePlannedCables,
  };
}

function createFormFingerprint(device: DeviceDraft, portGroups: DevicePortGroupForm[]): string {
  return JSON.stringify({ device, portGroups });
}
