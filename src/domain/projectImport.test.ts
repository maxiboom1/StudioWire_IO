import { describe, expect, it } from 'vitest';
import { MIGRATION_STEPS } from './import/migrations';
import { importProjectJsonText, importProjectValue, parseImportedProject } from './projectImport';
import { sampleProject } from './sampleProject';
import { STUDIOWIRE_CURRENT_VERSION, SUPPORTED_SCHEMA_VERSIONS } from './version';

function currentProject() {
  return structuredClone(sampleProject) as any;
}

describe('importProjectValue structural safety', () => {
  it('rejects syntactically valid JSON with null entries in settings arrays', () => {
    const project = currentProject();
    project.settings.connectorTypes.push(null);

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'schema-type',
        path: '$.settings.connectorTypes[16]',
      });
    }
  });

  it('reports path-specific errors for wrong primitive fields across project collections', () => {
    const cases: Array<[string, (project: any) => void, string]> = [
      ['category', (project) => (project.settings.categories[0].name = 1), '$.settings.categories[0].name'],
      [
        'connector',
        (project) => (project.settings.connectorTypes[0].name = 1),
        '$.settings.connectorTypes[0].name',
      ],
      ['location', (project) => (project.locations[0].name = 1), '$.locations[0].name'],
      ['rack', (project) => (project.racks[0].heightRu = '42'), '$.racks[0].heightRu'],
      ['device', (project) => (project.devices[0].status = 1), '$.devices[0].status'],
      ['port', (project) => (project.ports[0].index = '1'), '$.ports[0].index'],
      ['cable', (project) => (project.cables[0].status = 1), '$.cables[0].status'],
      [
        'numbering ledger',
        (project) => (project.numberingLedgers[0].nextSuggested = '1'),
        '$.numberingLedgers[0].nextSuggested',
      ],
      [
        'validation issue',
        (project) => (project.validationIssues[0] = { ...project.validationIssues[0], severity: 1 }),
        '$.validationIssues[0].severity',
      ],
      ['change log', (project) => (project.changeLog[0].message = 1), '$.changeLog[0].message'],
    ];

    for (const [, mutate, expectedPath] of cases) {
      const project = currentProject();
      mutate(project);
      const result = importProjectValue(project);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.path === expectedPath)).toBe(true);
      }
    }
  });

  it('rejects numbering ledgers with missing or malformed ranges', () => {
    const missing = currentProject();
    delete missing.numberingLedgers[0].ranges;
    const malformed = currentProject();
    malformed.numberingLedgers[0].ranges = [null];

    for (const project of [missing, malformed]) {
      const result = importProjectValue(project);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].path).toContain('$.numberingLedgers[0].ranges');
      }
    }
  });

  it('rejects invalid enum-like fields', () => {
    const cases: Array<[string, (project: any) => void, string]> = [
      ['project status', (project) => (project.project.status = 'live'), '$.project.status'],
      ['device status', (project) => (project.devices[0].status = 'active'), '$.devices[0].status'],
      ['cable status', (project) => (project.cables[0].status = 'active'), '$.cables[0].status'],
      ['port direction', (project) => (project.ports[0].direction = 'sideways'), '$.ports[0].direction'],
      ['device kind', (project) => (project.devices[0].kind = 'rack'), '$.devices[0].kind'],
      ['mount type', (project) => (project.devices[0].mountType = 'wall'), '$.devices[0].mountType'],
      [
        'rack direction',
        (project) => (project.racks[0].numberingDirection = 'left_to_right'),
        '$.racks[0].numberingDirection',
      ],
      [
        'endpoint type',
        (project) => (project.cables[0].sideAEndpoint.type = 'port'),
        '$.cables[0].sideAEndpoint.type',
      ],
      [
        'range status',
        (project) => (project.numberingLedgers[0].ranges[0].status = 'used'),
        '$.numberingLedgers[0].ranges[0].status',
      ],
      [
        'severity',
        (project) =>
          (project.validationIssues = [
            { id: 'v', severity: 'fatal', code: 'x', message: '', objectType: '', objectId: '' },
          ]),
        '$.validationIssues[0].severity',
      ],
    ];

    for (const [, mutate, expectedPath] of cases) {
      const project = currentProject();
      mutate(project);
      const result = importProjectValue(project);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.path === expectedPath)).toBe(true);
      }
    }
  });

  it('rejects forbidden additional properties', () => {
    const project = currentProject();
    project.devices[0].unexpected = true;

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.path === '$.devices[0].unexpected')).toBe(true);
    }
  });

  it('rejects current-version legacy cable endpoint properties without normalizing them away', () => {
    const project = currentProject();
    const { sideAEndpoint, sideBEndpoint, ...legacyCable } = project.cables[0];
    project.cables[0] = {
      ...legacyCable,
      sourceEndpoint: sideAEndpoint,
      destinationEndpoint: sideBEndpoint,
    };

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'schema-additional-property',
          path: '$.cables[0].sourceEndpoint',
        }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'schema-additional-property',
          path: '$.cables[0].destinationEndpoint',
        }),
      );
    }
  });

  it('rejects current-version terminal block standard-device metadata without cleanup', () => {
    const project = currentProject();
    const terminalBlock = {
      id: 'device-tb-strict-import',
      name: 'TB Strict Import',
      kind: 'terminal_block',
      code: 'TB',
      manufacturer: 'Legacy',
      model: 'Legacy Model',
      categoryId: 'category-video',
      locationId: 'location-machine-room',
      role: 'Legacy Role',
      labelPrefix: 'TB',
      mountType: 'rack',
      rackId: 'rack-mcr-a',
      rackSizeRu: 1,
      rackBottomRu: 1,
      status: 'planned',
      notes: '',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
    };
    project.devices.push(terminalBlock);

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'schema-forbidden-property', path: '$.devices[2].code' }),
          expect.objectContaining({
            code: 'schema-forbidden-property',
            path: '$.devices[2].manufacturer',
          }),
          expect.objectContaining({ code: 'schema-forbidden-property', path: '$.devices[2].model' }),
          expect.objectContaining({ code: 'schema-forbidden-property', path: '$.devices[2].role' }),
        ]),
      );
    }
  });

  it('reports a missing current settings array as a required schema error at the exact path', () => {
    const project = currentProject();
    delete project.settings.connectorTypes;

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'schema-required',
          path: '$.settings.connectorTypes',
        }),
      );
      expect(result.error).not.toContain('import-exception');
    }
  });

  it('rejects nested current-version additional properties at the exact path', () => {
    const project = currentProject();
    project.settings.connectorTypes[0].legacyNested = true;

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'schema-additional-property',
          path: '$.settings.connectorTypes[0].legacyNested',
        }),
      );
    }
  });

  it('migrates every supported schema version to the current version', () => {
    for (const version of SUPPORTED_SCHEMA_VERSIONS) {
      const project = currentProject();
      project.schemaVersion = version;
      const result = importProjectValue(project);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
      }
    }
  });

  it('declares the previous release migration step explicitly', () => {
    expect(MIGRATION_STEPS).toContainEqual(
      expect.objectContaining({
        from: '0.2.8.2',
        to: STUDIOWIRE_CURRENT_VERSION,
      }),
    );
  });

  it('returns controlled syntax errors for invalid JSON text', () => {
    const result = importProjectJsonText('{');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe('json-syntax');
    }
  });

  it('rejects non-object imports before structural validation', () => {
    const result = importProjectValue(null);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'project-root-not-object',
        path: '$',
      });
    }
  });

  it('formats unsupported schema versions through the legacy parse helper', () => {
    const project = currentProject();
    project.schemaVersion = '9.9.9';

    const result = parseImportedProject(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unsupported schemaVersion');
    }
  });
});
