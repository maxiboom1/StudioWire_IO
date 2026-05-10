# StudioWire IO Data Model

Project data is the source of truth. StudioWire IO imports and exports a single JSON document using current schema version `0.2.4.1`. Older `0.1.0` projects are accepted on import and normalized to the current schema.

IDs are stable strings. References use IDs, not display names. Dates use ISO 8601 strings.

## ProjectRoot

Top-level project object:

- `schemaVersion`: current fixed string `0.2.4.1`.
- `project`: `ProjectInfo`.
- `settings`: `Settings`.
- `locations`: `Location[]`.
- `racks`: `Rack[]`.
- `devices`: `Device[]`.
- `portGroups`: `PortGroup[]`.
- `ports`: `Port[]`.
- `cables`: `Cable[]`.
- `numberingLedgers`: `NumberingLedger[]`.
- `validationIssues`: `ValidationIssue[]`.
- `changeLog`: `ChangeLogEntry[]`.

## ProjectInfo

Fields:

- `id`
- `name`
- `customer`
- `revision`
- `status`: `draft`, `approved`, or `as_built`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

## Settings

Fields:

- `categories`: `Category[]`
- `connectorTypes`: `ConnectorType[]`
- `cablePrefixes`: `CablePrefix[]`
- `rackDefaults`: `RackDefaults`
- `labelRules`: `LabelRules`

Default categories are Video, Audio, Network, Reference, RF, and Control. Each category has a default cable prefix.

Default connector types are BNC, XLR, RJ45, SFP, Fiber, HDMI, SDI DIN, DB25, MADI BNC, MADI Fiber, GPIO, and Other.

Cable numbers use `PREFIX-0001` formatting, for example `V-0001`, `A-0021`, `N-0100`, and `RF-0001`.

## Category

Fields:

- `id`
- `name`
- `defaultCablePrefix`

## ConnectorType

Fields:

- `id`
- `name`

## CablePrefix

Fields:

- `id`
- `prefix`
- `name`

## RackDefaults

Fields:

- `heightRu`
- `numberingDirection`: `bottom_to_top` or `top_to_bottom`

## LabelRules

Fields:

- `cableNumberFormat`
- `cableNumberPadding`

## Location

Fields:

- `id`
- `name`
- `type`
- `description`

## Rack

Fields:

- `id`
- `locationId`
- `name`
- `heightRu`
- `numberingDirection`: `bottom_to_top` or `top_to_bottom`

## Device

Devices use a `kind` discriminator.

Fields:

- `id`
- `name`
- `kind`: `device` or `terminal_block`
- `code` for standard devices
- `manufacturer` for standard devices
- `model` for standard devices
- `categoryId`
- `locationId`
- `role` for standard devices
- `labelPrefix`
- `mountType`: `rack`, `non_rack`, or `virtual`
- `rackId`
- `rackSizeRu`
- `rackBottomRu`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

Current UI-created devices use `planned` or `retired` status. Retiring a device marks its related planned cables and ledger allocations as `retired`; it does not free cable numbers for reuse.

`locationId` may be `null` for virtual devices and for unassigned handling. Rack and non-rack devices must reference an existing location.

Standard devices use `kind: "device"` and may be virtual, non-rack, or rack-mounted. Imported older devices without `kind` are normalized to standard devices.

Terminal blocks use `kind: "terminal_block"` and are stored in the same `devices` array. They omit `code`, `manufacturer`, `model`, and `role`. Terminal blocks are always rack-mounted, must reference a rack and bottom RU, and must have `rackSizeRu: 1`.

## PortGroup

Fields:

- `id`
- `deviceId`
- `name`
- `direction`: `input`, `output`, `bidirectional`, `rear`, or `front`
- `categoryId`
- `connectorTypeId`
- `count`
- `portLabelPattern`
- `cablePrefix`
- `firstCableNumber`
- `lastCableNumber`
- `numberingRangeId`
- `createPlannedCables`
- `locked`

`portLabelPattern` supports `{DEVICE}`, `{00}`, and `{000}`. `{DEVICE}` resolves to the device label prefix. `{00}` resolves to the 1-based port index padded to two digits. `{000}` resolves to the 1-based port index padded to three digits.

Standard devices use `input`, `output`, or `bidirectional` groups. Terminal blocks use exactly one `rear` group and one `front` group with matching count, category, and connector type.

PortGroup allocation semantics are mode-specific:

- If `createPlannedCables` is `true`, `firstCableNumber`, `lastCableNumber`, and `numberingRangeId` must be set. The range must reference an allocated or retired ledger range, generated ports must link to planned cables, and planned cable numbers must be covered by that range.
- If `createPlannedCables` is `false`, `firstCableNumber`, `lastCableNumber`, and `numberingRangeId` must be `null`. Generated ports must keep `plannedCableId` as `null`, no planned cables are created, and no cable ledger allocation is made.

## Port

Fields:

- `id`
- `deviceId`
- `portGroupId`
- `index`
- `name`
- `label`
- `direction`
- `categoryId`
- `connectorTypeId`
- `plannedCableId`
- `notes`

## Cable

Fields:

- `id`
- `number`
- `prefix`
- `index`
- `status`: `planned`, `connected`, or `retired`
- `sourceEndpoint`: `Endpoint`
- `destinationEndpoint`: `Endpoint`
- `labelTop`
- `labelMiddle`
- `labelBottom`
- `notes`

v0.1 records planned cable numbers. Complete connection modeling remains outside v0.1 scope.

Planned cable labels use this rule:

- `labelTop`: source label.
- `labelMiddle`: cable number.
- `labelBottom`: destination label.

Output and bidirectional planned cables use the device port as the source and unknown destination. Input planned cables use unknown source and the device port as the destination.

Terminal block rear ports do not generate planned cables in `0.2.4.1`. Terminal block front ports may optionally generate planned cables; those planned cables use the front port as a `tb_port` source endpoint and an unknown destination.

## NumberingLedger

Fields:

- `prefix`
- `nextSuggested`
- `ranges`: `NumberingRange[]`

`nextSuggested` must be a positive integer greater than every `to` value in the ledger ranges, including allocated, reserved gap, and retired ranges.

## NumberingRange

Fields:

- `id`
- `prefix`
- `from`
- `to`
- `status`: `allocated`, `reserved_gap`, or `retired`
- `ownerType`
- `ownerId`
- `reason`
- `createdAt`

Reserved gaps cannot be reused.

Retired ranges also remain in the ledger. They continue to reserve historical cable numbers and must not be reallocated.

## Endpoint

Fields:

- `type`: `device_port`, `tb_port`, `external`, or `unknown`
- `id`
- `label`

`tb_port` identifies a terminal block port endpoint. In `0.2.4.1`, generated TB planned cables may reference FRONT ports as `tb_port` source endpoints. Full device-to-TB and front-to-front connection logic is still outside scope.

## ValidationIssue

Fields:

- `id`
- `severity`: `error`, `warning`, or `info`
- `code`
- `message`
- `objectType`
- `objectId`

## ChangeLogEntry

Fields:

- `id`
- `timestamp`
- `message`
- `author`
