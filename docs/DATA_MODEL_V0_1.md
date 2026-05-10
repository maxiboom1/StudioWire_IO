# StudioWire IO Data Model v0.1

Project data is the source of truth. StudioWire IO v0.3.1 imports and exports a single JSON document using schema version `0.2.0`.

Schema version `0.2.0` adds terminal block data arrays. Legacy `0.1.0` project JSON imports through normalization and receives empty terminal block arrays.

IDs are stable strings. References use IDs, not display names. Dates use ISO 8601 strings.

## ProjectRoot

Top-level project object:

- `schemaVersion`: fixed string `0.2.0`.
- `project`: `ProjectInfo`.
- `settings`: `Settings`.
- `locations`: `Location[]`.
- `racks`: `Rack[]`.
- `devices`: `Device[]`.
- `terminalBlocks`: `TerminalBlock[]`.
- `portGroups`: `PortGroup[]`.
- `terminalBlockPortGroups`: `TerminalBlockPortGroup[]`.
- `ports`: `Port[]`.
- `terminalBlockPorts`: `TerminalBlockPort[]`.
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

Fields:

- `id`
- `name`
- `code`
- `manufacturer`
- `model`
- `categoryId`
- `locationId`
- `role`
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

## TerminalBlock

Terminal blocks are device-like project objects, but they are not `Device` records.

Fields:

- `id`
- `name`
- `code`
- `manufacturer`
- `model`
- `categoryId`
- `locationId`
- `role`
- `labelPrefix`
- `mountType`: `rack`, `non_rack`, or `virtual`
- `rackId`
- `rackSizeRu`
- `rackBottomRu`
- `status`: `planned`, `connected`, or `retired`
- `notes`
- `createdAt`
- `updatedAt`

`locationId` may be `null` for virtual terminal blocks. Rack and non-rack terminal blocks must reference an existing location. Rack placement uses the same existing rack fields as devices.

## PortGroup

Fields:

- `id`
- `deviceId`
- `name`
- `direction`: `input`, `output`, or `bidirectional`
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

`portLabelPattern` supports only `{DEVICE}` and `{000}` in v0.1. `{DEVICE}` resolves to the device label prefix. `{000}` resolves to the 1-based port index padded to three digits.

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

## TerminalBlockPortGroup

Fields:

- `id`
- `terminalBlockId`
- `name`
- `categoryId`
- `connectorTypeId`
- `positionCount`
- `startPosition`
- `portLabelPattern`
- `cablePrefix`
- `plannedCableMode`: `none`, `rear`, `front`, or `both`
- `firstCableNumber`
- `lastCableNumber`

Terminal block port groups describe a contiguous set of physical terminal block positions. They do not create logical connection objects.

## TerminalBlockPort

Fields:

- `id`
- `terminalBlockId`
- `portGroupId`
- `positionIndex`
- `face`: `rear` or `front`
- `label`
- `categoryId`
- `connectorTypeId`

Each physical terminal block position has separate rear and front ports. Rear/front continuity is not modeled as a `Cable`.

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

`Cable` remains the physical cable segment object. A cable connects exactly two endpoints. StudioWire IO does not create a separate logical `Connection` object in v0.3.1.

Planned cable labels use this rule:

- `labelTop`: source label.
- `labelMiddle`: cable number.
- `labelBottom`: destination label.

Output and bidirectional planned cables use the device port as the source and unknown destination. Input planned cables use unknown source and the device port as the destination.

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

`device_port` endpoint IDs reference `Port.id`. `tb_port` endpoint IDs reference `TerminalBlockPort.id`. `unknown` endpoints keep `id: null`. `external` remains future-facing.

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
