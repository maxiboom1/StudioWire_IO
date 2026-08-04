# Codex implementation prompt - StudioWire IO `0.2.9.00`

## Assignment

Implement only the StudioWire IO `0.2.9.00` View model and compatibility groundwork.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely before editing. Do not implement View navigator UI, a page workspace, placement rendering, drawing tools, undo/redo, export, authentication, a server, or a database in this prompt.

The repository starts at app/schema version `0.2.8.25`. The target app version and current project schema version are both exactly `0.2.9.00`.

## Goal

Introduce the complete persistent View presentation contract in one schema change so later prompts can be UI-focused. Views must be stored in normal project JSON and autosave while remaining isolated from physical device, rack, port, cable, endpoint, and numbering behavior.

## Documentation-first requirement

Before changing the TypeScript/JSON shape, update `docs/DATA_MODEL.md` and `docs/VALIDATION_RULES.md` with the contract and validation rules in this prompt. Keep those edits in the same implementation, but perform them first as required by `AGENTS.md`.

## Required version updates

Synchronize `0.2.9.00` across:

- `package.json` and `package-lock.json`.
- `STUDIOWIRE_CURRENT_VERSION` and related current-version types.
- JSON Schema title and `schemaVersion.const`.
- Current sample project.
- README current-version text and changelog.
- `docs/DATA_MODEL.md`, `docs/PRODUCT_SPEC.md`, and other version-checked documents/UI strings.

Do not bump past `0.2.9.00`.

## Persistent model

Add `views: ProjectView[]` to `ProjectRoot` as a required top-level array. Add exported enum-value constants, derived union types, and these required serialized shapes:

```ts
interface ProjectView {
  id: string;
  name: string;
  description: string;
  pageSize: 'a4' | 'a3';
  orientation: 'portrait' | 'landscape';
  placements: ViewPlacement[];
  lines: ViewLine[];
  annotations: ViewAnnotation[];
}

interface ViewPlacement {
  id: string;
  sourceType: 'device' | 'rack';
  sourceId: string;
  xMm: number;
  yMm: number;
  scale: number;
  labelOverride: string | null;
}

interface ViewLine {
  id: string;
  from: ViewLineEndpoint;
  to: ViewLineEndpoint;
  label: string;
  waypoints: ViewPoint[];
}

interface ViewLineEndpoint {
  placementId: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  offset: number;
}

interface ViewPoint {
  xMm: number;
  yMm: number;
}

type ViewAnnotation =
  | {
      id: string;
      kind: 'text';
      xMm: number;
      yMm: number;
      widthMm: number;
      text: string;
      size: 'small' | 'medium' | 'large';
    }
  | {
      id: string;
      kind: 'group';
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
      label: string;
    };
```

All fields are required in JSON. Use empty arrays/strings or `null`, not optional serialized properties.

JSON Schema constraints:

- `ProjectView.id`, trimmed `name`, and every nested ID/reference are non-empty strings.
- `pageSize`, `orientation`, `sourceType`, endpoint `side`, annotation `kind`, and text `size` use closed enums.
- `xMm`, `yMm`, waypoint coordinates, widths, heights, scale, and offset are finite JSON numbers.
- Placement scale is `0.25..3`.
- Endpoint offset is `0..1`.
- Text/group dimensions are strictly positive.
- `labelOverride` is string or null.
- Additional properties are rejected at every new object level.

New/empty projects and the current sample must include `views: []` in this prompt. The illustrative populated sample View belongs to `0.2.9.04`, not this groundwork release.

## Pure View domain layer

Create focused non-React modules for:

- ISO page dimensions and millimetre geometry.
- Name normalization/conflict detection in the View-only namespace.
- View creation/update/deletion.
- Placement, line, and annotation CRUD.
- Placement removal with attached-line cleanup.
- Source-reference impact counting and cleanup across every View.
- Immutable whole-canvas replacement for the later undo controller.

Required rules:

- Default new View: next available `View N`, A3 portrait, empty description/content.
- Persist trimmed View names and reject empty/duplicate names case-insensitively.
- Reject a duplicate `{ sourceType, sourceId }` placement inside one View.
- Reject lines whose endpoints refer to the same placement.
- Allow parallel lines between two different placements.
- Removing a placement removes every attached View line.
- Source cleanup removes only matching placements and their lines; unrelated annotations and other Views remain unchanged.
- No View operation may create/update/delete ports, cables, endpoints, numbering ranges, rack assignments, or location hierarchy.

