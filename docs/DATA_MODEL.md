# StudioWire IO Data Model

Project data is the source of truth. StudioWire IO imports and exports a single JSON document using current schema version `0.2.8.18`. This internal development schema is current-shape only: older dev exports may be rejected before the first public/released schema baseline. New internal dev versions do not automatically receive identity migrations.

Active StudioWire IO app and project schema versions always match and use four numeric components.

IDs are stable strings. References use IDs, not display names. Dates use ISO 8601 strings.

## ProjectRoot

Top-level project object:

- `schemaVersion`: current fixed string `0.2.8.18`.
- `project`: `ProjectInfo`.
- `settings`: `Settings`.
- `locations`: `Location[]`.
- `subLocations`: `SubLocation[]`.
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

Default categories are Video, Audio, Network, Reference, RF, and Control. Each category has a default cable prefix and a hex display color.

Connector types are a global catalog, for example BNC, XLR, PL, RJ45, and HDMI. Each connector has an `iconKey` selecting a fixed in-app CSS-drawn connector symbol. Connector icons are app-owned CSS drawings, not user-provided image assets, file paths, or stored SVG. Categories assign the connector types that are valid for that category. A port can select only connector types assigned to its category.

Direct connections are strict by default: endpoints must share a category and the same connector type. Connector compatibility groups are the advanced override for direct cross-connector connections inside one category. If two different connector types are members of the same category-scoped group, they can be connected directly. Connectors in different categories or different groups require conversion somewhere else in the design.

Default connector assignments include common broadcast options. For example, Video includes BNC, Micro BNC, MiniDIN, SDI DIN, and HDMI; Audio includes BNC, XLR, PL, RCA, RJ45, DB25, MADI BNC, and MADI Fiber. Default connector groups are intentionally small: Video has a Video connector group for SDI-style connectors, and Audio has an Audio connector group for XLR/PL/RCA.

Cable numbers use `PREFIX-0001` formatting, for example `V-0001`, `A-0021`, `N-0100`, and `RF-0001`.

## Category

Fields:

- `id`
- `name`
- `defaultCablePrefix`
- `color`: `#RRGGBB`

## ConnectorType

Fields:

- `id`
- `name`
- `iconKey`: `bnc`, `xlr`, `rj45`, `fiber`, `sfp`, `hdmi`, `db25`, or `generic`

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

New racks default to 48 RU unless the user changes the Add Rack form. Existing rack records keep their stored `heightRu` values and are not rewritten when defaults change.

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

## SubLocation

Fields:

- `id`
- `locationId`
- `name`
- `description`

Sub-locations are the stored data records for user-facing folders inside one main location. A rack, device, or terminal block may reference a folder in its assigned location or may leave `subLocationId` as `null`.

Folder deletion removes the folder and clears matching `subLocationId` values from racks, devices, and terminal blocks. Location changes preserve `subLocationId` only when the folder belongs to the new location; otherwise `subLocationId` is reset to `null`.

## Rack

Fields:

- `id`
- `locationId`
- `subLocationId`
- `name`
- `heightRu`
- `numberingDirection`: `bottom_to_top` or `top_to_bottom`

`subLocationId` is optional and may be `null`; when set, it must reference a folder inside the same location. Folder membership is organizational. A rack may be moved into a folder, back to its parent location, or to another location.

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
- `subLocationId`
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

Current devices use `planned` or `connected` status. Standard-device deletion is a hard delete: the device, its child port groups, its child ports, its device-owned planned cables, and its device-owned allocated numbering ranges are removed. Any surviving connected cable slots affected by the deleted device are reset to planned state where they still have a surviving owner port. Released allocated numbers may be suggested and reallocated again; reserved gaps remain blocked.

`locationId` is required for all devices and terminal blocks and must reference an existing location. `subLocationId` is optional and may be `null`; when set, it must reference a folder inside the same location. Virtual and non-rack devices are still assigned to a location even when they are not rack-mounted.

Rack-mounted devices and terminal blocks can move between folders inside their rack's current location. Moving them to another location is blocked until they are released from the rack. Moving a rack to another location updates mounted items to that location and clears any folder assignment that does not belong to the new location.

Standard devices use `kind: "device"` and may be virtual, non-rack, or rack-mounted. Rack-mounted standard devices can be unassigned from a rack, which clears `rackId` and `rackBottomRu`, changes `mountType` to `non_rack`, preserves `rackSizeRu`, and keeps the rack's current location when the rack exists. Imported older devices without `kind` are normalized to standard devices.

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
- `colorOverride`

`portLabelPattern` supports `{NAME}`, `{DEVICE}`, `{00}`, and `{000}`. `{NAME}` resolves to the current I/O interface name. `{DEVICE}` resolves to the device label prefix. `{00}` resolves to the 1-based port index padded to two digits. `{000}` resolves to the 1-based port index padded to three digits.

Standard devices use `input`, `output`, or `bidirectional` groups. Terminal blocks use exactly one `rear` group and one `front` group with matching count, category, and exact connector type.

PortGroup allocation semantics are mode-specific:

- If `createPlannedCables` is `true`, `firstCableNumber`, `lastCableNumber`, and `numberingRangeId` must be set. The range must reference an allocated ledger range, generated ports must link to planned cables, and planned cable numbers must be covered by that range.
- If `createPlannedCables` is `false`, `firstCableNumber`, `lastCableNumber`, and `numberingRangeId` must be `null`. Generated ports must keep `plannedCableId` as `null`, no planned cables are created, and no cable ledger allocation is made.

`colorOverride` is either `null` or a `#RRGGBB` display color. `null` means the group inherits its category color.

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

`nextSuggested` must be a positive integer that points to the earliest currently available number for the prefix. It must not fall inside an allocated range or reserved gap.

## NumberingRange

Fields:

- `id`
- `prefix`
- `from`
- `to`
- `status`: `allocated` or `reserved_gap`
- `ownerType`
- `ownerId`
- `reason`
- `createdAt`

Reserved gaps cannot be reused. Allocated ranges owned by a deleted standard device's port groups are removed during hard delete so those cable numbers may be reused.

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

Browser import, startup recovery, CLI validation, project summaries, and fixture checks use the same staged import pipeline. The runtime structural validator introduced in `0.2.7.1` is the authoritative project boundary: JSON syntax parsing, safe schema-version inspection, current JSON Schema validation, and relational validation. Structural errors block import and preserve the open project. Relational validation issues are normal `ValidationIssue[]` data and may be imported when the structure is valid.

Autosave stores compact JSON under `studiowire.io.project.current`. Startup recovery also checks known legacy keys in order, so a corrupt newer record does not block a valid older record. Storage read, write, remove, quota, and security failures must not crash the app; failed autosave leaves the in-memory project exportable.
