import { getSubLocationOptions } from '../../domain/subLocations';
import type { ProjectRoot } from '../../domain/types';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const NO_SUB_LOCATION_VALUE = 'none';

export function SubLocationSelect({
  id,
  label = 'Folder',
  locationId,
  project,
  value,
  onChange,
}: {
  id: string;
  label?: string;
  locationId: string;
  project: ProjectRoot;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) {
  const options = getSubLocationOptions(project, locationId);

  return (
    <div className="form-field">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? NO_SUB_LOCATION_VALUE}
        onValueChange={(nextValue) => onChange(nextValue === NO_SUB_LOCATION_VALUE ? null : nextValue)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select folder" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id ?? NO_SUB_LOCATION_VALUE} value={option.id ?? NO_SUB_LOCATION_VALUE}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
