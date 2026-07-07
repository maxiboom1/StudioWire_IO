import type { Device, ProjectRoot, Rack } from './types';

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