Use millimetre geometry constants and page dimensions from `docs/0.2.9.xx/README.md`. The initial bounds helper must handle page points, annotations, and known placement natural bounds so validation and later rendering share one calculation.

## State architecture

Add stable View command inputs/contracts to the focused state type modules. Add explicit actions and public commands for:

- Add/update/delete View.
- Add/update/delete placement.
- Add/update/delete line.
- Add/update/delete annotation.
- Replace one View's `placements`, `lines`, and `annotations` atomically for later undo/redo.

Put the action family in a dedicated `src/state/projectHandlers/viewHandlers.ts`-style module. The reducer entry point must remain a thin exhaustive dispatcher. Command creation generates IDs and dispatches; domain helpers enforce rules; React is not involved.

Every successful mutation stamps project update metadata/change log once. Failed/no-op mutations must not stamp the project and must provide a useful status message.

Integrate source cleanup into standard-device, terminal-block, and rack deletion. Rack deletion remains blocked while mounted devices exist; when otherwise allowed, it also removes rack placements. Device deletion removes direct device/TB placements but naturally leaves any parent rack placement.

## Import, export, and compatibility

Views are part of the single project JSON document. Do not introduce a separate file, storage key, or serializer.

Preserve `0.2.8.25`:

- Copy the real pre-change current sample shape into one maintained `docs/samples/legacy/project-0-2-8-25.studiowire.json` fixture before updating the current sample.
- Add `0.2.8.25` to the supported-version list alongside current `0.2.9.00`.
- Add a real migration step `0.2.8.25 -> 0.2.9.00` that requires a valid object and returns the same project plus `views: []`.
- Update import preflight to require the current `views` array while allowing the historical migration path to supply it.
- Verify startup restore can migrate an active-key `0.2.8.25` record instead of deleting it as unsupported.

Do not add unrelated identity migrations or a broad legacy fixture matrix.

## Validation

Add a focused View validation module and integrate it with `validateProject`.

Use these exact codes:

- `view-name-required` - error.
- `duplicate-view-name` - error for case-insensitive duplicates.
- `duplicate-view-placement-source` - error.
- `view-placement-device-missing` - error.
- `view-placement-rack-missing` - error.
- `view-line-placement-missing` - error for either missing endpoint placement.
- `view-line-self-reference` - error.
- `view-geometry-invalid` - error for invalid scale/offset/dimensions/route geometry that reaches relational validation.
- `view-item-outside-page` - warning for content outside the selected page.

Include View, placement, line, and annotation IDs in project-wide duplicate-ID validation. Validation issues use object type `view` and the parent View ID when navigation to a nested object is not yet available.

## Tests

Add focused tests proving:

- Empty/sample projects contain `views: []`.
- The current schema accepts the complete View union and rejects extra/malformed fields at precise paths.
- `0.2.8.25` imports migrate to `0.2.9.00` with all existing domain arrays unchanged and `views: []`.
- Active autosave restore preserves a migrated `0.2.8.25` project.
- View names use a separate unique namespace.
- Duplicate placements and self-lines are blocked; parallel lines are allowed.
- Placement removal and source deletion cascade only matching placements/lines.
- Dangling imported references produce the documented issues.
- Out-of-page content is a warning.
- Successful View actions change only `views`, project stamps, status, and change log; engineering arrays remain deep-equal.
- Export/import round-trip preserves View data exactly.

Do not add Playwright scenarios or broad characterization tests.

## Documentation

Update:

- `docs/DATA_MODEL.md` with the complete model and same-JSON persistence.
- `docs/VALIDATION_RULES.md` with the new codes.
- `docs/PRODUCT_SPEC.md` with the View concept but no UI claims beyond this release.
- `docs/ROADMAP.md` to distinguish v0.2.9 in-app Views from v0.3 exported drawing documents.
- `docs/V0_2_ACCEPTANCE.md` for the additive presentation contract and migration.
- README changelog/current support.
- `docs/ideas/multi-device-sheet-concept.md` with a short superseded notice linking to `docs/0.2.9.xx/README.md`; preserve the original discussion below the notice.

## Verification

Run focused domain/schema/import/reducer/storage tests, then:

```text
npm run typecheck
npm run build
npm run clean
npm run clean:check
```

Do not run Git commands, Playwright installation/E2E, release gates, or source packaging.

Finish with a concise summary of the model, migration behavior, tests, and verification commands. Stop at `0.2.9.00`; do not begin prompt 02.
