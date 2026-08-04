import {
  describePortConnection,
  type PortConnectionChainPart,
  type PortConnectionSummary,
} from '../../domain/connections';
import { getOrderedDevicePortColumns } from '../../domain/devicePortLayout';
import type { Device, Port, PortDirection, ProjectRoot } from '../../domain/types';
import { getPortGroupColor, getPortGroupConnectorIconKey } from '../common/connectorVisuals';

export interface DevicePortPresentation {
  port: Port;
  side: 'left' | 'right';
  direction: PortDirection;
  connection: PortConnectionSummary;
  accentColor: string;
  iconKey: string;
  cableNumbers: string[];
  terminalBlockMarker: Extract<PortConnectionChainPart, { type: 'terminal_block' }> | null;
  remoteLabel: string;
}

export interface DevicePortRowSlot {
  left?: DevicePortPresentation;
  right?: DevicePortPresentation;
}

export interface DevicePresentationModel {
  device: Device;
  rows: DevicePortRowSlot[];
  rowCount: number;
}

export interface TerminalBlockPortPair {
  index: number;
  rear: DevicePortPresentation | null;
  front: DevicePortPresentation | null;
}

export interface TerminalBlockPresentationModel {
  device: Device;
  pairs: TerminalBlockPortPair[];
  rowCount: number;
}

export function buildDevicePresentationModel(project: ProjectRoot, device: Device): DevicePresentationModel {
  const columns = getOrderedDevicePortColumns(project, device);
  const left = columns.left.map((port) => buildPortPresentation(project, port, 'left'));
  const right = columns.right.map((port) => buildPortPresentation(project, port, 'right'));
  const rowCount = Math.max(left.length, right.length, 1);

  return {
    device,
    rowCount,
    rows: Array.from({ length: rowCount }, (_, index) => ({
      left: left[index],
      right: right[index],
    })),
  };
}

export function buildTerminalBlockPresentationModel(
  project: ProjectRoot,
  device: Device,
): TerminalBlockPresentationModel {
  const columns = getOrderedDevicePortColumns(project, device);
  const rowCount = Math.max(columns.left.length, columns.right.length, 1);

  return {
    device,
    rowCount,
    pairs: Array.from({ length: rowCount }, (_, index) => ({
      index: index + 1,
      rear: columns.left[index] ? buildPortPresentation(project, columns.left[index], 'left') : null,
      front: columns.right[index] ? buildPortPresentation(project, columns.right[index], 'right') : null,
    })),
  };
}

function buildPortPresentation(
  project: ProjectRoot,
  port: Port,
  side: 'left' | 'right',
): DevicePortPresentation {
  const group = project.portGroups.find((candidate) => candidate.id === port.portGroupId);
  const connection = describePortConnection(project, port.id);
  const terminalBlockMarker =
    connection.chainParts.find(
      (part): part is Extract<PortConnectionChainPart, { type: 'terminal_block' }> =>
        part.type === 'terminal_block',
    ) ?? null;

  return {
    port,
    side,
    direction: port.direction,
    connection,
    accentColor: group ? getPortGroupColor(project, group) : '#64748B',
    iconKey: group ? getPortGroupConnectorIconKey(project, group) : 'generic',
    cableNumbers: [connection.cable?.number, terminalBlockMarker?.continuationCable?.number].filter(
      (number): number is string => Boolean(number),
    ),
    terminalBlockMarker,
    remoteLabel: getRemoteChainLabel(connection.chainParts),
  };
}

function getRemoteChainLabel(parts: PortConnectionChainPart[]) {
  const labels = parts
    .filter((part): part is Extract<PortConnectionChainPart, { type: 'port' }> => part.type === 'port')
    .map((part) => part.label);

  return labels.at(-1) ?? '';
}
