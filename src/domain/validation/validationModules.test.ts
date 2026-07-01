import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../projectFactory';
import { sampleProject } from '../sampleProject';
import { validateCables } from './cablesConnections';
import { validatePortsAndGroups } from './devicesPorts';
import { validateDevices, validateLocationsAndRacks } from './locationsRacks';
import { validateLedgerRanges, validateReservedGapReuse } from './numberingLedger';
import { validateDuplicateIds, validateSettings } from './projectSettings';
import { validateReferences } from './references';
import { buildValidationContext, createIssueBuilder } from './shared';

function codes(project = structuredClone(sampleProject)) {
  const context = buildValidationContext(project);
  const issue = createIssueBuilder();

  return {
    context,
    issue,
    project,
    settings: () => validateSettings(project, issue).map((item) => item.code),
    duplicateIds: () => validateDuplicateIds(project, issue).map((item) => item.code),
    cables: () => validateCables(project, context.ports, issue).map((item) => item.code),
    references: () =>
      validateReferences(
        project,
        context.categories,
        context.connectorTypes,
        context.categoryConnectorAssignments,
        context.cablePrefixes,
        issue,
      ).map((item) => item.code),
    locationsRacks: () =>
      validateLocationsAndRacks(project, context.locations, issue).map((item) => item.code),
    devices: () => validateDevices(project, context.locations, context.racks, issue).map((item) => item.code),
    portsAndGroups: () =>
      validatePortsAndGroups(project, context.devices, context.portGroups, issue).map((item) => item.code),
    ledgerRanges: () => validateLedgerRanges(project, context.cablePrefixes, issue).map((item) => item.code),
    reservedGaps: () => validateReservedGapReuse(project, issue).map((item) => item.code),
  };
}

describe('validation aggregate modules', () => {
  it('validates settings independently', () => {
    const subject = codes();
    subject.project.settings.cablePrefixes.push({ id: 'prefix-copy', prefix: 'V', name: 'Video Copy' });

    expect(subject.settings()).toContain('duplicate-cable-prefix-value');
  });

  it('validates duplicate IDs independently', () => {
    const project = createEmptyProject({ id: 'project-duplicate-test', name: 'Duplicate Test' });
    project.locations.push({
      id: project.project.id,
      name: 'Duplicate',
      type: '',
      description: '',
    });
    const subject = codes(project);

    expect(subject.duplicateIds()).toEqual(['duplicate-object-id']);
  });

  it('validates cables and connected endpoints independently', () => {
    const subject = codes();
    subject.project.cables[0].number = 'BAD';

    expect(subject.cables()).toContain('cable-number-format-invalid');
  });

  it('validates cross-object references independently', () => {
    const subject = codes();
    subject.project.portGroups[0].connectorTypeId = 'connector-missing';

    expect(subject.references()).toContain('unknown-connector-type');
  });

  it('validates locations and racks independently', () => {
    const subject = codes();
    subject.project.locations[1].name = subject.project.locations[0].name;

    expect(subject.locationsRacks()).toEqual(['duplicate-location-name', 'duplicate-location-name']);
  });

  it('validates devices independently', () => {
    const subject = codes();
    const device = subject.project.devices.find((item) => item.id === 'device-router-1');

    if (!device) {
      throw new Error('Expected sample router device');
    }
    device.rackId = 'rack-missing';

    expect(subject.devices()).toContain('device-references-missing-rack');
  });

  it('validates port groups and terminal block ports independently', () => {
    const subject = codes();
    subject.project.portGroups[0].count += 1;

    expect(subject.portsAndGroups()).toContain('port-group-count-mismatch');
  });

  it('validates numbering ledgers independently', () => {
    const subject = codes();
    subject.project.numberingLedgers[0].nextSuggested = 4;

    expect(subject.ledgerRanges()).toContain('ledger-next-suggested-available');
  });

  it('validates reserved gap reuse independently', () => {
    const subject = codes();
    subject.project.cables[0] = {
      ...subject.project.cables[0],
      number: 'V-0005',
      index: 5,
    };

    expect(subject.reservedGaps()).toContain('reserved-gap-reused');
  });
});
