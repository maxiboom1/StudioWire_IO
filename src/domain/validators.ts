import type { ProjectRoot, ValidationIssue } from './types';
import { validateCables } from './validation/cablesConnections';
import { validatePortsAndGroups } from './validation/devicesPorts';
import {
  validateLocationsAndRacks,
  validateDevices,
  validateRackOverlaps,
} from './validation/locationsRacks';
import { validateLedgerRanges, validateReservedGapReuse } from './validation/numberingLedger';
import { validateDuplicateIds, validateSettings } from './validation/projectSettings';
import { validateReferences } from './validation/references';
import { buildValidationContext, createIssueBuilder } from './validation/shared';
import { validateViews } from './validation/views';

export function validateProject(project: ProjectRoot): ValidationIssue[] {
  const builder = createIssueBuilder();
  const issues: ValidationIssue[] = [];
  const context = buildValidationContext(project);

  issues.push(...validateDuplicateIds(project, builder));
  issues.push(...validateSettings(project, builder));
  issues.push(...validateCables(project, context.ports, builder));
  issues.push(
    ...validateReferences(
      project,
      context.categories,
      context.connectorTypes,
      context.categoryConnectorAssignments,
      context.cablePrefixes,
      builder,
    ),
  );
  issues.push(...validateLocationsAndRacks(project, context.locations, builder));
  issues.push(...validateDevices(project, context.locations, context.subLocations, context.racks, builder));
  issues.push(...validateRackOverlaps(project, builder));
  issues.push(...validateViews(project, builder));
  issues.push(...validatePortsAndGroups(project, context.devices, context.portGroups, builder));
  issues.push(...validateLedgerRanges(project, context.cablePrefixes, builder));
  issues.push(...validateReservedGapReuse(project, builder));

  return issues;
}
