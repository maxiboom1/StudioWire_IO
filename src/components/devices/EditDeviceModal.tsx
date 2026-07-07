import { type FormEvent, useState } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { HorizontalTabs } from '../common/AppTabs';
import { ModalFrame } from '../common/ModalFrame';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
  const [activeTab, setActiveTab] = useState<'general' | 'io'>('general');
  const [collapsedInterfaceIds, setCollapsedInterfaceIds] = useState<Set<string>>(() => new Set());
  const [draggingInterfaceId, setDraggingInterfaceId] = useState<string | null>(null);
  const form = useEditDeviceForm({
    device,
    editDevice,
    onSaved,
    project,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.submit((message) => window.confirm(message));
  }

  function toggleInterfaceCollapsed(localId: string) {
    setCollapsedInterfaceIds((current) => {
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
                <h3>General</h3>
                <div className="form-grid two">
                  <div className="form-field">
                    <Label htmlFor="edit-device-name">Device Label</Label>
                    <Input
                      autoFocus
                      id="edit-device-name"
                      required
                      value={form.device.name}
                      onChange={(event) => form.setDevice({ name: event.target.value })}
                    />
                    <p className="form-help">This label will appear as device header.</p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="edit-device-code">Device sub-label</Label>
                    <Input
                      id="edit-device-code"
                      value={form.device.code}
                      onChange={(event) => form.setDevice({ code: event.target.value.toUpperCase() })}
                    />
                    <p className="form-help">This will appear as device 2nd line header.</p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="edit-device-manufacturer">Manufacturer</Label>
                    <Input
                      id="edit-device-manufacturer"
                      value={form.device.manufacturer}
                      onChange={(event) => form.setDevice({ manufacturer: event.target.value })}
                    />
                    <p className="form-help">Hardware vendor.</p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="edit-device-model">Device Model</Label>
                    <Input
                      id="edit-device-model"
                      value={form.device.model}
                      onChange={(event) => form.setDevice({ model: event.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="edit-device-category">Category</Label>
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
                    <p className="form-help">
                      Assign the device as video, audio, network, or another category.
                    </p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="edit-device-location">Location</Label>
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
                </div>
              </section>
            ) : (
              <section className="modal-section device-modal-tab-panel">
                <div className="section-heading">
                  <h3>I/O Interfaces</h3>
                </div>
                <div className="port-group-editor-list">
                  {form.interfaceItems.map((item, index) => (
                    <PortGroupEditor
                      cablePrefixes={project.settings.cablePrefixes}
                      canMoveDown={index < form.interfaceItems.length - 1}
                      canMoveUp={index > 0}
                      categories={project.settings.categories}
                      group={item.group}
                      isCollapsed={collapsedInterfaceIds.has(item.group.localId)}
                      key={item.group.localId}
                      lockedFields={item.kind === 'existing'}
                      settings={project.settings}
                      onCategoryChange={
                        item.kind === 'existing' ? () => undefined : form.updateNewPortGroupCategory
                      }
                      onDragEnd={() => setDraggingInterfaceId(null)}
                      onDragStart={setDraggingInterfaceId}
                      onDrop={dropInterface}
                      onMoveDown={(localId) => form.moveInterfaceByOffset(localId, 1)}
                      onMoveUp={(localId) => form.moveInterfaceByOffset(localId, -1)}
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

        <DialogFooter className="standard-modal-footer">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={form.validation.errors.length > 0} type="submit">
            Save Device
          </Button>
        </DialogFooter>
      </form>
    </ModalFrame>
  );
}
