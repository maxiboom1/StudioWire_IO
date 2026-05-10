import { describe, expect, it } from 'vitest';
import { createNumberingLedger, createTerminalBlock, createTerminalBlockPortGroup } from './projectFactory';
import { sampleProject } from './sampleProject';
import {
  buildTerminalBlockPortLabel,
  createTerminalBlockPortGroupCabling,
  findActiveCablesForEndpoint,
  findRetiredCablesForEndpoint,
  generateTerminalBlockPorts,
  resolveEndpointDisplay,
} from './terminalBlockCables';
import type { Cable, ProjectRoot, TerminalBlock, TerminalBlockPortGroup } from './types';

function createTbProject(mode: TerminalBlockPortGroup['plannedCableMode']): {
  project: ProjectRoot;
  terminalBlock: TerminalBlock;
  portGroup: TerminalBlockPortGroup;
} {
  const project = structuredClone(sampleProject);
  const terminalBlock = createTerminalBlock({
    id: `terminal-block-test-${mode}`,
    name: `Test TB ${mode}`,
    code: `TB-${mode}`,
    manufacturer: '',
    model: '',
    categoryId: 'category-video',
    locationId: 'location-machine-room',
    role: '',
    labelPrefix: 'TB I',
    mountType: 'non_rack',
    status: 'planned',
  });
  const portGroup = createTerminalBlockPortGroup({
    id: `tb-port-group-test-${mode}`,
    terminalBlockId: terminalBlock.id,
    name: `TB ${mode}`,
    categoryId: 'category-video',
    connectorTypeId: 'connector-bnc',
    positionCount: 2,
    startPosition: 1,
    cablePrefix: 'A',
    plannedCableMode: mode,
  });

  project.terminalBlocks.push(terminalBlock);
  project.terminalBlockPortGroups.push(portGroup);
  project.numberingLedgers = [
    ...project.numberingLedgers.filter((ledger) => ledger.prefix !== 'A'),
    createNumberingLedger({ prefix: 'A', nextSuggested: 1 }),
  ];

  return { project, terminalBlock, portGroup };
}

