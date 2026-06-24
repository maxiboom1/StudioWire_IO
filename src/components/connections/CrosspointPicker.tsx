import { useMemo, useState } from 'react';
import { describePortConnection } from '../../domain/connections';
import { useProject } from '../../state/ProjectContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import {
  buildConnectionCandidates,
  countCandidatePorts,
  groupConnectionCandidates,
} from './connectionCandidates';

interface CrosspointPickerProps {
  portId: string;
  className: string;
  ariaLabel: string;
}

export function CrosspointPicker({ portId, className, ariaLabel }: CrosspointPickerProps) {
  const { project, connectPorts, disconnectPort } = useProject();
  const [search, setSearch] = useState('');
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const originPort = project.ports.find((port) => port.id === portId) ?? null;
  const candidates = useMemo(() => buildConnectionCandidates(project, portId), [project, portId]);
  const visibleCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return candidates;
    }

    return candidates.filter((candidate) => candidate.searchText.includes(normalizedSearch));
  }, [candidates, search]);
  const groupedCandidates = useMemo(() => groupConnectionCandidates(visibleCandidates), [visibleCandidates]);
  const isSearching = search.trim().length > 0;
  const originConnection = useMemo(() => describePortConnection(project, portId), [project, portId]);

  function toggleLocation(key: string) {
    setExpandedLocations((current) => toggleSetValue(current, key));
  }

  function toggleDevice(key: string) {
    setExpandedDevices((current) => toggleSetValue(current, key));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={className} type="button" aria-label={ariaLabel} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="crosspoint-menu">
        <DropdownMenuLabel>
          Crosspoint
          {originPort ? <span>{originPort.label}</span> : null}
        </DropdownMenuLabel>
        <div className="crosspoint-search" onKeyDown={(event) => event.stopPropagation()}>
          <Input
            aria-label="Search ports"
            placeholder="Search location, device, or port"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <DropdownMenuSeparator />
        {originConnection.isConnected ? (
          <>
            <DropdownMenuItem
              className="crosspoint-clear-item"
              onSelect={() => {
                disconnectPort({ portId });
              }}
            >
              <span>Clear connection</span>
              {originConnection.cable ? <small>{originConnection.cable.number}</small> : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <div className="crosspoint-candidates">
          {groupedCandidates.length === 0 ? (
            <div className="crosspoint-empty">No matching ports.</div>
          ) : (
            groupedCandidates.map((locationGroup) => (
              <div className="crosspoint-location-group" key={locationGroup.key}>
                <button
                  className="crosspoint-tree-toggle crosspoint-location-name"
                  type="button"
                  onClick={() => toggleLocation(locationGroup.key)}
                >
                  <span
                    className={
                      isExpanded(expandedLocations, locationGroup.key, isSearching) ? 'expanded' : ''
                    }
                  >
                    {'>'}
                  </span>
                  <strong>{locationGroup.name}</strong>
                  <small>{countCandidatePorts(locationGroup.devices)}</small>
                </button>
                {isExpanded(expandedLocations, locationGroup.key, isSearching)
                  ? locationGroup.devices.map((deviceGroup) => (
                      <div className="crosspoint-device-group" key={deviceGroup.device.id}>
                        <button
                          className="crosspoint-tree-toggle crosspoint-device-name"
                          type="button"
                          onClick={() => toggleDevice(deviceGroup.device.id)}
                        >
                          <span
                            className={
                              isExpanded(expandedDevices, deviceGroup.device.id, isSearching)
                                ? 'expanded'
                                : ''
                            }
                          >
                            {'>'}
                          </span>
                          <strong>
                            {deviceGroup.device.kind === 'terminal_block' ? 'TB' : 'Device'}:{' '}
                            {deviceGroup.device.name}
                          </strong>
                          <small>{deviceGroup.ports.length}</small>
                        </button>
                        {isExpanded(expandedDevices, deviceGroup.device.id, isSearching)
                          ? deviceGroup.ports.map((candidate) => (
                              <DropdownMenuItem
                                className="crosspoint-port-item"
                                key={candidate.port.id}
                                onSelect={() => {
                                  connectPorts({ fromPortId: portId, toPortId: candidate.port.id });
                                }}
                              >
                                <span>{candidate.port.label}</span>
                                <small>{candidate.port.direction}</small>
                              </DropdownMenuItem>
                            ))
                          : null}
                      </div>
                    ))
                  : null}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toggleSetValue(current: Set<string>, value: string) {
  const next = new Set(current);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
}

function isExpanded(expanded: Set<string>, key: string, forceOpen: boolean) {
  return forceOpen || expanded.has(key);
}
