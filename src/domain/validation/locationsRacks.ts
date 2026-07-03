import type { ProjectRoot, ValidationIssue } from '../types';
import { countBy, isPositiveInteger, isRackPositionValid, type ValidationIssueBuilder } from './shared';

export function validateLocationsAndRacks(
  project: ProjectRoot,
  locations: Set<string>,
  issue: ValidationIssueBuilder,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const locationNameCounts = countBy(project.locations, (location) => location.name.trim().toLowerCase());
  const subLocationNameCounts = countBy(
    project.subLocations,
    (subLocation) => `${subLocation.locationId}:${subLocation.name.trim().toLowerCase()}`,
  );

  for (const location of project.locations) {
    if ((locationNameCounts.get(location.name.trim().toLowerCase()) ?? 0) > 1) {
      issues.push(
        issue(
          'warning',
          'duplicate-location-name',
          `Location name "${location.name}" is used more than once.`,
          'location',
          location.id,
        ),
      );
    }
  }

  for (const subLocation of project.subLocations) {
    if (!subLocation.name.trim()) {
      issues.push(
        issue(
          'error',
          'sub-location-name-required',
          'Sub-location name is required.',
          'subLocation',
          subLocation.id,
        ),
      );
    }

    if (!locations.has(subLocation.locationId)) {
      issues.push(
        issue(
          'error',
          'sub-location-without-location',
          'Sub-location must reference an existing location.',
          'subLocation',
          subLocation.id,
        ),
      );
    }

    if (
      (subLocationNameCounts.get(`${subLocation.locationId}:${subLocation.name.trim().toLowerCase()}`) ??
        0) > 1
    ) {
      issues.push(
        issue(
          'warning',
          'duplicate-sub-location-name',
          `Sub-location name "${subLocation.name}" is used more than once in one location.`,
          'subLocation',
          subLocation.id,
        ),
      );
    }
  }

  for (const rack of project.racks) {
    if (!rack.name.trim()) {
      issues.push(issue('error', 'rack-name-required', 'Rack name is required.', 'rack', rack.id));
    }

    if (!locations.has(rack.locationId)) {
      issues.push(
        issue('error', 'rack-without-location', 'Rack must reference an existing location.', 'rack', rack.id),
      );
    }

    if (!isPositiveInteger(rack.heightRu)) {
      issues.push(issue('error', 'rack-height-positive', 'Rack height must be positive.', 'rack', rack.id));
    }
  }

  return issues;
}

export function validateDevices(
  project: ProjectRoot,
  locations: Set<string>,
  subLocations: Map<string, ProjectRoot['subLocations'][number]>,
  racks: Map<string, ProjectRoot['racks'][number]>,
  issue: ValidationIssueBuilder,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const device of project.devices) {
    if (!device.name.trim()) {
      issues.push(issue('error', 'device-name-required', 'Device name is required.', 'device', device.id));
    }

    if (device.kind !== 'terminal_block' && !device.code?.trim()) {
      issues.push(issue('error', 'device-code-required', 'Device code is required.', 'device', device.id));
    }

    if (device.kind === 'terminal_block') {
      if (device.mountType !== 'rack') {
        issues.push(
          issue(
            'error',
            'terminal-block-rack-mounted',
            'Terminal block must be rack-mounted.',
            'device',
            device.id,
          ),
        );
      }

      if (device.rackSizeRu !== 1) {
        issues.push(
          issue(
            'error',
            'terminal-block-size-fixed',
            'Terminal block rack size must be 1 RU.',
            'device',
            device.id,
          ),
        );
      }
    }

    if (!device.locationId || !locations.has(device.locationId)) {
      issues.push(
        issue(
          'error',
          'device-without-location',
          'Device must reference an existing location.',
          'device',
          device.id,
        ),
      );
    }

    if (device.subLocationId !== null) {
      const subLocation = subLocations.get(device.subLocationId);

      if (!subLocation) {
        issues.push(
          issue(
            'error',
            'device-sub-location-missing',
            'Device sub-location must reference an existing sub-location.',
            'device',
            device.id,
          ),
        );
      } else if (subLocation.locationId !== device.locationId) {
        issues.push(
          issue(
            'error',
            'device-sub-location-location-mismatch',
            'Device sub-location must belong to the same location as the device.',
            'device',
            device.id,
          ),
        );
      }
    }

    if (device.mountType !== 'rack') {
      continue;
    }

    const rack = device.rackId ? racks.get(device.rackId) : null;

    if (device.rackId && !rack) {
      issues.push(
        issue(
          'error',
          'device-references-missing-rack',
          `${device.name} references missing rack ${device.rackId}.`,
          'device',
          device.id,
        ),
      );
      continue;
    }

    if (!rack) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-without-rack',
          'Rack-mounted device requires a rack.',
          'device',
          device.id,
        ),
      );
      continue;
    }

    if (rack.locationId !== device.locationId) {
      issues.push(
        issue(
          'error',
          'rack-location-device-location-mismatch',
          `${device.name} is assigned to a rack in a different location.`,
          'device',
          device.id,
        ),
      );
    }

    if (!isPositiveInteger(device.rackBottomRu)) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-invalid-bottom-ru',
          'Rack-mounted device requires a positive bottom RU.',
          'device',
          device.id,
        ),
      );
      continue;
    }

    if (!isPositiveInteger(device.rackSizeRu)) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-invalid-size-ru',
          'Rack-mounted device requires a positive rack size.',
          'device',
          device.id,
        ),
      );
      continue;
    }

    if ((device.rackBottomRu ?? 0) + (device.rackSizeRu ?? 0) - 1 > rack.heightRu) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-exceeds-rack-height',
          `${device.name} exceeds rack height for ${rack.name}.`,
          'device',
          device.id,
        ),
      );
    }
  }

  return issues;
}

export function validateRackOverlaps(project: ProjectRoot, issue: ValidationIssueBuilder): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const rack of project.racks) {
    const rackDevices = project.devices.filter(
      (device) => device.rackId === rack.id && device.mountType === 'rack',
    );

    for (let leftIndex = 0; leftIndex < rackDevices.length; leftIndex += 1) {
      const left = rackDevices[leftIndex];

      if (!isRackPositionValid(left)) {
        continue;
      }

      const leftFrom = left.rackBottomRu;
      const leftTo = left.rackBottomRu + left.rackSizeRu - 1;

      for (let rightIndex = leftIndex + 1; rightIndex < rackDevices.length; rightIndex += 1) {
        const right = rackDevices[rightIndex];

        if (!isRackPositionValid(right)) {
          continue;
        }

        const rightFrom = right.rackBottomRu;
        const rightTo = right.rackBottomRu + right.rackSizeRu - 1;

        if (leftFrom <= rightTo && rightFrom <= leftTo) {
          issues.push(
            issue(
              'error',
              'rack-ru-overlap',
              `${left.name} overlaps ${right.name} in ${rack.name}.`,
              'rack',
              rack.id,
            ),
          );
        }
      }
    }
  }

  return issues;
}
