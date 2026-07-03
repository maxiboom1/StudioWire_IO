import {
  CONNECTOR_ICON_KEY_VALUES,
  type ConnectorIconKey,
  type PortGroup,
  type ProjectRoot,
} from '../../domain/types';
import { normalizeHexColor } from '../../domain/colors';

export const CONNECTOR_ICON_OPTIONS: { key: ConnectorIconKey; label: string }[] = [
  { key: 'bnc', label: 'BNC' },
  { key: 'xlr', label: 'XLR' },
  { key: 'rj45', label: 'RJ45' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'sfp', label: 'SFP' },
  { key: 'hdmi', label: 'HDMI' },
  { key: 'db25', label: 'DB25' },
  { key: 'generic', label: 'Generic' },
];

const CONNECTOR_ICON_KEY_SET = new Set<string>(CONNECTOR_ICON_KEY_VALUES);

export function resolveConnectorIconKey(value: string | null | undefined): ConnectorIconKey {
  return value && CONNECTOR_ICON_KEY_SET.has(value) ? (value as ConnectorIconKey) : 'generic';
}

export function getConnectorIconLabel(iconKey: string | null | undefined): string {
  const resolved = resolveConnectorIconKey(iconKey);

  return CONNECTOR_ICON_OPTIONS.find((option) => option.key === resolved)?.label ?? 'Generic';
}

export function getPortGroupColor(
  project: ProjectRoot,
  portGroup: Pick<PortGroup, 'categoryId' | 'colorOverride'>,
) {
  const override = portGroup.colorOverride ? normalizeHexColor(portGroup.colorOverride) : null;

  if (override) {
    return override;
  }

  return (
    project.settings.categories.find((category) => category.id === portGroup.categoryId)?.color ?? '#64748B'
  );
}

export function getPortGroupConnectorIconKey(
  project: ProjectRoot,
  portGroup: Pick<PortGroup, 'connectorTypeId'>,
): ConnectorIconKey {
  const connectorType = project.settings.connectorTypes.find(
    (connector) => connector.id === portGroup.connectorTypeId,
  );

  return resolveConnectorIconKey(connectorType?.iconKey);
}
