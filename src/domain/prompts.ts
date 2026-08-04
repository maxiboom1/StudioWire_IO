import type { Device, Location, ProjectRoot, ProjectView, Rack, SubLocation } from './types';
import type { ViewSourceImpact } from './viewOperations';

export type ConfirmationTone = 'default' | 'danger';

export interface ConfirmationCopy {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
}

export function buildCrossLocationRackAssignmentPrompt(
  project: ProjectRoot,
  device: Device,
  targetRack: Rack,
): string | null {
  if (device.locationId === targetRack.locationId) {
    return null;
  }

  const sourceLocation = project.locations.find((location) => location.id === device.locationId);
  const targetLocation = project.locations.find((location) => location.id === targetRack.locationId);

  if (!sourceLocation || !targetLocation) {
    return null;
  }

  return `You are assigning "${device.name}" from "${sourceLocation.name}" to rack "${targetRack.name}" in "${targetLocation.name}". This will move the device to "${targetLocation.name}". Proceed?`;
}

export function buildCrossLocationRackAssignmentConfirmation(
  project: ProjectRoot,
  device: Device,
  targetRack: Rack,
): ConfirmationCopy | null {
  const message = buildCrossLocationRackAssignmentPrompt(project, device, targetRack);

  if (!message) {
    return null;
  }

  return {
    title: 'Move device to rack location?',
    message,
    confirmLabel: 'Proceed',
    cancelLabel: 'Cancel',
  };
}

export function buildRackUnassignConfirmation(device: Device, rack?: Rack | null): ConfirmationCopy {
  return {
    title: 'Unassign from rack?',
    message: rack
      ? `Unassign "${device.name}" from rack "${rack.name}"?`
      : `Unassign "${device.name}" from its rack?`,
    confirmLabel: 'Unassign',
    cancelLabel: 'Cancel',
  };
}

export function buildDeleteDeviceConfirmation(
  device: Device,
  viewImpact: ViewSourceImpact[] = [],
): ConfirmationCopy {
  return {
    title: 'Delete device?',
    message: `Delete device "${device.name}"?\n\nThis removes the device, ports, port groups, and device-owned cable numbers. Any active connections involving this device are disconnected.${formatViewSourceDeletionImpact(viewImpact)}`,
    confirmLabel: 'Delete Device',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildDeleteTerminalBlockConfirmation(
  device: Device,
  viewImpact: ViewSourceImpact[] = [],
): ConfirmationCopy {
  return {
    title: 'Delete terminal block?',
    message: `Delete TB "${device.name}"?\n\nThis removes its rear/front ports and disconnects cables that reference them.${formatViewSourceDeletionImpact(viewImpact)}`,
    confirmLabel: 'Delete TB',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildDeleteRackConfirmation(
  rack: Rack,
  viewImpact: ViewSourceImpact[] = [],
): ConfirmationCopy {
  return {
    title: 'Delete rack?',
    message: `Delete rack "${rack.name}"?\n\nRacks with assigned devices will be blocked.${formatViewSourceDeletionImpact(viewImpact)}`,
    confirmLabel: 'Delete Rack',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildDeleteLocationConfirmation(location: Location): ConfirmationCopy {
  return {
    title: 'Delete location?',
    message: `Delete location "${location.name}"?\n\nLocations with folders, racks, or devices will be blocked.`,
    confirmLabel: 'Delete Location',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildDeleteFolderConfirmation(folder: SubLocation): ConfirmationCopy {
  return {
    title: 'Delete folder?',
    message: `Delete folder "${folder.name}"?\n\nOnly empty folders can be deleted.`,
    confirmLabel: 'Delete Folder',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildDeleteViewConfirmation(view: ProjectView): ConfirmationCopy {
  return {
    title: 'Delete View?',
    message: `Delete View "${view.name}"?\n\nThis removes ${view.placements.length} placement(s), ${view.lines.length} line(s), and ${view.annotations.length} annotation(s) from this View only. Source devices and racks are not affected.`,
    confirmLabel: 'Delete View',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildViewFormatChangeConfirmation(view: ProjectView): ConfirmationCopy {
  return {
    title: 'Change populated View format?',
    message: `Change the page format for "${view.name}"?\n\nExisting coordinates are retained. Content outside the new page boundary will be reported rather than scaled or moved.`,
    confirmLabel: 'Change Format',
    cancelLabel: 'Cancel',
  };
}

export function buildCableReservationConfirmation(warnings: string[]): ConfirmationCopy {
  return {
    title: 'Reserve cable number gaps?',
    message: `${warnings.join('\n')}\n\nContinue and reserve these cable number gaps?`,
    confirmLabel: 'Reserve Gaps',
    cancelLabel: 'Cancel',
  };
}

export function buildReplaceDeviceDraftConfirmation(): ConfirmationCopy {
  return {
    title: 'Replace device draft?',
    message:
      'Loading this template will replace the current Device Name, hardware details, placement defaults, and I/O interfaces.',
    confirmLabel: 'Load Template',
    cancelLabel: 'Keep Current Draft',
  };
}

export function buildUnsavedInspectorChangesConfirmation(): ConfirmationCopy {
  return {
    title: 'Unsaved inspector changes',
    message: 'Save your inspector changes before leaving this item?',
    confirmLabel: 'Save',
    cancelLabel: 'Cancel',
  };
}

export const buildUnsavedDeviceInspectorChangesConfirmation = buildUnsavedInspectorChangesConfirmation;

function formatViewSourceDeletionImpact(viewImpact: ViewSourceImpact[]): string {
  if (viewImpact.length === 0) {
    return '';
  }

  const placementCount = viewImpact.reduce((total, impact) => total + impact.placementCount, 0);
  const lineCount = viewImpact.reduce((total, impact) => total + impact.attachedLineCount, 0);
  const viewNames = viewImpact.map((impact) => `"${impact.viewName}"`).join(', ');

  return `\n\nAffected Views: ${viewNames}. ${placementCount} placement(s) and ${lineCount} attached line(s) will be removed; unrelated View annotations remain.`;
}
