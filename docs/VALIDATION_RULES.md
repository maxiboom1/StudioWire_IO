# StudioWire IO Validation Rules

Validation runs against `ProjectRoot` data. It returns `ValidationIssue[]` and only mutates project state when the UI stores the returned issues after the user clicks Validate.

Current-version JSON imports are structurally validated exactly as supplied before any migration or cleanup. Legacy-only fields such as `sourceEndpoint`, `destinationEndpoint`, and terminal-block standard-device metadata are accepted only by the specific historical migration step that owns them; current imports report schema errors at the offending path.

## Implemented Rules

- `duplicate-object-id`: object IDs must not collide across project data objects.
- `duplicate-cable-number`: cable numbers must be unique per project.
- `planned-cable-duplicate`: planned cables must not duplicate another planned cable number.
- `cable-number-format-invalid`: cable numbers must match `PREFIX-0001` style formatting.
- `cable-index-mismatch`: `Cable.prefix` and `Cable.index` must match the parsed cable number.
- `duplicate-cable-prefix-value`: cable prefix values must be unique.
- `invalid-cable-prefix-format`: cable prefixes must contain uppercase letters only.
- `category-default-prefix-missing`: category default cable prefixes must exist in settings.
- `duplicate-category-name`: category names must be unique.
- `empty-category-name`: category names are required.
- `connector-group-category-missing`: connector groups must reference an existing category.
- `duplicate-connector-group-name`: connector group names must be unique within a category.
- `empty-connector-group-name`: connector group names are required.
- `category-connector-assignment-category-missing`: category connector assignments must reference an existing category.
- `category-connector-assignment-connector-missing`: category connector assignments must reference an existing connector type.
- `duplicate-category-connector-assignment`: a connector type can be assigned only once to one category.
- `connector-group-member-group-missing`: connector group members must reference an existing connector group.
- `connector-group-member-connector-missing`: connector group members must reference an existing connector type.
- `connector-group-member-unassigned-connector`: connector group members must use connectors assigned to the group's category.
- `duplicate-connector-group-member`: a connector type can be listed only once in one compatibility group.
- `duplicate-connector-type-name`: connector type names must be unique in the global connector catalog.
- `empty-connector-type-name`: connector type names are required.
- `unknown-category`: device, port group, and port category references must exist in settings.
- `unknown-connector-type`: port group and port connector type references must exist in settings.
- `port-group-connector-not-assigned-to-category`: port group connector types must be assigned to the port group category.
- `port-connector-not-assigned-to-category`: port connector types must be assigned to the port category.
- `unknown-cable-prefix`: port group, cable, and numbering ledger prefixes must exist in settings.
- `duplicate-location-name`: duplicate location names are reported as warnings.
- `rack-without-location`: rack `locationId` must reference an existing location.
- `rack-height-positive`: rack height must be a positive integer.
- `rack-name-required`: rack name is required.
- `device-name-required`: device name is required.
- `device-code-required`: standard device code is required.
- `terminal-block-rack-mounted`: terminal blocks must be rack-mounted.
- `terminal-block-size-fixed`: terminal blocks must be fixed at 1 RU.
- `device-without-location`: every device and terminal block must reference an existing location.
- `device-references-missing-rack`: a device with a rack reference must point at an existing rack.
- `rack-mounted-device-without-rack`: rack-mounted devices must reference a rack.
- `rack-location-device-location-mismatch`: rack-mounted devices must be in the same location as their rack.
- `rack-mounted-device-invalid-bottom-ru`: rack-mounted devices require a positive bottom RU.
- `rack-mounted-device-invalid-size-ru`: rack-mounted devices require a positive rack size.
- `rack-mounted-device-exceeds-rack-height`: rack-mounted devices must fit within rack height.
- `rack-ru-overlap`: rack-mounted devices in the same rack must not overlap rack units.
- `port-group-count-mismatch`: generated ports must match `PortGroup.count`.
- `port-group-count-positive`: port group count must be positive.
- `device-invalid-port-direction`: standard device port groups must use input, output, or bidirectional.
- `terminal-block-face-groups-required`: terminal blocks must have exactly one rear and one front group.
- `terminal-block-invalid-port-direction`: terminal block groups and ports must use rear or front.
- `terminal-block-face-mismatch`: terminal block rear and front groups must have matching count, category, and connector type.
- `terminal-block-rear-planned-cables`: terminal block rear ports/groups must not create or link planned cables.
- `terminal-block-front-cable-source-mismatch`: terminal block front planned cables must use the front port as source.
- `port-without-parent-device`: each port must reference an existing parent device.
- `port-without-parent-port-group`: each port must reference an existing parent port group.
- `port-group-numbering-range-missing`: locked port group numbering range references must resolve to a ledger range.
- `port-group-numbering-range-reserved-gap`: port groups must reference allocated ranges, not reserved gaps.
- `port-group-planned-cables-first-required`: planned-cables port groups require `firstCableNumber`.
- `port-group-planned-cables-last-required`: planned-cables port groups require `lastCableNumber`.
- `port-group-planned-cables-range-required`: planned-cables port groups require `numberingRangeId`.
- `port-group-planned-cable-count-mismatch`: planned-cables port groups must have one linked planned cable per generated port.
- `port-group-port-missing-planned-cable`: every port in a planned-cables group must have `plannedCableId`.
- `port-group-planned-cable-outside-range`: planned cable numbers must be covered by the port group's allocated ledger range.
- `port-group-no-planned-cables-has-allocation`: no-planned-cables port groups must keep `firstCableNumber`, `lastCableNumber`, and `numberingRangeId` as `null`.
- `port-group-no-planned-cables-port-linked`: ports in no-planned-cables groups must not have `plannedCableId`.
- `port-group-no-planned-cables-cable-reference`: planned cables must not reference ports from no-planned-cables groups.
- `cable-linked-to-missing-port`: device-port and terminal-block-port cable endpoints and port planned cable links must resolve.
- `planned-cable-port-backlink-mismatch`: planned cables with device-port or terminal-block-port endpoints must have a matching `Port.plannedCableId`.
- `planned-cable-missing-port-endpoint`: a port's planned cable must reference that port as source or destination.
- `planned-output-cable-source-mismatch`: output planned cables must use the output port as source.
- `planned-input-cable-destination-mismatch`: input planned cables must use the input port as destination.
- `planned-bidirectional-cable-source-mismatch`: bidirectional planned cables use the bidirectional port as side A.
- `planned-cable-label-middle-mismatch`: planned cable `labelMiddle` must equal `Cable.number`.
- `planned-cable-label-top-mismatch`: planned output and bidirectional cable `labelTop` must equal the source endpoint label.
- `planned-cable-label-bottom-mismatch`: planned input cable `labelBottom` must equal the destination endpoint label.
- `connected-cable-endpoints-required`: connected cables must reference two different project ports.
- `connection-category-mismatch`: connected cable endpoints must share a category.
- `connection-connector-group-mismatch`: connected cable endpoints with different connector types must use connectors in the same compatibility group.
- `connection-segment-invalid`: a connected cable segment must be valid for the selected endpoint directions/faces.
- `multiple-active-connections`: one port must not have more than one active connected cable.
- `connection-chain-direction-invalid`: a resolved chain through terminal blocks must not link incompatible standard device port directions.
- `allocated-range-without-owner`: allocated numbering ranges must have owner type and owner ID.
- `ledger-next-suggested-positive`: ledger `nextSuggested` must be a positive integer.
- `ledger-next-suggested-available`: ledger `nextSuggested` must not fall inside an allocated range or reserved gap.
- `numbering-range-positive`: numbering range `from` and `to` values must be positive integers.
- `numbering-range-to-before-from`: numbering range `to` must be greater than or equal to `from`.
- `numbering-range-prefix-mismatch`: numbering range prefix must match the parent ledger prefix.
- `overlapping-numbering-ledger-ranges`: ranges in the same ledger must not overlap.
- `planned-cable-without-ledger-range`: planned cables must be covered by an allocated ledger range.
- `reserved-gap-reused`: reserved gap numbers must not be used by cables or allocated ranges.

## Numbering Rules

Cable numbers are unique project data. Allocating a later first number creates a `reserved_gap` range for skipped numbers, and the UI asks for confirmation before committing that reservation.

When a port group has `createPlannedCables` set to `false`, StudioWire IO does not allocate ledger ranges, does not create reserved gaps, and does not generate planned cables for that group.

Reserved gaps remain unavailable. Deleting a standard device removes that device's owned allocated ranges and planned cables, so those released cable numbers can be suggested and reallocated again.

Terminal blocks may create planned cable numbers for FRONT ports only. REAR ports remain unnumbered. Terminal block front planned cables use `tb_port` side A endpoints.

When a connection is created, at least one selected endpoint must already have a planned cable slot. If both selected endpoints have planned cable numbers, the lower cable number becomes the active `connected` cable and the higher number is marked `retired`.

Connection endpoints must share a category. Exact connector type equality is directly compatible when both connectors are assigned to the endpoint category. Different connector types must belong to the endpoint category and the same category-scoped compatibility group.

## UI Behavior

The TopBar Validate button runs the same validator used by the CLI tools and stores issues in `project.validationIssues`. The bottom validation panel groups issues by severity and selects the related project object when possible.
