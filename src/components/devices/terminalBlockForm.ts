import {
  getDefaultConnectorForCategory,
  isConnectorAssignedToCategory,
} from '../../domain/connectorCompatibility';
import { makeId } from '../../domain/id';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import { validateRackPlacement } from '../../domain/rackPlacement';
import {
  editTerminalBlockInProject,
  normalizeTerminalBlockPrefix,
} from '../../domain/terminalBlockOperations';
import type { Device, ProjectRoot } from '../../domain/types';

export type TerminalBlockNumberField = number | '';

export interface TerminalBlockFormValue {
  name: string;
  labelPrefix: string;
  categoryId: string;
  connectorTypeId: string;
  count: TerminalBlockNumberField;
  rackId: string;
  rackBottomRu: TerminalBlockNumberField;
  notes: string;
}

export function createAddTerminalBlockForm(
  project: ProjectRoot,
  racks: ProjectRoot['racks'],
): TerminalBlockFormValue {
  const category = project.settings.categories[0];

  return {
    name: '',
    labelPrefix: '',
    categoryId: category?.id ?? '',
    connectorTypeId: category
      ? (getDefaultConnectorForCategory(project.settings, category.id)?.id ?? '')
      : '',
    count: 16,
    rackId: racks[0]?.id ?? '',
    rackBottomRu: 1,
    notes: '',
  };
}

export function createEditTerminalBlockForm(project: ProjectRoot, device: Device): TerminalBlockFormValue {
  const group = project.portGroups.find((candidate) => candidate.deviceId === device.id);

  return {
    name: device.name,
    labelPrefix: device.labelPrefix,
    categoryId: device.categoryId,
    connectorTypeId: group?.connectorTypeId ?? '',
    count: group?.count ?? 0,
    rackId: device.rackId ?? '',
    rackBottomRu: device.rackBottomRu ?? 1,
    notes: device.notes,
  };
}

export function updateTerminalBlockFormCategory(
  project: ProjectRoot,
  form: TerminalBlockFormValue,
  categoryId: string,
): TerminalBlockFormValue {
  return {
    ...form,
    categoryId,
    connectorTypeId: getDefaultConnectorForCategory(project.settings, categoryId)?.id ?? '',
  };
}

export function getTerminalBlockFormErrors(
  project: ProjectRoot,
  form: TerminalBlockFormValue,
  editingDevice?: Device,
): string[] {
  const errors: string[] = [];
  const name = form.name.trim();
  const count = Number(form.count);
  const rackBottomRu = Number(form.rackBottomRu);

  if (!name) {
    errors.push('TB name is required.');
  }

  const nameConflict = findProjectItemNameConflict(
    project,
    name,
    editingDevice ? { id: editingDevice.id, type: 'terminal block' } : undefined,
  );

  if (nameConflict) {
    errors.push(formatProjectItemNameConflict(nameConflict));
  }

  if (!project.settings.categories.some((category) => category.id === form.categoryId)) {
    errors.push('TB category is required.');
  }

  if (
    !project.settings.connectorTypes.some((connector) => connector.id === form.connectorTypeId) ||
    !isConnectorAssignedToCategory(project.settings, form.categoryId, form.connectorTypeId)
  ) {
    errors.push('Select a connector assigned to the TB category.');
  }

  if (!Number.isSafeInteger(count) || count <= 0) {
    errors.push('Connector count must be positive.');
  }

  const rack = project.racks.find((candidate) => candidate.id === form.rackId);

  if (!rack) {
    errors.push('TB rack is required.');
  } else if (!Number.isSafeInteger(rackBottomRu) || rackBottomRu <= 0) {
    errors.push('Bottom RU must be positive.');
  } else if (editingDevice) {
    const result = editTerminalBlockInProject(
      project,
      {
        deviceId: editingDevice.id,
        name,
        labelPrefix: normalizeTerminalBlockPrefix(form.labelPrefix || name),
        categoryId: form.categoryId,
        connectorTypeId: form.connectorTypeId,
        count,
        rackId: rack.id,
        rackBottomRu,
        notes: form.notes,
      },
      editingDevice.updatedAt,
    );

    if (!result.ok) {
      errors.push(result.error.replace(/^TB edit blocked:\s*/, ''));
    }
  } else {
    const probe: Device = {
      id: makeId('terminal-block-preview', `${name || 'TB'}-${rackBottomRu}`),
      name: name || 'TB',
      kind: 'terminal_block',
      categoryId: form.categoryId,
      locationId: rack.locationId,
      subLocationId: null,
      labelPrefix: normalizeTerminalBlockPrefix(form.labelPrefix || name),
      mountType: 'rack',
      rackId: rack.id,
      rackSizeRu: 1,
      rackBottomRu,
      status: 'planned',
      notes: '',
      createdAt: '',
      updatedAt: '',
    };
    const placement = validateRackPlacement(
      { ...project, devices: [...project.devices, probe] },
      { deviceId: probe.id, targetRackId: rack.id, targetBottomRu: rackBottomRu },
    );

    if (!placement.ok) {
      errors.push(placement.message);
    }
  }

  return Array.from(new Set(errors));
}

export function toTerminalBlockEditInput(deviceId: string, form: TerminalBlockFormValue) {
  return {
    deviceId,
    name: form.name.trim(),
    labelPrefix: normalizeTerminalBlockPrefix(form.labelPrefix || form.name),
    categoryId: form.categoryId,
    connectorTypeId: form.connectorTypeId,
    count: Number(form.count),
    rackId: form.rackId,
    rackBottomRu: Number(form.rackBottomRu),
    notes: form.notes.trim(),
  };
}
