import type { Device, ProjectRoot } from '../types';
import type { DeviceTemplate, DeviceTemplateExportResult, DeviceTemplateIssue } from './types';
import { DEVICE_TEMPLATE_SCHEMA_VERSION } from './types';

export function exportDeviceTemplate(project: ProjectRoot, device: Device): DeviceTemplateExportResult {
  const issues: DeviceTemplateIssue[] = [];
  const manufacturer = device.manufacturer?.trim() ?? '';
  const model = device.model?.trim() ?? '';
  const primaryCategory = project.settings.categories.find((category) => category.id === device.categoryId);
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);

  if (device.kind !== 'device') {
    issues.push({ code: 'device-template-export-kind', message: 'Only standard devices can be exported.' });
  }
  if (!manufacturer) {
    issues.push({ code: 'device-template-export-manufacturer', message: 'Manufacturer is required.' });
  }
  if (!model) {
    issues.push({ code: 'device-template-export-model', message: 'Device model is required.' });
  }
  if (!primaryCategory) {
    issues.push({ code: 'device-template-export-category', message: 'Primary device category is missing.' });
  }
  if (portGroups.length === 0) {
    issues.push({ code: 'device-template-export-io', message: 'At least one I/O interface is required.' });
  }

  const ioInterfaces = portGroups.flatMap((group, index) => {
    const category = project.settings.categories.find((candidate) => candidate.id === group.categoryId);
    const connector = project.settings.connectorTypes.find(
      (candidate) => candidate.id === group.connectorTypeId,
    );

    if (!category) {
      issues.push({
        code: 'device-template-export-io-category',
        message: `I/O interface ${index + 1} references a missing category.`,
      });
    }
    if (!connector) {
      issues.push({
        code: 'device-template-export-io-connector',
        message: `I/O interface ${index + 1} references a missing connector.`,
      });
    }
    if (!group.name.trim() || !group.portLabelPattern.trim() || group.count < 1) {
      issues.push({
        code: 'device-template-export-io-invalid',
        message: `I/O interface ${index + 1} has invalid name, pattern, or count data.`,
      });
    }

    if (!category || !connector) {
      return [];
    }

    return [
      {
        name: group.name,
        direction: group.direction as 'input' | 'output' | 'bidirectional',
        categoryName: category.name,
        connectorName: connector.name,
        count: group.count,
        portLabelPattern: group.portLabelPattern,
        color: group.colorOverride ?? category.color,
      },
    ];
  });

  if (issues.length > 0 || !primaryCategory) {
    return { template: null, issues, fileName: null, collectionPath: null };
  }

  const fileName = `${toSafeFilePart(manufacturer)}-${toSafeFilePart(model)}.studiowire-device.json`;
  const collectionPath = ['collections', 'devices', manufacturer, primaryCategory.name, model, fileName].join(
    '/',
  );
  const template: DeviceTemplate = {
    templateSchemaVersion: DEVICE_TEMPLATE_SCHEMA_VERSION,
    templateType: 'device',
    device: {
      name: device.name,
      subName: device.code ?? '',
      manufacturer,
      model,
      categoryName: primaryCategory.name,
      rackSizeRu: device.rackSizeRu,
    },
    ioInterfaces,
  };

  return { template, issues: [], fileName, collectionPath };
}

export function serializeDeviceTemplate(template: DeviceTemplate): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

function toSafeFilePart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'device'
  );
}
