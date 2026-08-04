# StudioWire IO Data Model

Project data is the source of truth. StudioWire IO imports and exports a single JSON document using current schema version `0.2.9.02`. Version `0.2.8.25` is the retained compatibility baseline for the View model: importing or restoring that version first adds `views: []` at `0.2.9.00`, then advances through the shape-preserving `0.2.9.00 -> 0.2.9.01 -> 0.2.9.02` migration chain. These migrations do not change existing engineering data. Other older internal-development exports may still be rejected before the first public/released schema baseline.

Active StudioWire IO app and project schema versions always match and use four numeric components.

IDs are stable strings. References use IDs, not display names. Dates use ISO 8601 strings.

## Device Templates

Device templates are bundled application catalog data, not part of `ProjectRoot`. They use the independent template schema version `0.1.0` and live under `collections/devices/<Manufacturer>/<Category>/<Model>/*.studiowire-device.json`.

A template contains Device Name, Device sub-name, manufacturer, model, primary category name, optional rack height, and ordered I/O interfaces. Each I/O interface contains I/O Name, direction, category name, connector name, count, label pattern, and an effective `#RRGGBB` color.

Templates use semantic category and connector names because project IDs are local to one project. They never store object IDs, locations, folders, rack placement, cable prefixes, cable numbers, numbering ranges, planned cable IDs, or cable records. Loading a template resolves names against project settings, derives cable prefixes from matched categories, allocates fresh proposed ranges through the normal Add Device workflow, and populates the form without creating a device.

## ProjectRoot

Top-level project object:

- `schemaVersion`: current fixed string `0.2.9.02`.
- `project`: `ProjectInfo`.
- `settings`: `Settings`.
- `locations`: `Location[]`.
- `subLocations`: `SubLocation[]`.
- `racks`: `Rack[]`.
- `views`: `ProjectView[]`.
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

Default categories are VIDEO, Audio, Network, Reference, RF, Control, and AV. Each category has a default cable prefix and a hex display color. The matching default cable prefixes are V, A, N, R, RF, C, and AV.

Connector types are a global catalog, for example BNC, XLR, PL, RJ45, and HDMI. Each connector has an `iconKey` selecting a fixed in-app CSS-drawn connector symbol. Connector icons are app-owned CSS drawings, not user-provided image assets, file paths, or stored SVG. Categories assign the connector types that are valid for that category. A port can select only connector types assigned to its category.

Direct connections are strict by default: endpoints must share a category and the same connector type. Connector compatibility groups are the advanced override for direct cross-connector connections inside one category. If two different connector types are members of the same category-scoped group, they can be connected directly. Connectors in different categories or different groups require conversion somewhere else in the design.

Default connector assignments follow the maintained operator baseline. VIDEO includes BNC, Micro BNC, and SDI DIN. Audio includes BNC, XLR, PL, RCA, RJ45, DB25, MADI BNC, MADI Fiber, and SFP. Network includes RJ45, SFP, and Fiber; Reference and RF use BNC; Control uses GPIO and RJ45; and AV uses DVI. MiniDIN, HDMI, and Other remain available in the global connector catalog without default category assignments.

The default Video connector group exists with no members. The default Audio connector group contains XLR, PL, and RCA. An empty group does not make different connector types compatible.

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
- `description`

## SubLocation

Fields:

- `id`
- `locationId`
- `name`
- `description`

Sub-locations are the stored data records for user-facing folders inside one main location. A rack, device, or terminal block may reference a folder in its assigned location or may leave `subLocationId` as `null`.

Folders, racks, standard devices, and terminal blocks share one trimmed, case-insensitive project-item name namespace. Locations use a separate trimmed, case-insensitive namespace. Folder deletion is allowed only when no rack, standard device, or terminal block references it. Location changes preserve `subLocationId` only when the folder belongs to the new location; otherwise `subLocationId` is reset to `null`.

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

Terminal block edits preserve existing port IDs by rear/front face and connector index. Increasing count appends matching ports. Reducing count is blocked while a removed port is referenced by a cable. TB deletion removes the TB, its groups, and its ports while restoring any surviving standard-device planned cable owner affected by a connection.

## ProjectView

Views are project-owned presentation records. They arrange live references to existing devices, terminal blocks, and racks on an ISO page and store drawing-only annotations. A View never owns or copies engineering records and cannot create, remove, renumber, connect, or disconnect ports or physical cables.

Fields:

- `id`
- `name`: trimmed, required, and case-insensitively unique among Views only
- `description`
- `pageSize`: `a4` or `a3`
- `orientation`: `portrait` or `landscape`
- `placements`: `ViewPlacement[]`
- `lines`: `ViewLine[]`
- `annotations`: `ViewAnnotation[]`

A new View defaults to A3 portrait. Page dimensions are stored implicitly by `pageSize` and `orientation`: A4 portrait is 210 x 297 mm, A4 landscape is 297 x 210 mm, A3 portrait is 297 x 420 mm, and A3 landscape is 420 x 297 mm. All View coordinates and dimensions use millimetres. Format changes retain coordinates; items outside the new page remain loadable and are reported as warnings.

### ViewPlacement

Fields:

- `id`
- `sourceType`: `device` or `rack`
- `sourceId`: live reference to an existing record of the declared source type
- `xMm`
- `yMm`
- `scale`: uniform scale from 0.25 through 3
- `labelOverride`: View-local label or `null`

An exact source may appear only once in one View. A rack and a device mounted in that rack are different representations and may both be placed. Standard devices, terminal blocks, and racks remain live read-only representations of their project records; placement data never changes location or rack assignment.

