# Codex implementation prompt - StudioWire IO `0.2.8.14`

## Assignment

Implement **only** the StudioWire IO `0.2.8.14` CSS connector icons, category colors, I/O color override, and final validation release.

This is a **feature-dev task**. Do not run Git commands, create commits, create tags, rewrite history, run source packaging, or run release gates.

The repository must start at app/schema version `0.2.8.13` with model groundwork, sub-location workflows, rack unassign, Add/Edit Device tabs, `{NAME}` labels, and I/O ordering already implemented.

## Release goal

Replace placeholder Settings icon/color fields with real user-facing controls, render connector icons as app-owned CSS drawings, support per-I/O interface color overrides, and apply the colors/icons in the device I/O editor and generated device drawing.

This prompt also performs the single complete feature-dev validation pass for the `0.2.8.11` through `0.2.8.14` cycle.

## Required version policy

The target app version and current schema version are both exactly:

```text
0.2.8.14
```

Update current-version metadata, docs, current sample if affected, and README changelog. No new schema shape beyond prior prompts is expected.

Do not preserve import compatibility for older internal dev versions.

## Visual references

Use these files as visual references only:

- `docs/icons/example for rj45 icon.JPG`
- `docs/icons/example for XLR icon.JPG`
- PDFs under `docs/icons/RGE 2024 BOOK`

Rules:

- Do not import these images into the app.
- Do not copy the JPG/PDF files into source assets.
- Do not add upload or file-picker behavior.
- Do not store image paths in project data.
- Do not store SVG strings in project data.
- Do not require the user to provide icon files.
- Icons must be schematic CSS/app components drawn from the fixed `iconKey` values.

The goal is a clean industrial/broadcast-style symbol language, not exact copies of the references.

## CSS connector icons

Create a reusable connector icon display component and helper mapping, using the existing `ConnectorType.iconKey` values.

Required icon keys:

- `bnc`
- `xlr`
- `rj45`
- `fiber`
- `sfp`
- `hdmi`
- `db25`
- `generic`

Requirements:

- Icons are drawn with HTML/CSS and/or app-owned React markup.
- Prefer CSS classes and simple spans/divs over SVG.
- If an icon needs small geometric marks, use CSS borders, pseudo-elements, radial gradients, or nested spans.
- Keep icons legible at small UI sizes.
- Provide a generic fallback for unknown/missing keys.
- Keep mapping in a focused helper/module, not scattered through UI components.
- Add accessible labels where icons carry meaning.

Suggested visual language:

- RJ45: rectangular jack silhouette with small contact ticks.
- XLR: circular face with three pin dots.
- BNC: circular coax connector with center pin.
- Fiber/SFP: compact rectangular/fiber port marks.
- HDMI/DB25: port silhouettes.
- Generic: neutral connector circle/slot.

## Settings UI

### Connector catalog

Replace the `Future icon` placeholder.

Required behavior:

- Show the current CSS-drawn icon for each connector.
- Allow selecting `iconKey` from the fixed list.
- Updating icon key dispatches the existing connector update command extended with `iconKey`.
- Adding a connector assigns `generic` unless the input workflow provides a deterministic default.

Do not add image upload.

### Categories

Replace the `Future color` placeholder.

Required behavior:

- Show each category color as a swatch.
- Allow editing the category `color` with a color input and/or text input.
- Validate and normalize hex color values consistently.
- Updating category color dispatches the existing category update command extended with `color`.
- Adding a category assigns a default color from a small deterministic palette.

Keep the settings workspace as a small coordinator.

## Add/Edit Device I/O color override

Add color override controls to I/O interface editor cards.

Required behavior:

- Show inherited category color for each I/O interface.
- Allow optional `colorOverride`.
- Clearing override returns the interface to inherited category color.
- Add Device stores `colorOverride` on new port group drafts.
- Edit Device can update `colorOverride` for existing interfaces and new interfaces.
- Existing locked fields stay locked as intended; color override is editable because it affects drawing presentation, not wiring.
- Validation blocks invalid override values before submit.

Use focused draft/helper updates rather than putting color logic directly in JSX.

## Drawing and UI usage

Use connector icons and colors in:

- I/O interface cards in Add/Edit Device.
- Device drawing port rows/anchors.
- Any compact port/interface labels where it improves scanability without clutter.

Requirements:

- Device drawing remains readable and technical.
- Category/override color accents should be subtle and functional.
- Do not make the whole UI one-note or dominated by one color.
- Do not use decorative orbs, marketing gradients, or large illustrative elements.
- Keep text legible and avoid overlap at desktop and smaller widths.

For drawing color precedence:

1. `PortGroup.colorOverride` when set.
2. `Category.color`.
3. Neutral fallback.

For connector icon lookup:

1. Port/port group connector type `iconKey`.
2. `generic` fallback.

## Architecture requirements

- Keep connector icon rendering reusable and app-owned.
- Keep icon-key/color lookup helpers outside large UI components.
- Keep Add/Edit Device draft/controller logic separate from presentation.
- Keep domain validation authoritative for color/icon data.
- Do not add server, database, authentication, export packaging, or v0.3.0.0 drawing export.

## Documentation updates

Update:

- README changelog for `0.2.8.14`.
- `docs/DATA_MODEL.md` if icon/color field descriptions need clarification.
- `docs/VALIDATION_RULES.md` if validation behavior changed.
- Any UI/product docs that still mention `Future icon` or `Future color`.

Document that connector icons are fixed CSS-drawn symbols selected by `iconKey`, not user-provided image assets.

## Tests

Add focused tests only.

Required scenarios:

- Connector icon helper maps known keys and falls back to `generic`.
- Settings Connector panel updates `iconKey`.
- Settings Categories panel updates `color`.
- Add/Edit Device I/O editor stores, clears, and validates `colorOverride`.
- Device drawing uses override color before category color.
- Current sample/schema validates at `0.2.8.14`.

Do not add Playwright E2E unless an existing focused component test cannot reasonably cover the behavior.

## Final validation

This prompt performs the single complete feature-dev validation pass for the cycle.

Run:

```bash
npm run check:dev
npm run clean
npm run clean:check
```

Do not run unless explicitly requested:

- `npm run check`
- `npm run check:release`
- `npm run check:full`
- `npm run package:source`
- `npm run test:e2e:install`
- `npm run test:e2e`

If `check:dev` fails, fix the failure if it is in scope of the `0.2.8.11` through `0.2.8.14` work. Do not paper over failures by weakening tests without a concrete reason.

## Acceptance criteria

- App/schema/current docs use `0.2.8.14`.
- Connector icon placeholder is replaced with fixed CSS-drawn icon selection.
- Category color placeholder is replaced with real color controls.
- I/O interface color override works in Add/Edit Device.
- Device drawing uses category/override colors and connector icons without clutter.
- No user-provided image upload/path/SVG icon system is added.
- `npm run check:dev`, `npm run clean`, and `npm run clean:check` pass.

## Final Codex response

Report:

1. Icon system and fixed keys implemented.
2. Settings icon/color controls added.
3. I/O color override behavior.
4. Drawing/UI usage of colors/icons.
5. Final validation command results.
6. Confirmation that no release packaging or Playwright browser install was run.
