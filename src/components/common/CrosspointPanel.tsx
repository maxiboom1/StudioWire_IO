import { useMemo, useState } from 'react';
import {
  getCompatibleTargetEndpointCandidates,
  getCompatibleTargetEndpointCandidatesForObject,
  resolveEndpointInfo,
  type CrosspointObjectTarget,
} from '../../domain/crosspointing';
import type { EndpointMeta } from '../../domain/canvasDrag';
import type { Endpoint } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export type CrosspointAnchor = EndpointMeta;

export function CrosspointPanel({
  anchor,
  objectFilter,
  onClear,
}: {
  anchor: CrosspointAnchor | null;
  objectFilter?: CrosspointObjectTarget & { label?: string };
  onClear: () => void;
}) {
  const { project, connectCableEndpoint } = useProject();
  const [selectedTargetKey, setSelectedTargetKey] = useState('');
  const candidates = useMemo(
    () =>
      anchor
        ? objectFilter
          ? getCompatibleTargetEndpointCandidatesForObject(project, anchor.endpoint, objectFilter)
          : getCompatibleTargetEndpointCandidates(project, anchor.endpoint)
        : [],
    [anchor, objectFilter, project],
  );
  const selectedCandidate = candidates.find((candidate) => endpointKey(candidate.endpoint) === selectedTargetKey) ?? null;

  if (!anchor) {
    return null;
  }

  function handleConnect() {
    if (!anchor || !selectedCandidate) {
      return;
    }

    connectCableEndpoint({
      anchorEndpoint: anchor.endpoint,
      anchorCableId: anchor.cableId,
      anchorSide: anchor.side,
      targetEndpoint: selectedCandidate.endpoint,
    });
    setSelectedTargetKey('');
    onClear();
  }

  return (
    <div className="crosspoint-panel" aria-label="Endpoint target picker">
      <div className="crosspoint-panel-heading">
        <div>
          <h2>Connect Endpoint</h2>
          <p>
            {anchor.label}
            {objectFilter?.label ? ` -> choose on ${objectFilter.label}` : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="crosspoint-target-list">
        {candidates.length === 0 ? (
          <p>No compatible available targets.</p>
        ) : (
          candidates.slice(0, 80).map((candidate) => {
            const display = resolveEndpointInfo(project, candidate.endpoint);
            const key = endpointKey(candidate.endpoint);

            return (
              <button
                className={key === selectedTargetKey ? 'crosspoint-target selected' : 'crosspoint-target'}
                data-ui="crosspoint-target"
                key={key}
                type="button"
                onClick={() => setSelectedTargetKey(key)}
              >
                <span>
                  <strong>{display.label}</strong>
                  <small>{display.objectName}</small>
                </span>
                <Badge>{candidate.occupancy}</Badge>
              </button>
            );
          })
        )}
      </div>
      <Button type="button" disabled={!selectedCandidate} onClick={handleConnect}>
        Apply Target
      </Button>
    </div>
  );
}

function endpointKey(endpoint: Endpoint): string {
  return `${endpoint.type}:${endpoint.id ?? ''}`;
}
