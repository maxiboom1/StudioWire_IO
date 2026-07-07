import { type FormEvent, useState } from 'react';
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
import { useAddDeviceForm } from './useAddDeviceForm';

export function AddDeviceModal({
  initialLocationId,
  onClose,
  onCreated,
}: {
  initialLocationId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { project, addDevice } = useProject();
  const [activeTab, setActiveTab] = useState<'general' | 'io'>('general');
  const [collapsedInterfaceIds, setCollapsedInterfaceIds] = useState<Set<string>>(() => new Set());
  const [draggingInterfaceId, setDraggingInterfaceId] = useState<string | null>(null);
  const form = useAddDeviceForm({
    addDevice,
    initialLocationId,
    onCreated,
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
      form.movePortGroup(draggingInterfaceId, targetLocalId);
    }

    setDraggingInterfaceId(null);
  }

  return (
    <ModalFrame
      title="Add Device"
      description="Create a virtual device with generated ports and optional planned cables."
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
                    <Label htmlFor="device-name">Device Label</Label>
                    <Input
                      autoFocus
                      id="device-name"
                      required
                      value={form.device.name}
                      onChange={(event) => form.setDevice({ name: event.target.value })}
                    />
                    <p className="form-help">This label will appear as device header.</p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="device-code">Device sub-label</Label>
                    <Input
                      id="device-code"
                      value={form.device.code}
                      placeholder={form.effectiveLabelPrefix}
                      onChange={(event) => form.setDevice({ code: event.target.value.toUpperCase() })}
                    />
                    <p className="form-help">This will appear as device 2nd line header.</p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="device-manufacturer">Manufacturer</Label>
                    <Input
                      id="device-manufacturer"
                      value={form.device.manufacturer}
                      onChange={(event) => form.setDevice({ manufacturer: event.target.value })}
                    />
                    <p className="form-help">Hardware vendor.</p>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="device-model">Device Model</Label>
                    <Input
                      id="device-model"
                      value={form.device.model}
                      onChange={(event) => form.setDevice({ model: event.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="device-category">Category</Label>
                    <Select value={form.device.categoryId} onValueChange={form.updateDeviceCategory}>
                      <SelectTrigger id="device-category">
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
                    <Label htmlFor="device-location">Location</Label>
                    <Select
                      value={form.device.locationId}
                      onValueChange={(value) => form.setDevice({ locationId: value })}
                    >
                      <SelectTrigger id="device-location">
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
                    id="device-sub-location"
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
                  {form.portGroups.map((group, index) => (
                    <PortGroupEditor
                      cablePrefixes={project.settings.cablePrefixes}
                      canMoveDown={index < form.portGroups.length - 1}
                      canMoveUp={index > 0}
                      categories={project.settings.categories}
                      group={group}
                      isCollapsed={collapsedInterfaceIds.has(group.localId)}
                      key={group.localId}
                      settings={project.settings}
                      onCategoryChange={form.updatePortGroupCategory}
                      onDragEnd={() => setDraggingInterfaceId(null)}
                      onDragStart={setDraggingInterfaceId}
                      onDrop={dropInterface}
                      onMoveDown={(localId) => form.movePortGroupByOffset(localId, 1)}
                      onMoveUp={(localId) => form.movePortGroupByOffset(localId, -1)}
                      onPlannedCablesToggle={form.togglePlannedCables}
                      onRemove={form.removePortGroup}
                      onToggleCollapsed={toggleInterfaceCollapsed}
                      onUpdate={form.updatePortGroup}
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
            Create Device
          </Button>
        </DialogFooter>
      </form>
    </ModalFrame>
  );
}
