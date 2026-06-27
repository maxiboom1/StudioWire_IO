import type { Location, Rack } from '../../domain/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ADD_RACK_PLACEHOLDER, getRackOptionLabel } from './rackCanvasModel';

export function RackViewSelector({
  addableRacks,
  hasReachedRackLimit,
  locations,
  onAddRack,
}: {
  addableRacks: Rack[];
  hasReachedRackLimit: boolean;
  locations: Location[];
  onAddRack: (rackId: string) => void;
}) {
  return (
    <Select
      disabled={hasReachedRackLimit || addableRacks.length === 0}
      value={ADD_RACK_PLACEHOLDER}
      onValueChange={onAddRack}
    >
      <SelectTrigger className="rack-view-select" aria-label="Add rack to canvas">
        <SelectValue placeholder="Add rack" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ADD_RACK_PLACEHOLDER}>Add rack</SelectItem>
        {addableRacks.map((candidate) => (
          <SelectItem key={candidate.id} value={candidate.id}>
            {getRackOptionLabel(candidate, locations)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
