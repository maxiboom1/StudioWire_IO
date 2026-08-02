import { allocateCableRange, getNextSuggestedForPrefix } from '../cableNumbers';
import type { ProjectRoot } from '../types';
import type { DeviceTemplate, DeviceTemplateCompatibility, DeviceTemplateFormDraft } from './types';

export function mapDeviceTemplateToFormDraft(
  project: ProjectRoot,
  template: DeviceTemplate,
  compatibility: DeviceTemplateCompatibility,
  makeLocalId: () => string,
): DeviceTemplateFormDraft | null {
  if (!compatibility.resolved) {
    return null;
  }

  let previewProject = project;
  const portGroups = template.ioInterfaces.map((ioInterface, index) => {
    const resolved = compatibility.resolved!.ioInterfaces[index];
    const localId = makeLocalId();
    const firstCableNumber = getNextSuggestedForPrefix(
      previewProject,
      resolved.cablePrefix,
      ioInterface.count,
    );
    const allocation = allocateCableRange(previewProject, {
      prefix: resolved.cablePrefix,
      firstCableNumber,
      count: ioInterface.count,
      ownerType: 'preview',
      ownerId: localId,
      reason: 'Preview device template allocation',
    });

    if (allocation.preview.errors.length === 0) {
      previewProject = allocation.project;
    }

    return {
      localId,
      name: ioInterface.name,
      direction: ioInterface.direction,
      categoryId: resolved.categoryId,
      connectorTypeId: resolved.connectorTypeId,
      count: ioInterface.count,
      portLabelPattern: ioInterface.portLabelPattern,
      cablePrefix: resolved.cablePrefix,
      firstCableNumber,
      createPlannedCables: true,
      colorOverride: ioInterface.color,
    };
  });

  return {
    device: {
      name: template.device.name,
      code: template.device.subName,
      manufacturer: template.device.manufacturer,
      model: template.device.model,
      categoryId: compatibility.resolved.deviceCategoryId,
      locationId: project.locations[0]?.id ?? '',
      subLocationId: null,
      role: '',
      labelPrefix: '',
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: template.device.rackSizeRu,
      rackBottomRu: null,
      notes: '',
    },
    portGroups,
  };
}
