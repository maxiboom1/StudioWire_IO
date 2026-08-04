import type { ProjectRoot } from '../../domain/types';
import { AddDeviceModal } from '../devices/AddDeviceModal';
import { AddTerminalBlockModal } from '../devices/AddTerminalBlockModal';
import { EditDeviceModal } from '../devices/EditDeviceModal';
import { EditTerminalBlockModal } from '../devices/EditTerminalBlockModal';
import type { SelectedObjectType } from '../common/selection';
import { AddLocationModal } from '../locations/AddLocationModal';
import { AddRackModal } from '../racks/AddRackModal';

export type ObjectModalState =
  | null
  | { type: 'location' }
  | { type: 'rack'; locationId: string }
  | { type: 'device'; locationId: string; sourceDeviceId?: string }
  | { type: 'edit_device'; deviceId: string }
  | { type: 'edit_terminal_block'; deviceId: string }
  | { type: 'terminal_block'; locationId: string | null };

export function StudioWireObjectModals({
  modal,
  project,
  onClose,
  onSubmitted,
}: {
  modal: ObjectModalState;
  project: ProjectRoot;
  onClose: () => void;
  onSubmitted: (type: SelectedObjectType, id: string) => void;
}) {
  if (!modal) {
    return null;
  }

  if (modal.type === 'location') {
    return <AddLocationModal onClose={onClose} onCreated={(id) => onSubmitted('location', id)} />;
  }

  if (modal.type === 'rack') {
    return (
      <AddRackModal
        locationId={modal.locationId}
        onClose={onClose}
        onCreated={(id) => onSubmitted('rack', id)}
      />
    );
  }

  if (modal.type === 'device') {
    return (
      <AddDeviceModal
        initialLocationId={modal.locationId}
        sourceDevice={
          modal.sourceDeviceId ? project.devices.find((device) => device.id === modal.sourceDeviceId) : null
        }
        onClose={onClose}
        onCreated={(id) => onSubmitted('device', id)}
      />
    );
  }

  if (modal.type === 'terminal_block') {
    return (
      <AddTerminalBlockModal
        initialLocationId={modal.locationId}
        onClose={onClose}
        onCreated={(id) => onSubmitted('device', id)}
      />
    );
  }

  const device = project.devices.find((candidate) => candidate.id === modal.deviceId);
  if (!device) {
    return null;
  }

  return modal.type === 'edit_device' ? (
    <EditDeviceModal device={device} onClose={onClose} onSaved={(id) => onSubmitted('device', id)} />
  ) : (
    <EditTerminalBlockModal device={device} onClose={onClose} onSaved={(id) => onSubmitted('device', id)} />
  );
}
