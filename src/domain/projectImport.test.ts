import { describe, expect, it } from 'vitest';
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
        path: '$.settings.connectorTypes[17]',
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

  it('supports the current schema, prior View stage, and retained 0.2.8.25 baseline', () => {
    expect(SUPPORTED_SCHEMA_VERSIONS).toEqual([
      STUDIOWIRE_CURRENT_VERSION,
      '0.2.9.01',
      '0.2.9.00',
      '0.2.8.25',
    ]);

    const project = currentProject();
    project.schemaVersion = '0.2.8.10';

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'unsupported-schema-version',
        path: '$.schemaVersion',
      });
    }
  });

  it('migrates 0.2.8.25 by adding only an empty Views collection', () => {
    const project = currentProject();
    delete project.views;
    project.schemaVersion = '0.2.8.25';
    const engineeringBefore = structuredClone(project);

    const result = importProjectValue(project);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
      expect(result.project.views).toEqual([]);
      const { schemaVersion: _beforeVersion, ...beforeData } = engineeringBefore;
      const { schemaVersion: _afterVersion, views: _views, ...afterData } = result.project;
      expect(afterData).toEqual(beforeData);
    }
  });

  it('imports 0.2.9.00 through an identity migration without changing project data', () => {
    const project = currentProject();
    project.schemaVersion = '0.2.9.00';
    const before = structuredClone(project);

    const result = importProjectValue(project);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
      const { schemaVersion: _beforeVersion, ...beforeData } = before;
      const { schemaVersion: _afterVersion, ...afterData } = result.project;
      expect(afterData).toEqual(beforeData);
    }
  });

  it('imports 0.2.9.01 through an identity migration without changing project data', () => {
    const project = currentProject();
    project.schemaVersion = '0.2.9.01';
    const before = structuredClone(project);

    const result = importProjectValue(project);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
      const { schemaVersion: _beforeVersion, ...beforeData } = before;
      const { schemaVersion: _afterVersion, ...afterData } = result.project;
      expect(afterData).toEqual(beforeData);
    }
  });

  it('requires Views on current files and round-trips exact View layout data', () => {
    const missingViews = currentProject();
    delete missingViews.views;
    const missingResult = importProjectValue(missingViews);

    expect(missingResult.ok).toBe(false);
    if (!missingResult.ok) {
      expect(missingResult.errors).toContainEqual(
        expect.objectContaining({ code: 'schema-required', path: '$.views' }),
      );
    }

    const project = currentProject();
    project.views = [
      {
        id: 'view-roundtrip',
        name: 'Signal Overview',
        description: 'Exact persistence contract',
        pageSize: 'a3',
        orientation: 'landscape',
        placements: [
          {
            id: 'placement-router',
            sourceType: 'device',
            sourceId: 'device-router-1',
            xMm: 12.5,
            yMm: 22.5,
            scale: 0.75,
            labelOverride: 'Main router',
          },
          {
            id: 'placement-missing',
            sourceType: 'rack',
            sourceId: 'rack-missing',
            xMm: 200,
            yMm: 30,
            scale: 1,
            labelOverride: null,
          },
        ],
        lines: [
          {
            id: 'line-roundtrip',
            from: { placementId: 'placement-router', side: 'right', offset: 0.25 },
            to: { placementId: 'placement-missing', side: 'left', offset: 0.75 },
            label: '12 x SDI',
            waypoints: [{ xMm: 130, yMm: 42.5 }],
          },
        ],
        annotations: [
          {
            id: 'annotation-text',
            kind: 'text',
            xMm: 10,
            yMm: 8,
            widthMm: 80,
            text: 'VIDEO CORE',
            size: 'large',
          },
          {
            id: 'annotation-group',
            kind: 'group',
            xMm: 5,
            yMm: 5,
            widthMm: 250,
            heightMm: 100,
            label: 'Core',
          },
        ],
      },
    ];

    const result = importProjectJsonText(JSON.stringify(project));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.views).toEqual(project.views);
      expect(result.validationIssues).toContainEqual(
        expect.objectContaining({ code: 'view-placement-rack-missing', objectId: 'view-roundtrip' }),
      );
    }
  });

  it('strictly validates required View fields, closed properties, enums, and geometry bounds', () => {
    const baseView = {
      id: 'view-structural',
      name: 'Structural View',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [
        {
          id: 'placement-structural',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 0,
          yMm: 0,
          scale: 1,
          labelOverride: null,
        },
      ],
      lines: [],
      annotations: [],
    };
    const cases: Array<[string, (view: any) => void]> = [
      ['$.views[0].pageSize', (view) => (view.pageSize = 'letter')],
      ['$.views[0].placements[0].scale', (view) => (view.placements[0].scale = 3.01)],
      ['$.views[0].placements[0].labelOverride', (view) => delete view.placements[0].labelOverride],
      ['$.views[0].unexpected', (view) => (view.unexpected = true)],
    ];

    for (const [path, mutate] of cases) {
      const project = currentProject();
      const view = structuredClone(baseView);
      mutate(view);
      project.views = [view];
      const result = importProjectValue(project);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.path === path)).toBe(true);
      }
    }
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
