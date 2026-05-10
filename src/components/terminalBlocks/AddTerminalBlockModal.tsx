import { useMemo, useState, type FormEvent } from 'react';
import { formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import type { ProjectRoot, TerminalBlockPlannedCableMode } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import type { TerminalBlockDraft } from '../../state/projectReducer';
import { ModalFrame } from '../common/ModalFrame';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const NONE_VALUE = '__none__';

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
  const defaultCategory = project.settings.categories[0];
  const defaultConnector = project.settings.connectorTypes[0];
  const defaultPrefix = defaultCategory?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';
  const [form, setForm] = useState<TerminalBlockDraft>({
    name: '',
    code: '',
    manufacturer: '',
    model: '',
    categoryId: defaultCategory?.id ?? '',
    locationId: initialLocationId,
    role: '',
    labelPrefix: '',
    rackSizeRu: null,
    notes: '',
    connectorTypeId: defaultConnector?.id ?? '',
    cablePrefix: defaultPrefix,
    positionCount: 16,
    plannedCableMode: 'none',
    firstCableNumber: null,
  });
  const validation = useMemo(() => validateTerminalBlockDraft(project, form), [project, form]);
  const cablePreview = getCablePreview(form);

  function update(updates: Partial<TerminalBlockDraft>) {
    setForm((current) => ({ ...current, ...updates }));
  }

  function handleCategoryChange(categoryId: string) {
    const category = project.settings.categories.find((candidate) => candidate.id === categoryId);

    update({
      categoryId,
      cablePrefix: category?.defaultCablePrefix ?? form.cablePrefix,
    });
  }

  function handleModeChange(plannedCableMode: TerminalBlockPlannedCableMode) {
    const ledger = project.numberingLedgers.find((candidate) => candidate.prefix === form.cablePrefix);

    update({
      plannedCableMode,
      firstCableNumber: plannedCableMode === 'none' ? null : form.firstCableNumber ?? ledger?.nextSuggested ?? 1,
    });
  }

  function handlePrefixChange(cablePrefix: string) {
    const ledger = project.numberingLedgers.find((candidate) => candidate.prefix === cablePrefix);

    update({
      cablePrefix,
      firstCableNumber: form.plannedCableMode === 'none' ? null : ledger?.nextSuggested ?? 1,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validation.errors.length > 0) {
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmed = window.confirm(`${validation.warnings.join('\n')}\n\nContinue and reserve these cable gaps?`);

      if (!confirmed) {
        return;
      }
    }

    const id = addTerminalBlock({
      ...form,
      code: form.code.trim() || normalizeCode(form.labelPrefix || form.name),
      labelPrefix: form.labelPrefix.trim() || normalizeCode(form.code || form.name),
      firstCableNumber: form.plannedCableMode === 'none' ? null : form.firstCableNumber,
      rackSizeRu: form.rackSizeRu && form.rackSizeRu > 0 ? form.rackSizeRu : null,
    });

    onCreated(id);
  }

  return (
    <ModalFrame
      title="Add Terminal Block"
      description="Create a terminal block with rear/front ports and optional planned cable stubs."
      onClose={onClose}
    >
      <form className="editor-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <div className="form-grid two">
            <div className="form-field">
              <Label htmlFor="tb-name">Name</Label>
              <Input id="tb-name" value={form.name} onChange={(event) => update({ name: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="tb-label-prefix">Code / Label Prefix</Label>
              <Input
                id="tb-label-prefix"
                placeholder="TB I"
                value={form.labelPrefix}
                onChange={(event) => update({ labelPrefix: event.target.value, code: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="tb-manufacturer">Manufacturer</Label>
              <Input
                id="tb-manufacturer"
                value={form.manufacturer}
                onChange={(event) => update({ manufacturer: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="tb-model">Model</Label>
              <Input id="tb-model" value={form.model} onChange={(event) => update({ model: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="tb-location">Location</Label>
              <Select
                value={form.locationId ?? NONE_VALUE}
                onValueChange={(value) => update({ locationId: value === NONE_VALUE ? null : value })}
              >
                <SelectTrigger id="tb-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No location</SelectItem>
                  {project.locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="tb-category">Category</Label>
              <Select value={form.categoryId} onValueChange={handleCategoryChange}>
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
          </div>
        </section>

        <section className="modal-section">
          <div className="form-grid three">
            <div className="form-field">
              <Label htmlFor="tb-connector">Connector Type</Label>
              <Select value={form.connectorTypeId} onValueChange={(connectorTypeId) => update({ connectorTypeId })}>
                <SelectTrigger id="tb-connector">
                  <SelectValue placeholder="Select connector" />
                </SelectTrigger>
                <SelectContent>
                  {project.settings.connectorTypes.map((connectorType) => (
                    <SelectItem key={connectorType.id} value={connectorType.id}>
                      {connectorType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="tb-cable-prefix">Cable Prefix</Label>
              <Select value={form.cablePrefix} onValueChange={handlePrefixChange}>
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
              <Label htmlFor="tb-position-count">Position Count</Label>
              <Input
                id="tb-position-count"
                min="1"
                type="number"
                value={form.positionCount}
                onChange={(event) => update({ positionCount: Number(event.target.value) })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="tb-planned-mode">Planned Cable Mode</Label>
              <Select value={form.plannedCableMode} onValueChange={handleModeChange}>
                <SelectTrigger id="tb-planned-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="rear">Rear</SelectItem>
                  <SelectItem value="front">Front</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="tb-first-cable">First Cable Number</Label>
              <Input
                disabled={form.plannedCableMode === 'none'}
                id="tb-first-cable"
                min="1"
                type="number"
                value={form.firstCableNumber ?? ''}
                onChange={(event) =>
                  update({ firstCableNumber: event.target.value ? Number(event.target.value) : null })
                }
              />
            </div>
            <div className="form-field">
              <Label htmlFor="tb-rack-size">Mount Height (RU)</Label>
              <Input
                id="tb-rack-size"
                min="1"
                type="number"
                value={form.rackSizeRu ?? ''}
                onChange={(event) => update({ rackSizeRu: event.target.value ? Number(event.target.value) : null })}
              />
            </div>
          </div>
          {cablePreview ? <p className="form-help">{cablePreview}</p> : null}
        </section>

        <section className="modal-section">
          <div className="form-field">
            <Label htmlFor="tb-notes">Notes</Label>
            <Textarea id="tb-notes" value={form.notes} onChange={(event) => update({ notes: event.target.value })} />
          </div>
          <ValidationMessages errors={validation.errors} warnings={validation.warnings} />
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={validation.errors.length > 0}>
            Create Terminal Block
          </Button>
        </DialogFooter>
      </form>
    </ModalFrame>
  );
}

function ValidationMessages({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="form-messages">
      {[...errors, ...warnings].map((message) => (
        <Alert key={message} className={errors.includes(message) ? 'border-red-200 bg-red-50 text-red-900' : undefined}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function validateTerminalBlockDraft(project: ProjectRoot, draft: TerminalBlockDraft) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cableCount = draft.plannedCableMode === 'both' ? draft.positionCount * 2 : draft.positionCount;

  if (!draft.name.trim()) {
    errors.push('Terminal block name is required.');
  }

  if (!draft.categoryId) {
    errors.push('Category is required.');
  }

  if (!draft.connectorTypeId) {
    errors.push('Connector type is required.');
  }

  if (!Number.isInteger(draft.positionCount) || draft.positionCount < 1) {
    errors.push('Position count must be a positive integer.');
  }

  if (draft.plannedCableMode !== 'none') {
    if (!draft.firstCableNumber || draft.firstCableNumber < 1) {
      errors.push('First cable number is required when planned cable mode is not none.');
    } else {
      const preview = previewCableRange(project, draft.cablePrefix, draft.firstCableNumber, cableCount);

      errors.push(...preview.errors.map((error) => error.message));

      if (preview.reservedGap) {
        warnings.push(
          `Numbers ${formatCableNumber(draft.cablePrefix, preview.reservedGap.from)} to ${formatCableNumber(
            draft.cablePrefix,
            preview.reservedGap.to,
          )} will be reserved and cannot be used later.`,
        );
      }
    }
  }

  return { errors, warnings };
}

function getCablePreview(draft: TerminalBlockDraft): string | null {
  if (draft.plannedCableMode === 'none' || !draft.firstCableNumber || draft.positionCount < 1) {
    return null;
  }

  const cableCount = draft.plannedCableMode === 'both' ? draft.positionCount * 2 : draft.positionCount;
  const lastCableNumber = draft.firstCableNumber + cableCount - 1;

  return `Planned cable stub range: ${formatCableNumber(draft.cablePrefix, draft.firstCableNumber)} -> ${formatCableNumber(
    draft.cablePrefix,
    lastCableNumber,
  )}`;
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}
