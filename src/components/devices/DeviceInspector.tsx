import type { Device } from '../../domain/types';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { StandardDeviceInspector } from './StandardDeviceInspector';
import { TerminalBlockInspector } from './TerminalBlockInspector';

export type { InspectorDirtyGuard };

export function DeviceInspector({
  device,
  onDirtyGuardChange,
}: {
  device: Device;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  return device.kind === 'terminal_block' ? (
    <TerminalBlockInspector device={device} onDirtyGuardChange={onDirtyGuardChange} />
  ) : (
    <StandardDeviceInspector device={device} onDirtyGuardChange={onDirtyGuardChange} />
  );
}
