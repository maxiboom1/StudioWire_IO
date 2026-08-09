import { useMemo, useRef, useState } from 'react';
import { buildCableReservationConfirmation, type ConfirmationCopy } from '../../domain/prompts';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { Device, ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectContextTypes';
import type { DeviceDraft, EditDevicePortGroupOrderItem } from '../../state/projectTypes';
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
import { moveByOffset, reorderById } from './portGroupOrdering';

export interface EditDeviceFormController {
  device: DeviceDraft;
  existingPortGroups: ExistingPortGroupForm[];
  interfaceItems: EditDeviceInterfaceItem[];
  newPortGroups: DevicePortGroupForm[];
  validation: ReturnType<typeof getEditDeviceValidation>;
  addPortGroup: () => void;
  removeNewPortGroup: (localId: string) => void;
  moveInterface: (localId: string, targetLocalId: string) => void;
  moveInterfaceByOffset: (localId: string, offset: -1 | 1) => void;
  moveExistingPortGroup: (id: string, targetId: string) => void;
  moveExistingPortGroupByOffset: (id: string, offset: -1 | 1) => void;
  moveNewPortGroup: (localId: string, targetLocalId: string) => void;
  moveNewPortGroupByOffset: (localId: string, offset: -1 | 1) => void;
  setDevice: (updates: Partial<DeviceDraft>) => void;
  submit: (confirmWarnings: (request: ConfirmationCopy) => Promise<boolean>) => Promise<boolean>;
  updateExistingPortGroup: (
    id: string,
    updates: Pick<
      Partial<ExistingPortGroupForm>,
      'name' | 'portLabelPattern' | 'devicePortLabelPattern' | 'colorOverride'
    >,
  ) => void;
  updateNewPortGroup: (localId: string, updates: Partial<DevicePortGroupForm>) => void;
  updateNewPortGroupCategory: (localId: string, categoryId: string) => void;
  toggleNewPortGroupPlannedCables: (localId: string, checked: boolean) => void;
}

export type EditDeviceInterfaceItem =
  | { kind: 'existing'; group: ExistingPortGroupForm }
  | { kind: 'new'; group: DevicePortGroupForm };

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
  const [interfaceOrder, setInterfaceOrder] = useState<EditDevicePortGroupOrderItem[]>(() =>
    createExistingPortGroupForms(project, initialDevice.id).map((group) => ({
      kind: 'existing',
      id: group.id,
    })),
  );
  const validation = useMemo(
    () => getEditDeviceValidation(project, device, existingPortGroups, newPortGroups),
    [device, existingPortGroups, newPortGroups, project],
  );
  const interfaceItems = useMemo(
    () => createInterfaceItems(interfaceOrder, existingPortGroups, newPortGroups),
    [existingPortGroups, interfaceOrder, newPortGroups],
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
    updates: Pick<
      Partial<ExistingPortGroupForm>,
      'name' | 'portLabelPattern' | 'devicePortLabelPattern' | 'colorOverride'
    >,
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
    setNewPortGroups((current) => toggleNewEditPortGroupPlannedCables(project, current, localId, checked));
  }

  function addPortGroup() {
    const localId = localIdFactory.current();

    setNewPortGroups((current) =>
      addNewEditPortGroup(project, current, device, localIdFactory.current, localId),
    );
    setInterfaceOrder((current) => [...current, { kind: 'new', localId }]);
  }

  function removeNewPortGroup(localId: string) {
    setNewPortGroups((current) => removeNewEditPortGroup(project, current, localId));
    setInterfaceOrder((current) => current.filter((item) => getOrderLocalId(item) !== localId));
  }

  function moveExistingPortGroup(id: string, targetId: string) {
    setExistingPortGroups((current) => reorderById(current, id, targetId, (group) => group.id));
    moveInterface(id, targetId);
  }

  function moveExistingPortGroupByOffset(id: string, offset: -1 | 1) {
    setExistingPortGroups((current) => moveByOffset(current, id, offset, (group) => group.id));
    moveInterfaceByOffset(id, offset);
  }

  function moveNewPortGroup(localId: string, targetLocalId: string) {
    setNewPortGroups((current) => reorderById(current, localId, targetLocalId, (group) => group.localId));
    moveInterface(localId, targetLocalId);
  }

  function moveNewPortGroupByOffset(localId: string, offset: -1 | 1) {
    setNewPortGroups((current) => moveByOffset(current, localId, offset, (group) => group.localId));
    moveInterfaceByOffset(localId, offset);
  }

  function moveInterface(localId: string, targetLocalId: string) {
    setInterfaceOrder((current) => reorderById(current, localId, targetLocalId, getOrderLocalId));
  }

  function moveInterfaceByOffset(localId: string, offset: -1 | 1) {
    setInterfaceOrder((current) => moveByOffset(current, localId, offset, getOrderLocalId));
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

    editDevice(createEditDeviceCommandInput(device, existingPortGroups, newPortGroups, interfaceOrder));
    onSaved(initialDevice.id);

    return true;
  }

  return {
    device,
    existingPortGroups,
    interfaceItems,
    newPortGroups,
    validation,
    addPortGroup,
    removeNewPortGroup,
    moveInterface,
    moveInterfaceByOffset,
    moveExistingPortGroup,
    moveExistingPortGroupByOffset,
    moveNewPortGroup,
    moveNewPortGroupByOffset,
    setDevice,
    submit,
    updateExistingPortGroup,
    updateNewPortGroup,
    updateNewPortGroupCategory,
    toggleNewPortGroupPlannedCables,
  };
}

function createInterfaceItems(
  order: EditDevicePortGroupOrderItem[],
  existingGroups: ExistingPortGroupForm[],
  newGroups: DevicePortGroupForm[],
): EditDeviceInterfaceItem[] {
  const existingById = new Map(existingGroups.map((group) => [group.id, group] as const));
  const newByLocalId = new Map(newGroups.map((group) => [group.localId, group] as const));

  return order
    .map((item): EditDeviceInterfaceItem | null => {
      if (item.kind === 'existing') {
        const group = existingById.get(item.id);

        return group ? { kind: 'existing', group } : null;
      }

      const group = newByLocalId.get(item.localId);

      return group ? { kind: 'new', group } : null;
    })
    .filter((item): item is EditDeviceInterfaceItem => Boolean(item));
}

function getOrderLocalId(item: EditDevicePortGroupOrderItem): string {
  return item.kind === 'existing' ? item.id : item.localId;
}
