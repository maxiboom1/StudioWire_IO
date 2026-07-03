import { useEffect, useState, type FormEvent } from 'react';
import type { SubLocation } from '../../domain/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface SubLocationManagerProps {
  locationId: string;
  subLocations: SubLocation[];
  referencedDeviceCounts: Map<string, number>;
  onAdd: (input: { locationId: string; name: string; description: string }) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { name: string; description: string }) => void;
}

export function SubLocationManager({
  locationId,
  subLocations,
  referencedDeviceCounts,
  onAdd,
  onDelete,
  onUpdate,
}: SubLocationManagerProps) {
  const [draft, setDraft] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', description: '' });

  useEffect(() => {
    setDraft({ name: '', description: '' });
    setEditingId(null);
    setEditDraft({ name: '', description: '' });
  }, [locationId]);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    onAdd({ locationId, name: draft.name.trim(), description: draft.description.trim() });
    setDraft({ name: '', description: '' });
  }

  function startEditing(subLocation: SubLocation) {
    setEditingId(subLocation.id);
    setEditDraft({ name: subLocation.name, description: subLocation.description });
  }

  function handleEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();

    if (!editDraft.name.trim()) {
      return;
    }

    onUpdate(id, { name: editDraft.name.trim(), description: editDraft.description.trim() });
    setEditingId(null);
  }

  return (
    <div className="sub-location-manager">
      <form className="editor-form compact-editor-form" onSubmit={handleAdd}>
        <div className="form-grid two">
          <div className="form-field">
            <Label htmlFor="sub-location-name">Name</Label>
            <Input
              id="sub-location-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <Label htmlFor="sub-location-description">Description</Label>
            <Input
              id="sub-location-description"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </div>
        </div>
        <Button size="sm" type="submit">
          Add Folder
        </Button>
      </form>

      {subLocations.length === 0 ? (
        <p className="panel-empty">No folders yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subLocations.map((subLocation) => {
              const deviceCount = referencedDeviceCounts.get(subLocation.id) ?? 0;
              const isEditing = editingId === subLocation.id;

              return (
                <TableRow key={subLocation.id}>
                  <TableCell>
                    {isEditing ? (
                      <form
                        id={`edit-sub-location-${subLocation.id}`}
                        onSubmit={(event) => handleEdit(event, subLocation.id)}
                      >
                        <Input
                          aria-label="Folder name"
                          value={editDraft.name}
                          onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                        />
                      </form>
                    ) : (
                      subLocation.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Textarea
                        aria-label="Folder description"
                        form={`edit-sub-location-${subLocation.id}`}
                        value={editDraft.description}
                        onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                      />
                    ) : (
                      subLocation.description || 'No description'
                    )}
                  </TableCell>
                  <TableCell>{deviceCount}</TableCell>
                  <TableCell>
                    <div className="workspace-card-actions">
                      {isEditing ? (
                        <>
                          <Button form={`edit-sub-location-${subLocation.id}`} size="sm" type="submit">
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => startEditing(subLocation)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => onDelete(subLocation.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                    {deviceCount > 0 ? (
                      <p className="form-help">Deleting clears this folder from its items.</p>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
