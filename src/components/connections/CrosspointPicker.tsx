import { useMemo, useState } from 'react';
import { getConnectionTargetStatus } from '../../domain/connections';
import type { Device, Location, Port, ProjectRoot } from '../../domain/types';
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

interface CrosspointPickerProps {
  portId: string;
  className: string;
  ariaLabel: string;
}

interface PortCandidate {
  location: Location | null;
  device: Device;
  port: Port;
  searchText: string;
}

export function CrosspointPicker({ portId, className, ariaLabel }: CrosspointPickerProps) {
  const { project, connectPorts } = useProject();
  const [search, setSearch] = useState('');
  const originPort = project.ports.find((port) => port.id === portId) ?? null;
  const candidates = useMemo(() => buildCandidates(project, portId), [project, portId]);
  const visibleCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return candidates;
    }

    return candidates.filter((candidate) => candidate.searchText.includes(normalizedSearch));
  }, [candidates, search]);
  const groupedCandidates = useMemo(() => groupCandidates(visibleCandidates), [visibleCandidates]);

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
        <div className="crosspoint-candidates">
          {groupedCandidates.length === 0 ? (
            <div className="crosspoint-empty">No matching ports.</div>
          ) : (
            groupedCandidates.map((locationGroup) => (
              <div className="crosspoint-location-group" key={locationGroup.key}>
                <div className="crosspoint-location-name">{locationGroup.name}</div>
                {locationGroup.devices.map((deviceGroup) => (
                  <div className="crosspoint-device-group" key={deviceGroup.device.id}>
                    <div className="crosspoint-device-name">
                      {deviceGroup.device.kind === 'terminal_block' ? 'TB' : 'Device'}: {deviceGroup.device.name}
                    </div>
                    {deviceGroup.ports.map((candidate) => {
                      const status = getConnectionTargetStatus(project, {
                        fromPortId: portId,
                        toPortId: candidate.port.id,
                      });

                      return (
                        <DropdownMenuItem
                          className="crosspoint-port-item"
                          disabled={!status.ok}
                          key={candidate.port.id}
                          onSelect={() => {
                            if (status.ok) {
                              connectPorts({ fromPortId: portId, toPortId: candidate.port.id });
                            }
                          }}
                        >
                          <span>{candidate.port.label}</span>
                          <small>{status.ok ? candidate.port.direction : status.reason}</small>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildCandidates(project: ProjectRoot, originPortId: string): PortCandidate[] {
  return project.ports
    .filter((port) => port.id !== originPortId)
    .map((port) => {
      const device = project.devices.find((candidate) => candidate.id === port.deviceId);

      if (!device) {
        return null;
      }

      const locationId =
        device.locationId ??
        (device.rackId ? project.racks.find((rack) => rack.id === device.rackId)?.locationId ?? null : null);
      const location = locationId ? project.locations.find((candidate) => candidate.id === locationId) ?? null : null;

      return {
        location,
        device,
        port,
        searchText: `${location?.name ?? ''} ${device.name} ${device.labelPrefix} ${port.label} ${port.direction}`
          .toLowerCase(),
      };
    })
    .filter((candidate): candidate is PortCandidate => candidate !== null)
    .sort((left, right) => {
      const locationSort = (left.location?.name ?? '').localeCompare(right.location?.name ?? '');

      if (locationSort !== 0) {
        return locationSort;
      }

      const deviceSort = left.device.name.localeCompare(right.device.name);

      if (deviceSort !== 0) {
        return deviceSort;
      }

      return left.port.index - right.port.index;
    });
}

function groupCandidates(candidates: PortCandidate[]) {
  const locations: Array<{
    key: string;
    name: string;
    devices: Array<{ device: Device; ports: PortCandidate[] }>;
  }> = [];

  for (const candidate of candidates) {
    const locationKey = candidate.location?.id ?? 'unassigned';
    let locationGroup = locations.find((group) => group.key === locationKey);

    if (!locationGroup) {
      locationGroup = {
        key: locationKey,
        name: candidate.location?.name ?? 'Unassigned',
        devices: [],
      };
      locations.push(locationGroup);
    }

    let deviceGroup = locationGroup.devices.find((group) => group.device.id === candidate.device.id);

    if (!deviceGroup) {
      deviceGroup = { device: candidate.device, ports: [] };
      locationGroup.devices.push(deviceGroup);
    }

    deviceGroup.ports.push(candidate);
  }

  return locations;
}
