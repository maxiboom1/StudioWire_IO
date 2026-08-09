import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import { getDevicePortLabel, materializeDevicePortLabels, resetDevicePortLabels } from './devicePortLabels';

function fixture() {
  const project = structuredClone(sampleProject);
  const device = project.devices.find((item) => item.id === 'device-router-1')!;
  const group = project.portGroups.find((item) => item.id === 'port-group-router-outputs')!;
  const ports = project.ports
    .filter((port) => port.portGroupId === group.id)
    .sort((left, right) => left.index - right.index);
  return { device, group, ports };
}

describe('device-port presentation labels', () => {
  it('mirrors cable labels when the device pattern is blank and supports a separate pattern', () => {
    const { device, group, ports } = fixture();
    expect(getDevicePortLabel(device, group, ports[0])).toBe('OUT-001');
    expect(getDevicePortLabel(device, { ...group, devicePortLabelPattern: '{0}' }, ports[0])).toBe('1');
  });

  it('freezes every row when one row becomes manual and resets the whole interface', () => {
    const { device, group, ports } = fixture();
    const patterned = { ...group, devicePortLabelPattern: '{0}' };
    const manual = materializeDevicePortLabels(device, patterned, ports, ports[1].id, 'Preview B');
    expect(manual.group.devicePortLabelMode).toBe('manual');
    expect(manual.ports.map((port) => port.devicePortLabelOverride)).toEqual(['1', 'Preview B', '3', '4']);
    expect(
      getDevicePortLabel(device, manual.group, {
        ...manual.ports[0],
        label: 'CHANGED-CABLE-LABEL',
      }),
    ).toBe('1');

    const reset = resetDevicePortLabels(manual.group, manual.ports);
    expect(reset.group.devicePortLabelMode).toBe('pattern');
    expect(reset.ports.every((port) => port.devicePortLabelOverride === null)).toBe(true);
  });
});
