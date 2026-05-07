# StudioWire IO Validation Rules v0.1

Validation runs against `ProjectRoot` data. It returns `ValidationIssue[]` and only mutates project state when the UI stores the returned issues after the user clicks Validate.

## Implemented Rules

- `duplicate-object-id`: object IDs must not collide across project data objects.
- `duplicate-cable-number`: cable numbers must be unique per project.
- `planned-cable-duplicate`: planned cables must not duplicate another planned cable number.
- `cable-number-format-invalid`: cable numbers must match `PREFIX-0001` style formatting.
- `cable-index-mismatch`: `Cable.prefix` and `Cable.index` must match the parsed cable number.
- `unknown-category`: device, port group, and port category references must exist in settings.
- `unknown-connector-type`: port group and port connector type references must exist in settings.
- `unknown-cable-prefix`: port group, cable, and numbering ledger prefixes must exist in settings.
- `duplicate-location-name`: duplicate location names are reported as warnings.
- `rack-without-location`: rack `locationId` must reference an existing location.
- `rack-height-positive`: rack height must be a positive integer.
- `rack-name-required`: rack name is required.
- `device-name-required`: device name is required.
- `device-code-required`: device code is required.
- `device-without-location`: non-virtual devices must reference an existing location.
- `rack-mounted-device-without-rack`: rack-mounted devices must reference a rack.
- `rack-mounted-device-invalid-bottom-ru`: rack-mounted devices require a positive bottom RU.
- `rack-mounted-device-invalid-size-ru`: rack-mounted devices require a positive rack size.
- `rack-mounted-device-exceeds-rack-height`: rack-mounted devices must fit within rack height.
- `rack-ru-overlap`: rack-mounted devices in the same rack must not overlap rack units.
- `port-group-count-mismatch`: generated ports must match `PortGroup.count`.
- `port-group-count-positive`: port group count must be positive.
- `port-without-parent-device`: each port must reference an existing parent device.
- `port-without-parent-port-group`: each port must reference an existing parent port group.
- `cable-linked-to-missing-port`: device-port cable endpoints and port planned cable links must resolve.
- `allocated-range-without-owner`: allocated numbering ranges must have owner type and owner ID.
- `overlapping-numbering-ledger-ranges`: ranges in the same ledger must not overlap.
- `reserved-gap-reused`: reserved gap numbers must not be used by cables or allocated ranges.

## Numbering Rules

Cable numbers are unique project data. Allocating a later first number creates a `reserved_gap` range for skipped numbers, and the UI asks for confirmation before committing that reservation.

Reserved gaps and retired ranges remain unavailable. v0.1 does not free cable numbers when a device is retired.

## UI Behavior

The TopBar Validate button runs the same validator used by the CLI tools and stores issues in `project.validationIssues`. The bottom validation panel groups issues by severity and selects the related project object when possible.
