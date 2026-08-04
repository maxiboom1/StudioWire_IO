import { type FormEvent, useState } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { HorizontalTabs } from '../common/AppTabs';
import { useConfirmation } from '../common/ConfirmationDialog';
import { FieldLabel } from '../common/FieldLabel';
import { ModalFrame } from '../common/ModalFrame';
import { RACK_RU_OPTIONS } from '../common/rackRuOptions';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PortGroupEditor } from './PortGroupEditor';
import { SubLocationSelect } from './SubLocationSelect';
import { useEditDeviceForm } from './useEditDeviceForm';

export function EditDeviceModal({
  device,
  onClose,
  onSaved,
}: {
  device: Device;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { project, editDevice } = useProject();
  const confirm = useConfirmation();
  const [activeTab, setActiveTab] = useState<'general' | 'io'>('general');
  const form = useEditDeviceForm({
    device,
    editDevice,
    onSaved,
    project,
  });
  const [expandedInterfaceIds, setExpandedInterfaceIds] = useState<Set<string>>(() => new Set());
  const [draggingInterfaceId, setDraggingInterfaceId] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(confirm);
  }

  function toggleInterfaceCollapsed(localId: string) {
    setExpandedInterfaceIds((current) => {
      const next = new Set(current);

      if (next.has(localId)) {
        next.delete(localId);
      } else {
        next.add(localId);
      }

      return next;
    });
  }

  function dropInterface(targetLocalId: string) {
    if (draggingInterfaceId) {
      form.moveInterface(draggingInterfaceId, targetLocalId);
    }

    setDraggingInterfaceId(null);
  }

  return (
    <ModalFrame
      title="Edit Device"
      description="Edit device metadata, relabel existing interfaces, and add new interfaces."
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form add-device-form" onSubmit={handleSubmit}>
        <HorizontalTabs
          activeTab={activeTab}
          ariaLabel="Device edit sections"
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'io', label: 'I/O' },
          ]}
          onTabChange={setActiveTab}
        />
        <div className="standard-modal-content device-modal-tab-content">
          {activeTab === 'general' ? (
            <section className="modal-section device-modal-tab-panel">
              <div className="form-grid two">
                <div className="form-field">
                  <FieldLabel helper="appear as device header" htmlFor="edit-device-name">
                    Device Name
                  </FieldLabel>
                  <Input
                    autoFocus
                    id="edit-device-name"
                    required
                    value={form.device.name}
                    onChange={(event) => form.setDevice({ name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel helper="appear as device 2nd line header" htmlFor="edit-device-code">
                    Device sub-name
                  </FieldLabel>
                  <Input
                    id="edit-device-code"
                    value={form.device.code}
                    onChange={(event) => form.setDevice({ code: event.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="edit-device-manufacturer">Manufacturer</FieldLabel>
                  <Input
                    id="edit-device-manufacturer"
                    value={form.device.manufacturer}
                    onChange={(event) => form.setDevice({ manufacturer: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="edit-device-model">Device model</FieldLabel>
                  <Input
                    id="edit-device-model"
                    value={form.device.model}
                    onChange={(event) => form.setDevice({ model: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="edit-device-category">Category</FieldLabel>
                  <Select
                    value={form.device.categoryId}
                    onValueChange={(value) => form.setDevice({ categoryId: value })}
                  >
                    <SelectTrigger id="edit-device-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {project.settings.categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="edit-device-location">Location</FieldLabel>
                  <Select
                    value={form.device.locationId}
                    onValueChange={(value) => form.setDevice({ locationId: value })}
                  >
                    <SelectTrigger id="edit-device-location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {project.locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SubLocationSelect
                  id="edit-device-sub-location"
                  locationId={form.device.locationId}
                  project={project}
                  value={form.device.subLocationId}
                  onChange={(value) => form.setDevice({ subLocationId: value })}
                />
                <div className="form-field">
                  <FieldLabel htmlFor="edit-device-rack-size">Mount height (RU)</FieldLabel>
                  <Select
                    value={form.device.rackSizeRu ? String(form.device.rackSizeRu) : 'none'}
                    onValueChange={(value) =>
                      form.setDevice({ rackSizeRu: value === 'none' ? null : Number(value) })
                    }
                  >
                    <SelectTrigger id="edit-device-rack-size">
                      <SelectValue placeholder="No mount height" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No mount height</SelectItem>
                      {RACK_RU_OPTIONS.map((height) => (
                        <SelectItem key={height} value={String(height)}>
                          {height} RU
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          ) : (
            <section className="modal-section device-modal-tab-panel">
              <div className="port-group-editor-list">
                {form.interfaceItems.map((item) => (
                  <PortGroupEditor
                    categories={project.settings.categories}
                    group={item.group}
                    isCollapsed={!expandedInterfaceIds.has(item.group.localId)}
                    key={item.group.localId}
                    lockedFields={item.kind === 'existing'}
                    settings={project.settings}
                    onCategoryChange={
                      item.kind === 'existing' ? () => undefined : form.updateNewPortGroupCategory
                    }
                    onDragEnd={() => setDraggingInterfaceId(null)}
                    onDragStart={setDraggingInterfaceId}
                    onDrop={dropInterface}
                    onPlannedCablesToggle={
                      item.kind === 'existing' ? () => undefined : form.toggleNewPortGroupPlannedCables
                    }
                    onRemove={item.kind === 'existing' ? undefined : form.removeNewPortGroup}
                    onToggleCollapsed={toggleInterfaceCollapsed}
                    onUpdate={(localId, updates) =>
                      item.kind === 'existing'
                        ? form.updateExistingPortGroup(localId, {
                            name: updates.name,
                            portLabelPattern: updates.portLabelPattern,
                            colorOverride: updates.colorOverride,
                          })
                        : form.updateNewPortGroup(localId, updates)
                    }
                  />
                ))}
              </div>
              <Button variant="outline" size="sm" type="button" onClick={form.addPortGroup}>
                Add I/O Interface
              </Button>
              <div className="form-messages">
                {form.validation.warnings.map((warning) => (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-800" key={warning}>
                    <AlertDescription>{warning}</AlertDescription>
                  </Alert>
                ))}
                {form.validation.errors.map((error) => (
                  <Alert className="border-red-200 bg-red-50 text-red-800" key={error}>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </section>
          )}
        </div>

        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={form.validation.errors.length > 0} type="submit">
            Save Device
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
