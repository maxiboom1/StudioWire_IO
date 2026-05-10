import { useEffect, useState, type FormEvent } from 'react';
import type { TerminalBlock } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export function TerminalBlockInspector({ terminalBlock }: { terminalBlock: TerminalBlock }) {
  const { project, updateTerminalBlock } = useProject();
  const category = project.settings.categories.find((candidate) => candidate.id === terminalBlock.categoryId);
  const location = terminalBlock.locationId
    ? project.locations.find((candidate) => candidate.id === terminalBlock.locationId)
    : null;
  const portGroups = project.terminalBlockPortGroups.filter((group) => group.terminalBlockId === terminalBlock.id);
  const ports = project.terminalBlockPorts.filter((port) => port.terminalBlockId === terminalBlock.id);
  const [form, setForm] = useState({
    name: terminalBlock.name,
    code: terminalBlock.code,
    manufacturer: terminalBlock.manufacturer,
    model: terminalBlock.model,
    role: terminalBlock.role,
    labelPrefix: terminalBlock.labelPrefix,
    notes: terminalBlock.notes,
    rackSizeRu: terminalBlock.rackSizeRu ? String(terminalBlock.rackSizeRu) : '',
  });

  useEffect(() => {
    setForm({
      name: terminalBlock.name,
      code: terminalBlock.code,
      manufacturer: terminalBlock.manufacturer,
      model: terminalBlock.model,
      role: terminalBlock.role,
      labelPrefix: terminalBlock.labelPrefix,
      notes: terminalBlock.notes,
      rackSizeRu: terminalBlock.rackSizeRu ? String(terminalBlock.rackSizeRu) : '',
    });
  }, [terminalBlock]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateTerminalBlock(terminalBlock.id, {
      name: form.name,
      code: form.code,
      manufacturer: form.manufacturer,
      model: form.model,
      role: form.role,
      labelPrefix: form.labelPrefix,
      notes: form.notes,
      rackSizeRu: form.rackSizeRu ? Number(form.rackSizeRu) : null,
    });
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Terminal Block Inspector</h2>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Edit Terminal Block</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="editor-form inspector-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="inspector-tb-name">Name</Label>
              <Input id="inspector-tb-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-code">Code</Label>
              <Input id="inspector-tb-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-label-prefix">Label Prefix</Label>
              <Input
                id="inspector-tb-label-prefix"
                value={form.labelPrefix}
                onChange={(event) => setForm({ ...form, labelPrefix: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-manufacturer">Manufacturer</Label>
              <Input
                id="inspector-tb-manufacturer"
                value={form.manufacturer}
                onChange={(event) => setForm({ ...form, manufacturer: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-model">Model</Label>
              <Input id="inspector-tb-model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-role">Role</Label>
              <Input id="inspector-tb-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-rack-size">Mount Height (RU)</Label>
              <Input
                id="inspector-tb-rack-size"
                min="1"
                type="number"
                value={form.rackSizeRu}
                onChange={(event) => setForm({ ...form, rackSizeRu: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-notes">Notes</Label>
              <Textarea id="inspector-tb-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <Button type="submit">Save Terminal Block</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Terminal Block Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{category?.name ?? 'Unknown category'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge>{terminalBlock.status}</Badge>
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{location?.name ?? 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Mount</dt>
              <dd>{terminalBlock.mountType}</dd>
            </div>
            <div>
              <dt>Port groups</dt>
              <dd>{portGroups.length}</dd>
            </div>
            <div>
              <dt>Rear/front ports</dt>
              <dd>{ports.length}</dd>
            </div>
          </dl>
          <p>Position count and per-port cable endpoints are locked until the terminal block canvas workflow is added.</p>
        </CardContent>
      </Card>
    </aside>
  );
}
