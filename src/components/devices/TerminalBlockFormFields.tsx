import { getConnectorsForCategory } from '../../domain/connectorCompatibility';
import type { ProjectRoot } from '../../domain/types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { updateTerminalBlockFormCategory, type TerminalBlockFormValue } from './terminalBlockForm';

export function TerminalBlockFormFields({
  form,
  project,
  racks,
  setForm,
}: {
  form: TerminalBlockFormValue;
  project: ProjectRoot;
  racks: ProjectRoot['racks'];
  setForm: (form: TerminalBlockFormValue) => void;
}) {
  const connectors = getConnectorsForCategory(project.settings, form.categoryId);

  return (
    <div className="form-grid two">
      <div className="form-field">
        <Label htmlFor="tb-name">TB Name</Label>
        <Input
          autoFocus
          id="tb-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </div>
      <div className="form-field">
        <Label htmlFor="tb-label-prefix">Label prefix</Label>
        <Input
          id="tb-label-prefix"
          value={form.labelPrefix}
          onChange={(event) => setForm({ ...form, labelPrefix: event.target.value.toUpperCase() })}
        />
      </div>
      <div className="form-field">
        <Label htmlFor="tb-category">Category</Label>
        <Select
          value={form.categoryId}
          onValueChange={(value) => setForm(updateTerminalBlockFormCategory(project, form, value))}
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
          value={form.connectorTypeId}
          onValueChange={(value) => setForm({ ...form, connectorTypeId: value })}
        >
          <SelectTrigger id="tb-connector">
            <SelectValue placeholder="Select connector" />
          </SelectTrigger>
          <SelectContent>
            {connectors.map((connector) => (
              <SelectItem key={connector.id} value={connector.id}>
                {connector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-field">
        <Label htmlFor="tb-count">Connector count</Label>
        <Input
          id="tb-count"
          min="1"
          type="number"
          value={form.count}
          onChange={(event) =>
            setForm({
              ...form,
              count: event.target.value === '' ? '' : Number(event.target.value),
            })
          }
        />
      </div>
      <div className="form-field">
        <Label htmlFor="tb-rack">Rack</Label>
        <Select value={form.rackId} onValueChange={(value) => setForm({ ...form, rackId: value })}>
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
          value={form.rackBottomRu}
          onChange={(event) =>
            setForm({
              ...form,
              rackBottomRu: event.target.value === '' ? '' : Number(event.target.value),
            })
          }
        />
      </div>
      <div className="form-field terminal-block-notes-field">
        <Label htmlFor="tb-notes">Notes</Label>
        <Textarea
          id="tb-notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </div>
    </div>
  );
}
