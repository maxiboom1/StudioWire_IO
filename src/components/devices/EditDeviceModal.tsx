import { type FormEvent } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PortGroupEditor } from './PortGroupEditor';
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

  return (
    <ModalFrame
      title="Edit Device"
      description="Edit device metadata, relabel existing interfaces, and add new interfaces."
      onClose={onClose}
    >
      <form className="editor-form add-device-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <h3>Basic</h3>
          <div className="form-grid two">
            <div className="form-field">
              <Label htmlFor="edit-device-name">Name</Label>
              <Input
                autoFocus
                id="edit-device-name"
                required
                value={form.device.name}
                onChange={(event) => form.setDevice({ name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="edit-device-code">Code</Label>
              <Input
                id="edit-device-code"
                value={form.device.code}
                onChange={(event) => form.setDevice({ code: event.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="edit-device-manufacturer">Manufacturer</Label>
              <Input
                id="edit-device-manufacturer"
                value={form.device.manufacturer}
                onChange={(event) => form.setDevice({ manufacturer: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="edit-device-model">Model</Label>
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
            <div className="form-field">
              <Label htmlFor="edit-device-label-prefix">Label Prefix</Label>
              <Input
                id="edit-device-label-prefix"
                value={form.device.labelPrefix}
                onChange={(event) => form.setDevice({ labelPrefix: event.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="edit-device-role">Role</Label>
              <Input
                id="edit-device-role"
                value={form.device.role}
                onChange={(event) => form.setDevice({ role: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="edit-device-rack-size">Rack Height</Label>
              <Input
                id="edit-device-rack-size"
                min="1"
                type="number"
                value={form.device.rackSizeRu ?? ''}
                onChange={(event) =>
                  form.setDevice({
                    rackSizeRu: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </div>
            <div className="form-field">
              <Label htmlFor="edit-device-notes">Notes</Label>
              <Input
                id="edit-device-notes"
                value={form.device.notes}
                onChange={(event) => form.setDevice({ notes: event.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>Existing I/O Interfaces</h3>
          </div>
          <div className="port-group-editor-list">
            {form.existingPortGroups.map((group) => (
              <PortGroupEditor
                cablePrefixes={project.settings.cablePrefixes}
                categories={project.settings.categories}
                group={group}
                key={group.id}
                lockedFields
                settings={project.settings}
                onCategoryChange={() => undefined}
                onPlannedCablesToggle={() => undefined}
                onUpdate={(id, updates) =>
                  form.updateExistingPortGroup(id, {
                    name: updates.name,
                    portLabelPattern: updates.portLabelPattern,
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>New I/O Interfaces</h3>
          </div>
          <div className="port-group-editor-list">
            {form.newPortGroups.map((group) => (
              <PortGroupEditor
                cablePrefixes={project.settings.cablePrefixes}
                categories={project.settings.categories}
                group={group}
                key={group.localId}
                settings={project.settings}
                onCategoryChange={form.updateNewPortGroupCategory}
                onPlannedCablesToggle={form.toggleNewPortGroupPlannedCables}
                onRemove={form.removeNewPortGroup}
                onUpdate={form.updateNewPortGroup}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" type="button" onClick={form.addPortGroup}>
            Add Port Group
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

        <DialogFooter>
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
