import { type FormEvent, useState } from 'react';
import { bundledDeviceTemplateRepository } from '../../deviceCollection/bundledDeviceTemplateRepository';
import { buildReplaceDeviceDraftConfirmation } from '../../domain/prompts';
import type { DeviceTemplateRepository } from '../../domain/deviceTemplates/types';
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
import { DeviceCollectionBrowser } from './DeviceCollectionBrowser';
import { SubLocationSelect } from './SubLocationSelect';
import { useAddDeviceForm } from './useAddDeviceForm';

export function AddDeviceModal({
  initialLocationId,
  onClose,
  onCreated,
  sourceDevice,
  deviceTemplateRepository = bundledDeviceTemplateRepository,
}: {
  initialLocationId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
  sourceDevice?: Device | null;
  deviceTemplateRepository?: DeviceTemplateRepository;
}) {
  const { project, addDevice } = useProject();
  const confirm = useConfirmation();
  const [activeTab, setActiveTab] = useState<'general' | 'io' | 'collection'>('general');
  const [collapsedInterfaceIds, setCollapsedInterfaceIds] = useState<Set<string>>(() => new Set());
  const [draggingInterfaceId, setDraggingInterfaceId] = useState<string | null>(null);
  const form = useAddDeviceForm({
    addDevice,
    initialLocationId,
    onCreated,
    project,
    sourceDevice,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(confirm);
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

  async function loadTemplate(
    template: Parameters<typeof form.loadTemplate>[0],
    compatibility: Parameters<typeof form.loadTemplate>[1],
  ) {
    if (form.hasUnsavedChanges) {
      const confirmed = await confirm(buildReplaceDeviceDraftConfirmation());

      if (!confirmed) {
        return;
      }
    }

    if (form.loadTemplate(template, compatibility)) {
      setCollapsedInterfaceIds(new Set());
      setDraggingInterfaceId(null);
      setActiveTab('general');
    }
  }

  return (
    <ModalFrame
      title="Add Device"
      description={
        sourceDevice
          ? `Review the cloned details from ${sourceDevice.name}, then create a new device with fresh cable allocations.`
          : 'Create a new device with generated ports and optional I/O interfaces.'
      }
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form add-device-form" onSubmit={handleSubmit}>
        <HorizontalTabs
          activeTab={activeTab}
          ariaLabel="Device edit sections"
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'io', label: 'I/O' },
            { id: 'collection', label: 'Device Collection' },
          ]}
          onTabChange={setActiveTab}
        />
        <div className="standard-modal-content device-modal-tab-content">
          {activeTab === 'general' ? (
            <section className="modal-section device-modal-tab-panel">
              <div className="form-grid two">
                <div className="form-field">
                  <FieldLabel helper="appear as device header" htmlFor="device-name">
                    Device Name
                  </FieldLabel>
                  <Input
                    autoFocus
                    id="device-name"
                    required
                    value={form.device.name}
                    onChange={(event) => form.setDevice({ name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel helper="appear as device 2nd line header" htmlFor="device-code">
                    Device sub-name
                  </FieldLabel>
                  <Input
                    id="device-code"
                    value={form.device.code}
                    placeholder={form.effectiveLabelPrefix}
                    onChange={(event) => form.setDevice({ code: event.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="device-manufacturer">Manufacturer</FieldLabel>
                  <Input
                    id="device-manufacturer"
                    value={form.device.manufacturer}
                    onChange={(event) => form.setDevice({ manufacturer: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="device-model">Device model</FieldLabel>
                  <Input
                    id="device-model"
                    value={form.device.model}
                    onChange={(event) => form.setDevice({ model: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <FieldLabel htmlFor="device-category">Category</FieldLabel>
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
                  <FieldLabel htmlFor="device-location">Location</FieldLabel>
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
                <div className="form-field">
                  <FieldLabel htmlFor="device-rack-size">Mount height (RU)</FieldLabel>
                  <Select
                    value={form.device.rackSizeRu ? String(form.device.rackSizeRu) : 'none'}
                    onValueChange={(value) =>
                      form.setDevice({ rackSizeRu: value === 'none' ? null : Number(value) })
                    }
                  >
                    <SelectTrigger id="device-rack-size">
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
          ) : activeTab === 'io' ? (
            <section className="modal-section device-modal-tab-panel">
              <div className="port-group-editor-list">
                {form.portGroups.map((group) => (
                  <PortGroupEditor
                    categories={project.settings.categories}
                    group={group}
                    isCollapsed={collapsedInterfaceIds.has(group.localId)}
                    key={group.localId}
                    settings={project.settings}
                    onCategoryChange={form.updatePortGroupCategory}
                    onDragEnd={() => setDraggingInterfaceId(null)}
                    onDragStart={setDraggingInterfaceId}
                    onDrop={dropInterface}
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
          ) : (
            <section className="modal-section device-modal-tab-panel device-collection-panel">
              <DeviceCollectionBrowser
                project={project}
                repository={deviceTemplateRepository}
                onLoadTemplate={(entry, compatibility) => {
                  if (entry.template) {
                    void loadTemplate(entry.template, compatibility);
                  }
                }}
              />
            </section>
          )}
        </div>

        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={form.validation.errors.length > 0} type="submit">
            Create Device
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
