# StudioWire IO Data Model v0.1

Project data is the source of truth. StudioWire IO v0.1 imports and exports a single JSON document using schema version `0.1.0`.

IDs are stable strings. References use IDs, not display names. Dates use ISO 8601 strings.

## ProjectRoot

Top-level project object:

- `schemaVersion`: fixed string `0.1.0`.
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

`portLabelPattern` supports only `{DEVICE}` and `{000}` in v0.1.1. `{DEVICE}` resolves to the device label prefix. `{000}` resolves to the 1-based port index padded to three digits.

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

## NumberingLedger

Fields:

- `prefix`
- `nextSuggested`
- `ranges`: `NumberingRange[]`

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

`tb_port` is reserved as an endpoint type for future compatibility. v0.1 does not implement terminal block logic.

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
