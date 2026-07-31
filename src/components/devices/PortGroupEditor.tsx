import { ChevronDown, GripVertical, X } from 'lucide-react';
import { normalizeHexColor } from '../../domain/colors';
import { getConnectorsForCategory } from '../../domain/connectorCompatibility';
import type { Category, Settings } from '../../domain/types';
import type { DevicePortGroupDraft } from '../../state/projectTypes';
import { ConnectorIcon } from '../common/ConnectorIcon';
import { resolveConnectorIconKey } from '../common/connectorVisuals';
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
  categories,
  group,
  lockedFields = false,
  settings,
  isCollapsed = false,
  onCategoryChange,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onPlannedCablesToggle,
  onRemove,
  onToggleCollapsed,
  onUpdate,
}: {
  categories: Category[];
  group: DevicePortGroupForm;
  lockedFields?: boolean;
  settings: Settings;
  isCollapsed?: boolean;
  onCategoryChange: (localId: string, categoryId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (localId: string) => void;
  onDragStart?: (localId: string) => void;
  onDrop?: (localId: string) => void;
  onPlannedCablesToggle: (localId: string, checked: boolean) => void;
  onRemove?: (localId: string) => void;
  onToggleCollapsed?: (localId: string) => void;
  onUpdate: (localId: string, updates: Partial<DevicePortGroupForm>) => void;
}) {
  const connectorTypes = getConnectorsForCategory(settings, group.categoryId);
  const currentConnectorType = settings.connectorTypes.find(
    (connector) => connector.id === group.connectorTypeId,
  );
  const inheritedColor = categories.find((category) => category.id === group.categoryId)?.color ?? '#64748B';
  const displayColor = normalizeHexColor(group.colorOverride ?? '') ?? inheritedColor;
  const iconKey = resolveConnectorIconKey(currentConnectorType?.iconKey);

  return (
    <Card
      className={`port-group-editor${isCollapsed ? ' is-collapsed' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(group.localId);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(group.localId);
      }}
    >
      <CardHeader className="port-group-editor-heading">
        <div className="interface-card-title">
          <span
            aria-label={`Drag ${group.name || 'I/O interface'}`}
            className="interface-drag-handle"
            data-ui="interface-drag-handle"
            draggable
            role="button"
            tabIndex={0}
            onDragEnd={onDragEnd}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', group.localId);
              onDragStart?.(group.localId);
            }}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </span>
          <ConnectorIcon
            color={displayColor}
            iconKey={iconKey}
            label={`${currentConnectorType?.name ?? 'Generic'} connector`}
          />
          <div>
            <CardTitle>{group.name || 'I/O Interface'}</CardTitle>
            <p>
              {group.direction} / {group.count || 'set count'} ports
            </p>
          </div>
        </div>
        <div className="interface-card-actions">
          <span
            aria-label={`Interface color ${displayColor}`}
            className="interface-color-dot"
            role="img"
            style={{ backgroundColor: displayColor }}
          />
          <Badge>{formatPortGroupRange(group)}</Badge>
          <Button
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.name || 'I/O interface'}`}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onToggleCollapsed?.(group.localId)}
          >
            <ChevronDown className={`h-4 w-4 interface-collapse-icon${isCollapsed ? '' : ' open'}`} />
          </Button>
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
      {isCollapsed ? null : (
        <>
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
                  onChange={(event) =>
                    onUpdate(group.localId, {
                      count: event.target.value === '' ? '' : Number(event.target.value),
                    })
                  }
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
          <CardContent className="port-group-color-content">
            <div className="port-group-color-row">
              <div className="form-field">
                <Label htmlFor={`port-group-color-picker-${group.localId}`}>Color</Label>
                <input
                  id={`port-group-color-picker-${group.localId}`}
                  type="color"
                  value={displayColor}
                  onChange={(event) =>
                    onUpdate(group.localId, { colorOverride: normalizeHexColor(event.target.value) })
                  }
                />
              </div>
              <div className="form-field">
                <Label>Default</Label>
                <Button
                  disabled={!group.colorOverride}
                  type="button"
                  variant="outline"
                  onClick={() => onUpdate(group.localId, { colorOverride: null })}
                >
                  Clear override
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
