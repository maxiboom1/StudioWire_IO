# StudioWire IO Data Model

Project data is the source of truth. StudioWire IO imports and exports a single JSON document using current schema version `0.2.8.4`. Older `0.1.0`, `0.2.4.1`, `0.2.5.1`, `0.2.6.0`, `0.2.7.0`, `0.2.7.1`, `0.2.7.2`, `0.2.7.3`, `0.2.8.0`, `0.2.8.1`, `0.2.8.2`, and `0.2.8.3` projects are accepted on import and normalized to the current schema.

Active StudioWire IO app and project schema versions always match and use four numeric components.

IDs are stable strings. References use IDs, not display names. Dates use ISO 8601 strings.

## ProjectRoot

Top-level project object:

- `schemaVersion`: current fixed string `0.2.8.4`.
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
- `categoryConnectorAssignments`: `CategoryConnectorAssignment[]`
- `connectorCompatibilityGroups`: `ConnectorCompatibilityGroup[]`
- `connectorCompatibilityGroupMembers`: `ConnectorCompatibilityGroupMember[]`
- `cablePrefixes`: `CablePrefix[]`
- `rackDefaults`: `RackDefaults`
- `labelRules`: `LabelRules`

Default categories are Video, Audio, Network, Reference, RF, and Control. Each category has a default cable prefix.

Connector types are a global catalog, for example BNC, XLR, PL, RJ45, and HDMI. Categories assign the connector types that are valid for that category. A port can select only connector types assigned to its category.

Direct connections are strict by default: endpoints must share a category and the same connector type. Connector compatibility groups are the advanced override for direct cross-connector connections inside one category. If two different connector types are members of the same category-scoped group, they can be connected directly. Connectors in different categories or different groups require conversion somewhere else in the design.

Default connector assignments include common broadcast options. For example, Video includes BNC, Micro BNC, MiniDIN, SDI DIN, and HDMI; Audio includes BNC, XLR, PL, RCA, RJ45, DB25, MADI BNC, and MADI Fiber. Default connector groups are intentionally small: Video has a Video connector group for SDI-style connectors, and Audio has an Audio connector group for XLR/PL/RCA.

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

Connector type names must be unique in the global connector catalog.

## CategoryConnectorAssignment

Fields:

- `id`
- `categoryId`
- `connectorTypeId`

A category connector assignment makes one global connector type selectable for ports in one category. The same connector type can be assigned to multiple categories, for example BNC can be assigned to Video, Audio, Reference, and RF.

## ConnectorCompatibilityGroup

Fields:

- `id`
- `categoryId`
- `name`

Compatibility group names must be unique within a category. Connectors in the same category and group are directly compatible; connectors in different groups require conversion somewhere else in the design.

## ConnectorCompatibilityGroupMember

Fields:

- `id`
- `groupId`
- `connectorTypeId`

Group members must reference connectors assigned to the group's category.

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

Current UI-created devices use `planned` or `retired` status. Retired devices and terminal blocks are immutable historical objects. Their ports are excluded from connection candidates, domain connection commands reject them, and editing or moving them is blocked. Existing historical cable references may remain for audit, but active connected cables referencing retired objects are validation errors. Retiring a device marks its related planned cables and ledger allocations as `retired`; it does not free cable numbers for reuse.

`locationId` may be `null` for virtual devices and for unassigned handling. Rack and non-rack devices must reference an existing location.

Standard devices use `kind: "device"` and may be virtual, non-rack, or rack-mounted. Imported older devices without `kind` are normalized to standard devices.

Terminal blocks use `kind: "terminal_block"` and are stored in the same `devices` array. They omit `code`, `manufacturer`, `model`, and `role`; current-version imports reject those standard-device fields on terminal blocks. Terminal blocks are always rack-mounted, must reference a rack and bottom RU, and must have `rackSizeRu: 1`.

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

Standard devices use `input`, `output`, or `bidirectional` groups. Terminal blocks use exactly one `rear` group and one `front` group with matching count, category, and exact connector type.

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
- `sideAEndpoint`: `Endpoint`
- `sideBEndpoint`: `Endpoint`
- `labelTop`
- `labelMiddle`
- `labelBottom`
- `notes`

Cable records represent physical cable numbers. Direction is handled by connected port direction, not by cable side naming.

Planned cable labels use this rule:

- `labelTop`: side A/source-side display label for generated planned cables.
- `labelMiddle`: cable number.
- `labelBottom`: side B/destination-side display label for generated planned cables.

Output and bidirectional planned cables use the device port as the source and unknown destination. Input planned cables use unknown source and the device port as the destination.

Terminal block rear ports do not generate planned cables. Terminal block front ports may optionally generate planned cables; those planned cables use the front port as a `tb_port` side A endpoint and an unknown side B endpoint.

Connected cables use `sideAEndpoint` and `sideBEndpoint` as neutral physical ends. When two ports are connected, the selected/clicked port is written to side A and the chosen target is written to side B. If both ports have planned cable numbers, the lower cable number becomes `connected` and the higher cable becomes `retired`.

Connected cable endpoints must share a category, and each endpoint connector must be assigned to that category. Exact connector type matches are directly compatible. Different connector types must be members of the same category-scoped compatibility group.

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

`tb_port` identifies a terminal block port endpoint. Rear and front TB faces are distinct ports. Connection-chain validation follows matching rear/front ports by terminal block connector index.

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

## Import And Persistence

Browser import, startup recovery, CLI validation, project summaries, and fixture checks use the same staged import pipeline. The runtime structural validator introduced in `0.2.7.1` is the authoritative project boundary: JSON syntax parsing, safe schema-version inspection, structural preflight, one-step legacy migration to the current version, current JSON Schema validation, and relational validation. Structural errors block import and preserve the open project. Relational validation issues are normal `ValidationIssue[]` data and may be imported when the structure is valid.

Autosave stores compact JSON under `studiowire.io.project.current`. Startup recovery also checks known legacy keys in order, so a corrupt newer record does not block a valid older record. Storage read, write, remove, quota, and security failures must not crash the app; failed autosave leaves the in-memory project exportable.
