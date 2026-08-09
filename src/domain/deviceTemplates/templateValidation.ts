import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../../schema/studiowire.device-template.schema.json';
import type {
  DeviceTemplate,
  DeviceTemplateIssue,
  DeviceTemplatePathParts,
  DeviceTemplateSourceEntry,
} from './types';
import { DEVICE_TEMPLATE_SCHEMA_VERSION, LEGACY_DEVICE_TEMPLATE_SCHEMA_VERSION } from './types';

const validateTemplateSchema = createTemplateValidator();
const COLLECTION_PREFIX = 'collections/devices/';

export function validateDeviceTemplateSource(source: DeviceTemplateSourceEntry): {
  template: DeviceTemplate | null;
  pathParts: DeviceTemplatePathParts | null;
  issues: DeviceTemplateIssue[];
} {
  const pathParts = parseDeviceTemplatePath(source.path);
  const issues: DeviceTemplateIssue[] = [];

  if (!pathParts) {
    issues.push({
      code: 'device-template-path-invalid',
      path: source.path,
      message:
        'Template path must be collections/devices/<Manufacturer>/<Category>/<Model>/*.studiowire-device.json.',
    });
  }

  if (!validateTemplateSchema(source.value)) {
    issues.push(...(validateTemplateSchema.errors ?? []).map(schemaErrorToIssue));
    return { template: null, pathParts, issues };
  }

  const raw = source.value as unknown as DeviceTemplate;
  const template = normalizeDeviceTemplate(raw, issues);

  if (!template) return { template: null, pathParts, issues };

  if (pathParts) {
    comparePathPart(issues, 'manufacturer', pathParts.manufacturer, template.device.manufacturer);
    comparePathPart(issues, 'category', pathParts.category, template.device.categoryName);
    comparePathPart(issues, 'model', pathParts.model, template.device.model);
  }

  return { template, pathParts, issues };
}

function normalizeDeviceTemplate(
  template: DeviceTemplate,
  issues: DeviceTemplateIssue[],
): DeviceTemplate | null {
  const legacy = template.templateSchemaVersion === LEGACY_DEVICE_TEMPLATE_SCHEMA_VERSION;
  const ioInterfaces = template.ioInterfaces.map((item, index) => {
    const current = item as DeviceTemplate['ioInterfaces'][number] & {
      devicePortLabelPattern?: string | null;
      devicePortLabels?: string[] | null;
    };
    if (!legacy && (!('devicePortLabelPattern' in current) || !('devicePortLabels' in current))) {
      issues.push({
        code: 'device-template-label-shape-invalid',
        path: `$.ioInterfaces[${index}]`,
        message: 'Current templates require Device Port Label Pattern and label mode data.',
      });
    }
    const devicePortLabels = current.devicePortLabels ?? null;
    if (
      devicePortLabels &&
      (devicePortLabels.length !== current.count || devicePortLabels.some((label) => !label.trim()))
    ) {
      issues.push({
        code: 'device-template-manual-label-count-mismatch',
        path: `$.ioInterfaces[${index}].devicePortLabels`,
        message: 'Manual device-port labels must contain one non-empty label per I/O row.',
      });
    }
    return {
      ...current,
      devicePortLabelPattern: current.devicePortLabelPattern?.trim() || null,
      devicePortLabels: devicePortLabels?.map((label) => label.trim()) ?? null,
    };
  });
  if (issues.length > 0) return null;
  return { ...template, templateSchemaVersion: DEVICE_TEMPLATE_SCHEMA_VERSION, ioInterfaces };
}

export function parseDeviceTemplatePath(path: string): DeviceTemplatePathParts | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  const relative = normalized.startsWith(COLLECTION_PREFIX)
    ? normalized.slice(COLLECTION_PREFIX.length)
    : normalized;
  const segments = relative.split('/').filter(Boolean);

  if (segments.length !== 4 || !segments[3].endsWith('.studiowire-device.json')) {
    return null;
  }

  const [manufacturer, category, model, fileName] = segments;

  if (!manufacturer || !category || !model || !fileName) {
    return null;
  }

  return { manufacturer, category, model, fileName };
}

export function normalizeTemplateName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function comparePathPart(
  issues: DeviceTemplateIssue[],
  label: string,
  pathValue: string,
  templateValue: string,
) {
  if (normalizeTemplateName(pathValue) !== normalizeTemplateName(templateValue)) {
    issues.push({
      code: 'device-template-path-mismatch',
      path: `$.device.${label === 'category' ? 'categoryName' : label}`,
      message: `Template ${label} "${templateValue}" does not match collection folder "${pathValue}".`,
    });
  }
}

function schemaErrorToIssue(error: ErrorObject): DeviceTemplateIssue {
  const property =
    error.keyword === 'additionalProperties' ? String(error.params.additionalProperty ?? '') : '';
  const path = `${error.instancePath || '$'}${property ? `/${property}` : ''}`;

  return {
    code: `device-template-schema-${error.keyword}`,
    path,
    message:
      error.keyword === 'additionalProperties' && property
        ? `Property "${property}" is not allowed in a device template.`
        : (error.message ?? 'Device template structure is invalid.'),
  };
}

function createTemplateValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}
