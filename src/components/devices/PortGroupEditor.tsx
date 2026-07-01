import { X } from 'lucide-react';
import { getConnectorsForCategory } from '../../domain/connectorCompatibility';
import type { CablePrefix, Category, Settings } from '../../domain/types';
import type { DevicePortGroupDraft } from '../../state/projectTypes';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  formatPortGroupLastCableNumber,
  formatPortGroupRange,
  type DevicePortGroupForm,
} from './addDeviceDraft';

export function PortGroupEditor({
  cablePrefixes,
  categories,
  group,
  lockedFields = false,
  settings,
  onCategoryChange,
  onPlannedCablesToggle,
  onRemove,
  onUpdate,
}: {
  cablePrefixes: CablePrefix[];
  categories: Category[];
  group: DevicePortGroupForm;
  lockedFields?: boolean;
  settings: Settings;
  onCategoryChange: (localId: string, categoryId: string) => void;
  onPlannedCablesToggle: (localId: string, checked: boolean) => void;
  onRemove?: (localId: string) => void;
  onUpdate: (localId: string, updates: Partial<DevicePortGroupForm>) => void;
}) {
  const connectorTypes = getConnectorsForCategory(settings, group.categoryId);

  return (
    <Card className="port-group-editor">
      <CardHeader className="port-group-editor-heading">
        <CardTitle>{group.name || 'Port group'}</CardTitle>
        <div className="interface-card-actions">
          <Badge>{formatPortGroupRange(group)}</Badge>
          {onRemove ? (
            <Button
              aria-label={`Remove ${group.name || 'interface'}`}
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => onRemove(group.localId)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="port-group-editor-content">
        <div className="port-group-row port-group-row-primary">
          <div className="form-field">
            <Label htmlFor={`port-group-name-${group.localId}`}>Name</Label>
            <Input
              id={`port-group-name-${group.localId}`}
              value={group.name}
              onChange={(event) => onUpdate(group.localId, { name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-category-${group.localId}`}>Category</Label>
            <Select
              disabled={lockedFields}
              value={group.categoryId}
              onValueChange={(value) => onCategoryChange(group.localId, value)}
            >
              <SelectTrigger id={`port-group-category-${group.localId}`}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-direction-${group.localId}`}>Direction</Label>
            <Select
              disabled={lockedFields}
              value={group.direction}
              onValueChange={(value) =>
                onUpdate(group.localId, {
                  direction: value as DevicePortGroupDraft['direction'],
                })
              }
            >
              <SelectTrigger id={`port-group-direction-${group.localId}`}>
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="input">Input</SelectItem>
                <SelectItem value="output">Output</SelectItem>
                <SelectItem value="bidirectional">Bidirectional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-connector-${group.localId}`}>Connector</Label>
            <Select
              disabled={lockedFields}
              value={group.connectorTypeId}
              onValueChange={(value) => onUpdate(group.localId, { connectorTypeId: value })}
            >
              <SelectTrigger id={`port-group-connector-${group.localId}`}>
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
            <Label htmlFor={`port-group-count-${group.localId}`}>Count</Label>
            <Input
              readOnly={lockedFields}
              id={`port-group-count-${group.localId}`}
              min="1"
              type="number"
              value={group.count}
              onChange={(event) => onUpdate(group.localId, { count: Number(event.target.value) })}
            />
          </div>
        </div>
        <div className="port-group-row port-group-row-secondary">
          <div className="form-field">
            <Label>Mode</Label>
            <Button
              aria-pressed={group.createPlannedCables}
              className="interface-auto-toggle"
              disabled={lockedFields}
              type="button"
              variant={group.createPlannedCables ? 'default' : 'outline'}
              onClick={() => onPlannedCablesToggle(group.localId, !group.createPlannedCables)}
            >
              AUTO
            </Button>
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-prefix-${group.localId}`}>Cable Prefix</Label>
            <Select
              disabled={lockedFields}
              value={group.cablePrefix}
              onValueChange={(value) =>
                onUpdate(group.localId, {
                  cablePrefix: value,
                })
              }
            >
              <SelectTrigger id={`port-group-prefix-${group.localId}`}>
                <SelectValue placeholder="Select prefix" />
              </SelectTrigger>
              <SelectContent>
                {cablePrefixes.map((prefix) => (
                  <SelectItem key={prefix.id} value={prefix.prefix}>
                    {prefix.prefix}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-pattern-${group.localId}`}>Label Pattern</Label>
            <Input
              id={`port-group-pattern-${group.localId}`}
              value={group.portLabelPattern}
              onChange={(event) => onUpdate(group.localId, { portLabelPattern: event.target.value })}
            />
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-first-cable-${group.localId}`}>First Cable Number</Label>
            <Input
              id={`port-group-first-cable-${group.localId}`}
              min="1"
              readOnly={lockedFields || group.createPlannedCables}
              type="number"
              value={group.firstCableNumber ?? ''}
              onChange={(event) =>
                onUpdate(group.localId, {
                  firstCableNumber: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-last-cable-${group.localId}`}>Last Cable Number</Label>
            <Input
              id={`port-group-last-cable-${group.localId}`}
              readOnly
              value={formatPortGroupLastCableNumber(group)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
