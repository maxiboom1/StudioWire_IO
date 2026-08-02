import type { DevicePortGroupDraft, DeviceDraft } from '../../state/projectTypes';

export const DEVICE_TEMPLATE_SCHEMA_VERSION = '0.1.0' as const;

export interface DeviceTemplate {
  templateSchemaVersion: typeof DEVICE_TEMPLATE_SCHEMA_VERSION;
  templateType: 'device';
  device: {
    name: string;
    subName: string;
    manufacturer: string;
    model: string;
    categoryName: string;
    rackSizeRu: number | null;
  };
  ioInterfaces: DeviceTemplateIoInterface[];
}

export interface DeviceTemplateIoInterface {
  name: string;
  direction: 'input' | 'output' | 'bidirectional';
  categoryName: string;
  connectorName: string;
  count: number;
  portLabelPattern: string;
  color: string;
}

export interface DeviceTemplateSourceEntry {
  path: string;
  value: unknown;
}

export interface DeviceTemplateRepository {
  list(): Promise<DeviceTemplateSourceEntry[]>;
}

export interface DeviceTemplateIssue {
  code: string;
  message: string;
  path?: string;
}

export interface DeviceTemplatePathParts {
  manufacturer: string;
  category: string;
  model: string;
  fileName: string;
}

export interface DeviceTemplateCatalogEntry {
  sourcePath: string;
  pathParts: DeviceTemplatePathParts | null;
  template: DeviceTemplate | null;
  issues: DeviceTemplateIssue[];
}

export interface ResolvedDeviceTemplateIoInterface {
  categoryId: string;
  connectorTypeId: string;
  cablePrefix: string;
}

export interface DeviceTemplateCompatibility {
  compatible: boolean;
  issues: DeviceTemplateIssue[];
  resolved: {
    deviceCategoryId: string;
    ioInterfaces: ResolvedDeviceTemplateIoInterface[];
  } | null;
}

export interface DeviceTemplatePortGroupDraft extends DevicePortGroupDraft {
  localId: string;
}

export interface DeviceTemplateFormDraft {
  device: DeviceDraft;
  portGroups: DeviceTemplatePortGroupDraft[];
}

export interface DeviceTemplateExportResult {
  template: DeviceTemplate | null;
  issues: DeviceTemplateIssue[];
  fileName: string | null;
  collectionPath: string | null;
}