describe('terminal block cable domain helpers', () => {
  it('builds deterministic rear/front labels and ports', () => {
    const { terminalBlock, portGroup } = createTbProject('none');
    const ports = generateTerminalBlockPorts(terminalBlock, portGroup);

    expect(buildTerminalBlockPortLabel(terminalBlock, 1, 'rear')).toBe('TB I-01 rear');
    expect(buildTerminalBlockPortLabel(terminalBlock, 1, 'front')).toBe('TB I-01 front');
    expect(ports).toHaveLength(4);
    expect(ports.map((port) => port.label)).toEqual([
      'TB I-01 rear',
      'TB I-01 front',
      'TB I-02 rear',
      'TB I-02 front',
    ]);
  });

  it('generates no planned cables for plannedCableMode none', () => {
    const { project, terminalBlock, portGroup } = createTbProject('none');
    const result = createTerminalBlockPortGroupCabling(project, terminalBlock, portGroup);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.ports).toHaveLength(4);
      expect(result.cables).toHaveLength(0);
      expect(result.updatedPortGroup.firstCableNumber).toBeNull();
      expect(result.updatedPortGroup.lastCableNumber).toBeNull();
      expect(result.project.numberingLedgers.find((ledger) => ledger.prefix === 'A')?.nextSuggested).toBe(1);
    }
  });

  it('generates planned rear face cables in one ledger allocation', () => {
    const { project, terminalBlock, portGroup } = createTbProject('rear');
    const result = createTerminalBlockPortGroupCabling(project, terminalBlock, portGroup);

    expect(result.ok).toBe(true);

    if (result.ok) {
      const ledger = result.project.numberingLedgers.find((item) => item.prefix === 'A');

      expect(result.cables.map((cable) => cable.number)).toEqual(['A-0001', 'A-0002']);
      expect(result.cables.every((cable) => cable.sourceEndpoint.type === 'tb_port')).toBe(true);
      expect(result.cables.every((cable) => cable.destinationEndpoint.type === 'unknown')).toBe(true);
      expect(ledger?.ranges).toHaveLength(1);
      expect(ledger?.ranges[0]).toMatchObject({ from: 1, to: 2, ownerType: 'terminalBlockPortGroup' });
    }
  });

  it('generates planned front face cables in one ledger allocation', () => {
    const { project, terminalBlock, portGroup } = createTbProject('front');
    const result = createTerminalBlockPortGroupCabling(project, terminalBlock, portGroup);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.cables.map((cable) => cable.number)).toEqual(['A-0001', 'A-0002']);
      expect(result.cables.map((cable) => cable.sourceEndpoint.label)).toEqual(['TB I-01 front', 'TB I-02 front']);
      expect(result.project.numberingLedgers.find((item) => item.prefix === 'A')?.ranges).toHaveLength(1);
    }
  });

  it('generates planned both-face cables using two atomic range allocations', () => {
    const { project, terminalBlock, portGroup } = createTbProject('both');
    const result = createTerminalBlockPortGroupCabling(project, terminalBlock, portGroup);

    expect(result.ok).toBe(true);

    if (result.ok) {
      const ledger = result.project.numberingLedgers.find((item) => item.prefix === 'A');

      expect(result.cables.map((cable) => cable.number)).toEqual(['A-0001', 'A-0002', 'A-0003', 'A-0004']);
      expect(result.cables.map((cable) => cable.sourceEndpoint.label)).toEqual([
        'TB I-01 rear',
        'TB I-02 rear',
        'TB I-01 front',
        'TB I-02 front',
      ]);
      expect(ledger?.ranges).toHaveLength(2);
      expect(ledger?.ranges.map((range) => [range.from, range.to])).toEqual([
        [1, 2],
        [3, 4],
      ]);
      expect(ledger?.nextSuggested).toBe(5);
    }
  });

  it('leaves the original project unchanged when TB cable allocation fails', () => {
    const { project, terminalBlock, portGroup } = createTbProject('both');
    project.numberingLedgers.find((ledger) => ledger.prefix === 'A')?.ranges.push({
      id: 'range-a-existing',
      prefix: 'A',
      from: 1,
      to: 1,
      status: 'allocated',
      ownerType: 'test',
      ownerId: 'test',
      reason: 'Existing allocation',
      createdAt: '2026-05-10T00:00:00.000Z',
    });
    const originalLedger = structuredClone(project.numberingLedgers.find((ledger) => ledger.prefix === 'A'));
    const result = createTerminalBlockPortGroupCabling(project, terminalBlock, portGroup, 1);

    expect(result.ok).toBe(false);
    expect(project.numberingLedgers.find((ledger) => ledger.prefix === 'A')).toEqual(originalLedger);
  });

  it('resolves device and terminal block endpoint display metadata', () => {
    const project = structuredClone(sampleProject);
    const devicePort = project.ports[0];
    const tbPort = project.terminalBlockPorts[0];

    const deviceEndpoint = resolveEndpointDisplay(project, {
      type: 'device_port',
      id: devicePort.id,
      label: devicePort.label,
    });
    const tbEndpoint = resolveEndpointDisplay(project, {
      type: 'tb_port',
      id: tbPort.id,
      label: tbPort.label,
    });

    expect(deviceEndpoint).toMatchObject({
      endpointType: 'device_port',
      objectType: 'device',
      objectName: 'Router 1',
      portLabel: devicePort.label,
      face: null,
    });
    expect(tbEndpoint).toMatchObject({
      endpointType: 'tb_port',
      objectType: 'terminalBlock',
      objectName: 'MCR BNC TB 1',
      portLabel: tbPort.label,
      face: tbPort.face,
    });
  });

  it('does not count retired cables as active endpoint occupancy', () => {
    const project = structuredClone(sampleProject);
    const tbPort = project.terminalBlockPorts[0];
    const activeCable = createCable('cable-active-tb', 'A-0100', tbPort.id, tbPort.label, 'planned');
    const retiredCable = createCable('cable-retired-tb', 'A-0101', tbPort.id, tbPort.label, 'retired');
    const endpoint = { type: 'tb_port' as const, id: tbPort.id, label: tbPort.label };

    project.cables.push(activeCable, retiredCable);

    expect(findActiveCablesForEndpoint(project, endpoint).map((cable) => cable.id)).toEqual([activeCable.id]);
    expect(findRetiredCablesForEndpoint(project, endpoint).map((cable) => cable.id)).toEqual([retiredCable.id]);
  });
});

function createCable(
  id: string,
  number: string,
  tbPortId: string,
  tbPortLabel: string,
  status: Cable['status'],
): Cable {
  const index = Number(number.split('-')[1]);

  return {
    id,
    number,
    prefix: number.split('-')[0],
    index,
    status,
    sourceEndpoint: { type: 'tb_port', id: tbPortId, label: tbPortLabel },
    destinationEndpoint: { type: 'unknown', id: null, label: 'Unknown' },
    labelTop: tbPortLabel,
    labelMiddle: number,
    labelBottom: '',
    notes: '',
  };
}
