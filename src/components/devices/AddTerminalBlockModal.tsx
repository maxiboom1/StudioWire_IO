import { useMemo, useState, type FormEvent } from 'react';
import { allocateCableRange, formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import {
  getConnectorsForCategory,
  getDefaultConnectorForCategory,
  isConnectorAssignedToCategory,
} from '../../domain/connectorCompatibility';
import { makeId } from '../../domain/id';
import { validateRackPlacement } from '../../domain/rackPlacement';
import type { Device, ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import type { TerminalBlockDraft } from '../../state/projectTypes';
import { HorizontalTabs } from '../common/AppTabs';
import { ModalFrame } from '../common/ModalFrame';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

export function AddTerminalBlockModal({
  initialLocationId,
  onClose,
  onCreated,
}: {
  initialLocationId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { project, addTerminalBlock } = useProject();
  const racks = useMemo(
    () =>
      initialLocationId
        ? project.racks.filter((rack) => rack.locationId === initialLocationId)
        : project.racks,
    [initialLocationId, project.racks],
  );
  const firstRack = racks[0];
  const firstCategory = project.settings.categories[0];
  const categoryPrefix =
    firstCategory?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';
  const categoryConnector = firstCategory
    ? getDefaultConnectorForCategory(project.settings, firstCategory.id)
    : null;
  const [draft, setDraft] = useState<TerminalBlockDraft>({
    name: '',
    categoryId: firstCategory?.id ?? '',
    locationId: firstRack?.locationId ?? initialLocationId ?? '',
    labelPrefix: '',
    rackId: firstRack?.id ?? '',
    rackBottomRu: 1,
    connectorTypeId: categoryConnector?.id ?? '',
    count: 16,
    cablePrefix: categoryPrefix,
    firstCableNumber:
      project.numberingLedgers.find((ledger) => ledger.prefix === categoryPrefix)?.nextSuggested ?? 1,
    createPlannedCables: true,
    notes: '',
  });
  const [activeTab, setActiveTab] = useState<'general' | 'front'>('general');
  const effectiveLabelPrefix = normalizeDeviceToken(draft.labelPrefix || draft.name || 'TB');
  const validation = getAddTerminalBlockValidation(project, draft, effectiveLabelPrefix);
  const connectorTypes = getConnectorsForCategory(project.settings, draft.categoryId);

  function updateDraft(updates: Partial<TerminalBlockDraft>) {
    setDraft((current) => {
      const next = { ...current, ...updates };

      if (updates.categoryId) {
        next.cablePrefix = getDefaultPrefixForCategory(project, updates.categoryId);
        next.connectorTypeId = getDefaultConnectorForCategory(project.settings, updates.categoryId)?.id ?? '';
      }

      if (updates.rackId) {
        const selectedRack = project.racks.find((rack) => rack.id === updates.rackId);
        next.locationId = selectedRack?.locationId ?? next.locationId;
      }

      if (updates.cablePrefix || updates.categoryId || updates.createPlannedCables) {
        next.firstCableNumber =
          project.numberingLedgers.find((ledger) => ledger.prefix === next.cablePrefix)?.nextSuggested ?? 1;
      }

      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validation.errors.length > 0) {
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmed = window.confirm(
        `${validation.warnings.join('\n')}\n\nContinue and reserve these cable number gaps?`,
      );

      if (!confirmed) {
        return;
      }
    }

    const id = addTerminalBlock({
      ...draft,
      name: draft.name.trim(),
      labelPrefix: effectiveLabelPrefix,
      firstCableNumber: draft.createPlannedCables ? draft.firstCableNumber : null,
      notes: draft.notes.trim(),
    });
    onCreated(id);
  }

  return (
    <ModalFrame
      title="Add TB"
      description="Create a 1RU rack terminal block with rear and front port faces."
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form add-terminal-block-form" onSubmit={handleSubmit}>
        <HorizontalTabs
          activeTab={activeTab}
          ariaLabel="Terminal block sections"
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'front', label: 'Front Cables' },
          ]}
          onTabChange={setActiveTab}
        />
        <div className="standard-modal-content">
          {activeTab === 'general' ? (
            <section className="modal-section">
              <h3>Terminal Block</h3>
              <div className="form-grid two">
                <div className="form-field">
                  <Label htmlFor="tb-name">Name</Label>
                  <Input
                    autoFocus
                    id="tb-name"
                    required
                    value={draft.name}
                    placeholder="TB-A"
                    onChange={(event) => updateDraft({ name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-label-prefix">Label Prefix</Label>
                  <Input
                    id="tb-label-prefix"
                    value={draft.labelPrefix}
                    placeholder={draft.name ? normalizeDeviceToken(draft.name) : 'TB-A'}
                    onChange={(event) => updateDraft({ labelPrefix: event.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-category">Category</Label>
                  <Select
                    value={draft.categoryId}
                    onValueChange={(value) => updateDraft({ categoryId: value })}
                  >
                    <SelectTrigger id="tb-category">
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
                  <Label htmlFor="tb-connector">Connector</Label>
                  <Select
                    value={draft.connectorTypeId}
                    onValueChange={(value) => updateDraft({ connectorTypeId: value })}
                  >
                    <SelectTrigger id="tb-connector">
                      <SelectValue placeholder="Select connector" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectorTypes.map((connectorType) => (
                        <SelectItem key={connectorType.id} value={connectorType.id}>
                          {connectorType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-count">Connector Count</Label>
                  <Input
                    id="tb-count"
                    min="1"
                    type="number"
                    value={draft.count}
                    onChange={(event) => updateDraft({ count: Number(event.target.value) })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-rack">Rack</Label>
                  <Select value={draft.rackId} onValueChange={(value) => updateDraft({ rackId: value })}>
                    <SelectTrigger id="tb-rack">
                      <SelectValue placeholder="Select rack" />
                    </SelectTrigger>
                    <SelectContent>
                      {racks.map((rack) => (
                        <SelectItem key={rack.id} value={rack.id}>
                          {rack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-bottom-ru">Bottom RU</Label>
                  <Input
                    id="tb-bottom-ru"
                    min="1"
                    type="number"
                    value={draft.rackBottomRu}
                    onChange={(event) => updateDraft({ rackBottomRu: Number(event.target.value) })}
                  />
                </div>
                <div className="form-field">
                  <Label>Mount</Label>
                  <Input readOnly value="Rackmount, 1 RU" />
                </div>
              </div>
            </section>
          ) : (
            <section className="modal-section">
              <h3>Front Planned Cables</h3>
              <div className="form-grid three">
                <div className="form-field">
                  <Label>Mode</Label>
                  <Button
                    aria-pressed={draft.createPlannedCables}
                    className="interface-auto-toggle"
                    type="button"
                    variant={draft.createPlannedCables ? 'default' : 'outline'}
                    onClick={() => updateDraft({ createPlannedCables: !draft.createPlannedCables })}
                  >
                    {draft.createPlannedCables ? 'AUTO' : 'NONE'}
                  </Button>
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-cable-prefix">Cable Prefix</Label>
                  <Select
                    value={draft.cablePrefix}
                    onValueChange={(value) => updateDraft({ cablePrefix: value })}
                  >
                    <SelectTrigger id="tb-cable-prefix">
                      <SelectValue placeholder="Select prefix" />
                    </SelectTrigger>
                    <SelectContent>
                      {project.settings.cablePrefixes.map((prefix) => (
                        <SelectItem key={prefix.id} value={prefix.prefix}>
                          {prefix.prefix}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <Label htmlFor="tb-first-cable">First Cable Number</Label>
                  <Input
                    id="tb-first-cable"
                    min="1"
                    readOnly={draft.createPlannedCables}
                    type="number"
                    value={draft.firstCableNumber ?? ''}
                    onChange={(event) =>
                      updateDraft({
                        firstCableNumber: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
              <p className="form-help">
                Planned numbers are assigned to FRONT ports only. REAR ports stay unnumbered until
                connection logic exists.
              </p>
              <div className="form-field">
                <Label htmlFor="tb-notes">Notes</Label>
                <Textarea
                  id="tb-notes"
                  value={draft.notes}
                  onChange={(event) => updateDraft({ notes: event.target.value })}
                />
              </div>
            </section>
          )}
        </div>

        <div className="form-messages standard-modal-messages">
          {validation.warnings.map((warning) => (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800" key={warning}>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
          {validation.errors.map((error) => (
            <Alert className="border-red-200 bg-red-50 text-red-800" key={error}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
        </div>

        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={validation.errors.length > 0} type="submit">
            Create TB
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}

function getAddTerminalBlockValidation(
  project: ProjectRoot,
  draft: TerminalBlockDraft,
  effectiveLabelPrefix: string,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!draft.name.trim()) {
    errors.push('TB name is required.');
  }

  if (!effectiveLabelPrefix) {
    errors.push('A label prefix or TB name is required for generated port labels.');
  }

  if (!project.settings.categories.some((category) => category.id === draft.categoryId)) {
    errors.push('TB category is required.');
  }

  if (!project.settings.connectorTypes.some((connector) => connector.id === draft.connectorTypeId)) {
    errors.push('TB connector type is required.');
  } else if (!isConnectorAssignedToCategory(project.settings, draft.categoryId, draft.connectorTypeId)) {
    errors.push('TB connector type must be assigned to the selected category.');
  }

  if (!Number.isSafeInteger(draft.count) || draft.count <= 0) {
    errors.push('Connector count must be positive.');
  }

  const rack = project.racks.find((candidate) => candidate.id === draft.rackId);

  if (!rack) {
    errors.push('TB rack is required.');
  } else {
    const probeDevice: Device = {
      id: makeId('terminal-block-preview', `${effectiveLabelPrefix}-${draft.rackBottomRu}`),
      name: draft.name || effectiveLabelPrefix,
      kind: 'terminal_block',
      categoryId: draft.categoryId,
      locationId: rack.locationId,
      subLocationId: null,
      labelPrefix: effectiveLabelPrefix,
      mountType: 'rack',
      rackId: rack.id,
      rackSizeRu: 1,
      rackBottomRu: draft.rackBottomRu,
      status: 'planned',
      notes: '',
      createdAt: '',
      updatedAt: '',
    };
    const placement = validateRackPlacement(
      { ...project, devices: [...project.devices, probeDevice] },
      {
        deviceId: probeDevice.id,
        targetRackId: rack.id,
        targetBottomRu: draft.rackBottomRu,
      },
    );

    if (!placement.ok) {
      errors.push(placement.message);
    }
  }

  if (!project.settings.cablePrefixes.some((prefix) => prefix.prefix === draft.cablePrefix)) {
    errors.push('TB cable prefix is unknown.');
  }

  if (draft.createPlannedCables) {
    if (!draft.firstCableNumber || draft.firstCableNumber < 1) {
      errors.push('Front planned cables need a positive first cable number.');
    } else if (Number.isSafeInteger(draft.count) && draft.count > 0) {
      const preview = previewCableRange(project, draft.cablePrefix, draft.firstCableNumber, draft.count);

      for (const error of preview.errors) {
        errors.push(error.message);
      }

      if (preview.reservedGap) {
        warnings.push(
          `Numbers ${formatCableNumber(preview.reservedGap.prefix, preview.reservedGap.from)} to ${formatCableNumber(
            preview.reservedGap.prefix,
            preview.reservedGap.to,
          )} will be reserved and cannot be used later.`,
        );
      }

      if (preview.errors.length === 0) {
        allocateCableRange(project, {
          prefix: draft.cablePrefix,
          firstCableNumber: draft.firstCableNumber,
          count: draft.count,
          ownerType: 'preview',
          ownerId: 'terminal-block-preview',
          reason: 'Preview terminal block front allocation',
        });
      }
    }
  }

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

function getDefaultPrefixForCategory(project: ProjectRoot, categoryId: string): string {
  return (
    project.settings.categories.find((category) => category.id === categoryId)?.defaultCablePrefix ??
    project.settings.cablePrefixes[0]?.prefix ??
    'V'
  );
}

function normalizeDeviceToken(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'TB';
}
