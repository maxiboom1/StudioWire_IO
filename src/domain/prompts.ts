import type { Device, Location, ProjectRoot, Rack } from './types';

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

export function buildDeleteDeviceConfirmation(device: Device): ConfirmationCopy {
  return {
    title: 'Delete device?',
    message: `Delete device "${device.name}"?\n\nThis removes the device, ports, port groups, and device-owned cable numbers. Any active connections involving this device are disconnected.`,
    confirmLabel: 'Delete Device',
    cancelLabel: 'Cancel',
    tone: 'danger',
  };
}

export function buildDeleteRackConfirmation(rack: Rack): ConfirmationCopy {
  return {
    title: 'Delete rack?',
    message: `Delete rack "${rack.name}"?\n\nRacks with assigned devices will be blocked.`,
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

export function buildCableReservationConfirmation(warnings: string[]): ConfirmationCopy {
  return {
    title: 'Reserve cable number gaps?',
    message: `${warnings.join('\n')}\n\nContinue and reserve these cable number gaps?`,
    confirmLabel: 'Reserve Gaps',
    cancelLabel: 'Cancel',
  };
}

export function buildUnsavedDeviceInspectorChangesConfirmation(): ConfirmationCopy {
  return {
    title: 'Unsaved device changes',
    message: 'Save your inspector changes before leaving this device?',
    confirmLabel: 'Save',
    cancelLabel: 'Cancel',
  };
}
