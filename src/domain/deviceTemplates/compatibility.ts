import type { Category, ConnectorType, ProjectRoot } from '../types';
import type {
  DeviceTemplate,
  DeviceTemplateCompatibility,
  DeviceTemplateIssue,
  ResolvedDeviceTemplateIoInterface,
} from './types';
import { normalizeTemplateName } from './templateValidation';

export function checkDeviceTemplateCompatibility(
  project: ProjectRoot,
  template: DeviceTemplate,
): DeviceTemplateCompatibility {
  const issues: DeviceTemplateIssue[] = [];
  const deviceCategory = resolveUniqueByName(
    project.settings.categories,
    template.device.categoryName,
    'primary device category',
    issues,
  );
  const resolvedInterfaces: ResolvedDeviceTemplateIoInterface[] = [];

  template.ioInterfaces.forEach((ioInterface, index) => {
    const label = `I/O interface "${ioInterface.name}"`;
    const category = resolveUniqueByName(
      project.settings.categories,
      ioInterface.categoryName,
      `${label} category`,
      issues,
    );
    const connector = resolveUniqueByName(
      project.settings.connectorTypes,
      ioInterface.connectorName,
      `${label} connector`,
      issues,
    );

    if (!category || !connector) {
      return;
    }

    const assigned = project.settings.categoryConnectorAssignments.some(
      (assignment) => assignment.categoryId === category.id && assignment.connectorTypeId === connector.id,
    );

    if (!assigned) {
      issues.push({
        code: 'device-template-connector-unassigned',
        path: `$.ioInterfaces[${index}].connectorName`,
        message: `${label} requires connector "${connector.name}", but it is not assigned to category "${category.name}".`,
      });
    }

    const prefix = category.defaultCablePrefix.trim();
    const prefixExists = project.settings.cablePrefixes.some((candidate) => candidate.prefix === prefix);

    if (!prefix || !prefixExists) {
      issues.push({
        code: 'device-template-category-prefix-missing',
        path: `$.ioInterfaces[${index}].categoryName`,
        message: `${label} category "${category.name}" has no configured project cable prefix.`,
      });
    }

    resolvedInterfaces[index] = {
      categoryId: category.id,
      connectorTypeId: connector.id,
      cablePrefix: prefix,
    };
  });

  const completeResolution =
    deviceCategory && resolvedInterfaces.length === template.ioInterfaces.length && issues.length === 0;

  return {
    compatible: Boolean(completeResolution),
    issues,
    resolved: completeResolution
      ? {
          deviceCategoryId: deviceCategory.id,
          ioInterfaces: resolvedInterfaces,
        }
      : null,
  };
}

function resolveUniqueByName<T extends Category | ConnectorType>(
  values: T[],
  requestedName: string,
  label: string,
  issues: DeviceTemplateIssue[],
): T | null {
  const normalized = normalizeTemplateName(requestedName);
  const matches = values.filter((value) => normalizeTemplateName(value.name) === normalized);

  if (matches.length === 1) {
    return matches[0];
  }

  issues.push({
    code: matches.length === 0 ? 'device-template-reference-missing' : 'device-template-reference-ambiguous',
    message:
      matches.length === 0
        ? `Project does not contain ${label} "${requestedName}".`
        : `Project contains multiple matches for ${label} "${requestedName}".`,
  });
  return null;
}
