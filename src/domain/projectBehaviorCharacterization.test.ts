import { describe, expect, it } from 'vitest';
import { importProjectValue } from './projectImport';
import { sampleProject } from './sampleProject';
import { validateProject } from './validators';
import { projectReducer, type ProjectState } from '../state/projectReducer';

function createState(): ProjectState {
  return {
    project: structuredClone(sampleProject),
    statusMessage: 'ready',
    importError: null,
  };
}

describe('project behavior characterization', () => {
  it('keeps validation issue ordering and public issue fields stable across aggregate rules', () => {
    const project = structuredClone(sampleProject);

    project.settings.cablePrefixes.push({ id: 'prefix-v-copy', prefix: 'V', name: 'Video Copy' });
    project.cables[0].number = 'BAD';
    project.locations[1].name = project.locations[0].name;
    project.devices[1].rackId = 'rack-missing';
    project.portGroups[0].count += 1;
    project.numberingLedgers[0].nextSuggested = 4;

    const issues = validateProject(project).map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      objectType: issue.objectType,
      objectId: issue.objectId,
    }));

    expect(issues).toMatchObject([
      {
        severity: 'error',
        code: 'duplicate-cable-prefix-value',
        objectType: 'cablePrefix',
        objectId: 'prefix-video',
      },
      {
        severity: 'error',
        code: 'duplicate-cable-prefix-value',
        objectType: 'cablePrefix',
        objectId: 'prefix-v-copy',
      },
      {
        severity: 'error',
        code: 'planned-cable-label-middle-mismatch',
        objectType: 'cable',
        objectId: 'cable-v-0001',
      },
      {
        severity: 'error',
        code: 'cable-number-format-invalid',
        objectType: 'cable',
        objectId: 'cable-v-0001',
      },
      {
        severity: 'error',
        code: 'planned-cable-label-middle-mismatch',
        objectType: 'cable',
        objectId: 'cable-v-0001',
      },
      {
        severity: 'warning',
        code: 'duplicate-location-name',
        objectType: 'location',
        objectId: 'location-control-room',
      },
      {
        severity: 'warning',
        code: 'duplicate-location-name',
        objectType: 'location',
        objectId: 'location-machine-room',
      },
      {
        severity: 'error',
        code: 'port-group-count-mismatch',
        objectType: 'portGroup',
        objectId: 'port-group-router-outputs',
      },
      {
        severity: 'error',
        code: 'port-group-planned-cable-count-mismatch',
        objectType: 'portGroup',
        objectId: 'port-group-router-outputs',
      },
      {
        severity: 'error',
        code: 'ledger-next-suggested-after-ranges',
        objectType: 'numberingLedger',
        objectId: 'V',
      },
    ]);
    expect(issues.map((issue) => issue.code)).toContain('port-group-count-mismatch');
    expect(issues.map((issue) => issue.code)).toContain('ledger-next-suggested-after-ranges');
  });

  it('migrates without mutating the imported payload object', () => {
    const legacyProject = structuredClone(sampleProject) as any;
    legacyProject.schemaVersion = '0.1.0';
    legacyProject.cables = legacyProject.cables.map((cable: any) => {
      const { sideAEndpoint, sideBEndpoint, ...legacyCable } = cable;

      return {
        ...legacyCable,
        sourceEndpoint: sideAEndpoint,
        destinationEndpoint: sideBEndpoint,
      };
    });
    const before = JSON.stringify(legacyProject);

    const result = importProjectValue(legacyProject);

    expect(result.ok).toBe(true);
    expect(JSON.stringify(legacyProject)).toBe(before);
  });

  it('keeps reducer action status messages and import failure state stable', () => {
    const state = createState();

    const failedImport = projectReducer(state, {
      type: 'IMPORT_PROJECT_FAILED',
      payload: { message: '$.schemaVersion: Unsupported schemaVersion.' },
    });
    const validated = projectReducer(state, { type: 'VALIDATE_PROJECT' });

    expect(failedImport.project).toBe(state.project);
    expect(failedImport.statusMessage).toBe('Import failed');
    expect(failedImport.importError).toBe('$.schemaVersion: Unsupported schemaVersion.');
    expect(validated.statusMessage).toBe('Validation passed');
    expect(validated.project.validationIssues.map((issue) => issue.code)).toEqual([]);
  });
});
