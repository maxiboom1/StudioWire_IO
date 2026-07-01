import { type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PortGroupEditor } from './PortGroupEditor';
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

  return (
    <ModalFrame
      title="Add Device"
      description="Create a virtual device with generated ports and optional planned cables."
      onClose={onClose}
    >
      <form className="editor-form add-device-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <h3>Basic</h3>
          <div className="form-grid two">
            <div className="form-field">
              <Label htmlFor="device-name">Name</Label>
              <Input
                autoFocus
                id="device-name"
                required
                value={form.device.name}
                onChange={(event) => form.setDevice({ name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-manufacturer">Manufacturer</Label>
              <Input
                id="device-manufacturer"
                value={form.device.manufacturer}
                onChange={(event) => form.setDevice({ manufacturer: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-model">Model</Label>
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
            <div className="form-field">
              <Label htmlFor="device-label-prefix">Label Prefix</Label>
              <Input
                id="device-label-prefix"
                value={form.device.labelPrefix}
                placeholder={form.device.name ? form.effectiveLabelPrefix : 'MTX'}
                onChange={(event) => form.setDevice({ labelPrefix: event.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>I/O Interfaces</h3>
          </div>
          <div className="port-group-editor-list">
            {form.portGroups.map((group) => (
              <PortGroupEditor
                cablePrefixes={project.settings.cablePrefixes}
                categories={project.settings.categories}
                group={group}
                key={group.localId}
                settings={project.settings}
                onCategoryChange={form.updatePortGroupCategory}
                onPlannedCablesToggle={form.togglePlannedCables}
                onRemove={form.removePortGroup}
                onUpdate={form.updatePortGroup}
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
            Create Device
          </Button>
        </DialogFooter>
      </form>
    </ModalFrame>
  );
}
