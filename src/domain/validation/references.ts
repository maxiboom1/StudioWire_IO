import { createCategoryAssignmentKey } from '../connectorCompatibility';
import type { ProjectRoot, ValidationIssue } from '../types';
import type { ValidationIssueBuilder } from './shared';

export function validateReferences(
  project: ProjectRoot,
  categories: Set<string>,
  connectorTypes: Set<string>,
  categoryConnectorAssignments: Set<string>,
  cablePrefixes: Set<string>,
  issue: ValidationIssueBuilder,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const device of project.devices) {
    if (!categories.has(device.categoryId)) {
      issues.push(
        issue(
          'error',
          'unknown-category',
          `Device ${device.name} uses unknown category.`,
          'device',
          device.id,
        ),
      );
    }
  }

  for (const portGroup of project.portGroups) {
    if (!categories.has(portGroup.categoryId)) {
      issues.push(
        issue(
          'error',
          'unknown-category',
          `Port group ${portGroup.name} uses unknown category.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (!connectorTypes.has(portGroup.connectorTypeId)) {
      issues.push(
        issue(
          'error',
          'unknown-connector-type',
          `Port group ${portGroup.name} uses unknown connector type.`,
          'portGroup',
          portGroup.id,
        ),
      );
    } else if (
      !categoryConnectorAssignments.has(
        createCategoryAssignmentKey(portGroup.categoryId, portGroup.connectorTypeId),
      )
    ) {
      issues.push(
        issue(
          'error',
          'port-group-connector-not-assigned-to-category',
          `Port group ${portGroup.name} uses a connector that is not assigned to its category.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (!cablePrefixes.has(portGroup.cablePrefix)) {
      issues.push(
        issue(
          'error',
          'unknown-cable-prefix',
          `Port group ${portGroup.name} uses unknown cable prefix ${portGroup.cablePrefix}.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }
  }

  for (const port of project.ports) {
    if (!categories.has(port.categoryId)) {
      issues.push(
        issue('error', 'unknown-category', `Port ${port.label} uses unknown category.`, 'port', port.id),
      );
    }

    if (!connectorTypes.has(port.connectorTypeId)) {
      issues.push(
        issue(
          'error',
          'unknown-connector-type',
          `Port ${port.label} uses unknown connector type.`,
          'port',
          port.id,
        ),
      );
    } else if (
      !categoryConnectorAssignments.has(createCategoryAssignmentKey(port.categoryId, port.connectorTypeId))
    ) {
      issues.push(
        issue(
          'error',
          'port-connector-not-assigned-to-category',
          `Port ${port.label} uses a connector that is not assigned to its category.`,
          'port',
          port.id,
        ),
      );
    }
  }

  for (const cable of project.cables) {
    if (!cablePrefixes.has(cable.prefix)) {
      issues.push(
        issue(
          'error',
          'unknown-cable-prefix',
          `Cable ${cable.number} uses unknown cable prefix ${cable.prefix}.`,
          'cable',
          cable.id,
        ),
      );
    }
  }

  for (const ledger of project.numberingLedgers) {
    if (!cablePrefixes.has(ledger.prefix)) {
      issues.push(
        issue(
          'error',
          'unknown-cable-prefix',
          `Numbering ledger uses unknown cable prefix ${ledger.prefix}.`,
          'numberingLedger',
          ledger.prefix,
        ),
      );
    }
  }

  return issues;
}