Placement bounds use the same deterministic natural sizes for validation, insertion, movement, and rendering. Standard devices and terminal blocks are 92 mm wide, with a 10 mm header and 2.4 mm per rendered live I/O row, using at least one row. Standard-device row count is the larger of its ordered left and right presentation columns; terminal-block row count is the larger of its rear and front faces. Racks are 58 mm wide, with an 8 mm header and 3 mm per current rack unit. A missing-source placeholder is 60 x 30 mm. The stored uniform scale multiplies both natural dimensions.

Version `0.2.9.02` renders placements as read-only live references. The `0.2.9.02-fix1` UI maintenance label does not change that schema: standard View devices reuse the Device Workspace technical diagram presentation at a compact View scale, with passive endpoint stubs replacing crosspoint controls. Device/TB port labels, cable numbers, destination summaries, and rack contents are always resolved from current project records and are never copied into a View. The optional `labelOverride` is presentation-only. Adding, moving, scaling, labeling, or removing a placement may mutate only the owning View's `placements` plus normal project stamps/change-log metadata; removing a placement also removes View lines attached to that placement. It cannot modify locations, folders, rack assignments, devices, port groups, ports, cables, endpoints, or numbering ledgers.

Picker insertion scans from a 10 mm page margin in 5 mm steps and chooses the first in-page, non-overlapping position. When no such position exists, insertion uses a 2.5 mm diagonal cascade and leaves overlap for manual correction. Direct navigator drops and committed movement use the fixed 2.5 mm grid unless Alt bypasses snapping. Default-scale direct drops and normal moves are clamped to the current page when the live block can fit.

### ViewLine

Fields:

- `id`
- `from`: `ViewLineEndpoint`
- `to`: `ViewLineEndpoint`
- `label`: the View-local custom meaning of the line
- `waypoints`: `ViewPoint[]`

Each endpoint contains `placementId`, a boundary `side` (`top`, `right`, `bottom`, or `left`), and an `offset` from 0 through 1 along that side. Both endpoints must belong to different placements in the same View. Parallel lines between the same placements are allowed. View lines are neutral manual cable-group marks: they have no engineering direction, cable count, cable IDs, or port IDs.

Routes are orthogonal. Empty `waypoints` requests automatic routing. Manual bend editing stores absolute millimetre points; moving a placement updates its attached endpoints while preserving those waypoints. Resetting a route clears its waypoints. Removing a placement also removes lines attached to it.

### ViewAnnotation

Text annotation fields:

- `id`
- `kind`: `text`
- `xMm`
- `yMm`
- `widthMm`: positive width
- `text`
- `size`: `small`, `medium`, or `large`

Group annotation fields:

- `id`
- `kind`: `group`
- `xMm`
- `yMm`
- `widthMm`: positive width
- `heightMm`: positive height
- `label`

Group rectangles are visual backgrounds, not containers; moving one does not move enclosed elements. View render ordering is group rectangles, lines, placements, text, then transient selection controls.

Deleting a source device or terminal block removes its matching placements from every View and removes only lines attached to those placements. Deleting a rack does the same for direct rack placements. Deleting a device mounted inside a placed rack does not remove the rack placement. Unrelated annotations and placements remain unchanged. Structurally valid imported dangling references remain loadable, are reported by relational validation, and may be rendered as removable missing-source placeholders.

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

`portLabelPattern` supports `{I/O NAME}`, `{NAME}`, `{DEVICE}`, `{00}`, and `{000}`. `{I/O NAME}` is the canonical token for the parent I/O interface name. `{NAME}` remains a supported alias for existing patterns and resolves identically. `{DEVICE}` resolves to the device label prefix. `{00}` resolves to the 1-based port index padded to two digits. `{000}` resolves to the 1-based port index padded to three digits. Relabeling an existing interface must always resolve the interface-name tokens from `PortGroup.name`, never from the device sub-name.

Standard devices use `input`, `output`, or `bidirectional` groups. Terminal blocks use exactly one `rear` group and one `front` group with matching count, category, and exact connector type.

Both terminal-block groups always use `createPlannedCables: false`, null allocation fields, and ports with `plannedCableId: null`.

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

Terminal block ports never generate planned cables or reserve numbering ranges. Connecting two TB front ports allocates one cable number from the category default prefix at connection time. Disconnecting that patch retires the connection-owned number so it is not reused.

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

Browser import, startup recovery, CLI validation, project summaries, and fixture checks use the same staged import pipeline. The runtime structural validator introduced in `0.2.7.1` is the authoritative project boundary: JSON syntax parsing, safe schema-version inspection, compatible-version migration, current JSON Schema validation, and relational validation. Structural errors block import and preserve the open project. Relational validation issues are normal `ValidationIssue[]` data and may be imported when the structure is valid. Version `0.2.8.25` migrates by adding an empty Views collection at `0.2.9.00`; previous-stage `0.2.9.00` and `0.2.9.01` data then advance unchanged through the staged chain to `0.2.9.02` before current structural validation.

Views are stored in the normal project JSON and the same compact autosave under `studiowire.io.project.current`; no separate View file or storage key exists. Startup recovery also checks known legacy keys in order, so a corrupt newer record does not block a valid older record. A restored `0.2.8.25` autosave is migrated to the current schema in memory and written back through the normal autosave lifecycle. Storage read, write, remove, quota, and security failures must not crash the app; failed autosave leaves the in-memory project exportable.
