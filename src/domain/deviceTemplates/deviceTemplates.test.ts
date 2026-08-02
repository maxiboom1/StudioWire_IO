import { describe, expect, it } from 'vitest';
import { sampleProject } from '../sampleProject';
import { buildDeviceTemplateCatalog } from './catalog';
import { checkDeviceTemplateCompatibility } from './compatibility';
import { exportDeviceTemplate, serializeDeviceTemplate } from './templateExport';
import { mapDeviceTemplateToFormDraft } from './templateMapping';
import type { DeviceTemplate } from './types';

const template: DeviceTemplate = {
  templateSchemaVersion: '0.1.0',
  templateType: 'device',
  device: {
    name: 'Library Router',
    subName: 'LIB-RTR',
    manufacturer: 'Example Systems',
    model: 'XR-16',
    categoryName: 'video',
    rackSizeRu: 2,
  },
  ioInterfaces: [
    {
      name: 'IN',
      direction: 'input',
      categoryName: ' VIDEO ',
      connectorName: 'bnc',
      count: 2,
      portLabelPattern: '{I/O NAME}-{000}',
      color: '#112233',
    },
    {
      name: 'CTRL',
      direction: 'bidirectional',
      categoryName: 'Network',
      connectorName: 'RJ45',
      count: 1,
      portLabelPattern: 'CTRL-{000}',
      color: '#445566',
    },
  ],
};

describe('device template collection domain', () => {
  it('validates paths, rejects cable allocation properties, and detects duplicate models', () => {
    const path = 'collections/devices/Example Systems/Video/XR-16/xr-16.studiowire-device.json';
    const invalid = structuredClone(template) as unknown as Record<string, unknown>;
    (invalid.ioInterfaces as Array<Record<string, unknown>>)[0].cablePrefix = 'V';

    const catalog = buildDeviceTemplateCatalog([
      { path, value: template },
      { path: path.replace('xr-16.', 'duplicate.'), value: template },
      { path: path.replace('xr-16.', 'invalid.'), value: invalid },
    ]);

    expect(
      catalog.filter((entry) =>
        entry.issues.some((issue) => issue.code === 'device-template-duplicate-model'),
      ),
    ).toHaveLength(2);
    expect(catalog.find((entry) => entry.sourcePath.includes('invalid'))?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'device-template-schema-additionalProperties',
          message: 'Property "cablePrefix" is not allowed in a device template.',
        }),
      ]),
    );
  });

  it('matches category and connector names case-insensitively and reports all mismatches', () => {
    const project = structuredClone(sampleProject);
    const compatible = checkDeviceTemplateCompatibility(project, template);

    expect(compatible.compatible).toBe(true);
    expect(compatible.resolved?.ioInterfaces.map((item) => item.cablePrefix)).toEqual(['V', 'N']);

    const incompatibleTemplate = structuredClone(template);
    incompatibleTemplate.ioInterfaces[0].categoryName = 'Missing Category';
    incompatibleTemplate.ioInterfaces[0].connectorName = 'Missing Connector';
    incompatibleTemplate.ioInterfaces[1].connectorName = 'XLR';
    const incompatible = checkDeviceTemplateCompatibility(project, incompatibleTemplate);

    expect(incompatible.compatible).toBe(false);
    expect(incompatible.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['device-template-reference-missing', 'device-template-connector-unassigned']),
    );
    expect(incompatible.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('maps a compatible template into a fresh first-location Add Device draft', () => {
    const project = structuredClone(sampleProject);
    const compatibility = checkDeviceTemplateCompatibility(project, template);
    let nextId = 0;
    const draft = mapDeviceTemplateToFormDraft(project, template, compatibility, () => `local-${++nextId}`);

    expect(draft?.device).toMatchObject({
      name: 'Library Router',
      code: 'LIB-RTR',
      locationId: project.locations[0].id,
      subLocationId: null,
      rackId: null,
      rackBottomRu: null,
    });
    expect(
      draft?.portGroups.map((group) => ({
        id: group.localId,
        name: group.name,
        prefix: group.cablePrefix,
        color: group.colorOverride,
        first: group.firstCableNumber,
      })),
    ).toEqual([
      { id: 'local-1', name: 'IN', prefix: 'V', color: '#112233', first: expect.any(Number) },
      { id: 'local-2', name: 'CTRL', prefix: 'N', color: '#445566', first: expect.any(Number) },
    ]);
  });

  it('exports semantic hardware data without project IDs, placement, or cable allocations', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((candidate) => candidate.kind === 'device')!;
    const result = exportDeviceTemplate(project, device);

    expect(result.issues).toEqual([]);
    expect(result.collectionPath).toContain('collections/devices/');
    const json = serializeDeviceTemplate(result.template!);
    const forbiddenKeys = [
      'deviceId',
      'categoryId',
      'connectorTypeId',
      'locationId',
      'rackId',
      'cablePrefix',
      'firstCableNumber',
      'lastCableNumber',
      'numberingRangeId',
    ];

    for (const key of forbiddenKeys) {
      expect(json).not.toContain(`"${key}"`);
    }
  });
});
