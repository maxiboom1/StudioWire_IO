# StudioWire IO 0.2.8.17 Modal, Device, and Rack Polish

## Summary

Bump the current dev version to `0.2.8.17`. Keep the project JSON shape unchanged.

Polish the shared modal/form UI, Add/Edit Device, I/O interface cards, and Add Rack. Use a consistent light operational UI with fixed modal shells, clean tab content, compact I/O cards, and a reusable CSS/text StudioWire IO footer mark.

## Key Changes

- Bump app/schema/sample/docs/package metadata to `0.2.8.17`.
- Add a reusable CSS/text `StudioWire IO` footer mark:
  - `StudioWire` text.
  - Orange `IO` badge.
  - Small dot to the right.
  - Do not create a PNG or bitmap asset.
- Place the footer mark on the left side of standard modal footers.
- Keep action buttons on the right side of the same footer row.
- Apply the standard footer to:
  - Add/Edit Device.
  - Add/Edit Terminal Block.
  - Add Rack.
- Preserve the fixed modal shell pattern: header, tabs where needed, scrollable content, sticky footer.

## Add/Edit Device

- Update Add Device description text to:
  `Create a new device with generated ports and optional I/O interfaces.`
- Remove the tab-content heading `General`.
- Remove the tab-content heading `I/O Interfaces`.
- Keep top horizontal tabs: `General` and `I/O`.

### General Tab

- Remove helper text rendered under fields.
- Move helper text into the label in parentheses.
- Parenthetical helper text must be visually smaller/lighter than the main label text.
- Use these visible labels exactly:
  - `Device Name (appear as device header)`
  - `Device sub-name (appear as device 2nd line header)`
  - `Manufacturer`
  - `Device model`
  - `Category`
  - `Location`
  - `Folder`
  - `Mount height (RU)`
- Keep internal data names unchanged:
  - `Device.name`
  - `Device.code`
  - `subLocationId`
  - `rackSizeRu`
- Add `Mount height (RU)` as a dropdown/select.
- The mount-height dropdown must include:
  - `No mount height`
  - `1 RU` through `48 RU`
- `No mount height` stores `rackSizeRu: null`.
- A numbered RU selection stores that number.
- Preserve current location/folder behavior:
  - Folder choices are filtered by selected location.
  - Changing location clears folder when the current folder does not belong to the new location.

### I/O Tab

- Keep the unified I/O interface list introduced in `0.2.8.16`.
- Keep drag-and-drop reorder as the only reorder mechanism.
- Remove up/down ordering buttons from I/O interface cards.
- Keep:
  - Drag handle.
  - Collapse/expand control.
  - Remove `X` where removal is allowed.
- Make collapsed I/O interface cards thinner.
- Vertically center collapsed card content.
- Remove extra bottom spacing differences between:
  - One collapsed interface.
  - Multiple collapsed interfaces.
  - Validation message shown.
- Keep saved `project.portGroups` ordering synced with the visual I/O order.

## Add Rack

- Apply the same standard modal shell/content/footer spacing as other forms.
- Change default rack height from `28` to `48`.
- Use a height dropdown/select with `1 RU` through `48 RU`.
- New racks default to `48 RU`.
- Do not rewrite existing rack heights in existing project data.

## Docs And Naming

- Update `AGENTS.md` user-facing terminology rule:
  - `Device.name` is always `Device Name`.
  - `Device.code` is always `Device sub-name`.
  - `subLocations` / `subLocationId` are always `Folder` in UI copy.
- Update README changelog.
- Update docs/version metadata as required by the repo version synchronization rules.
- Do not add migrations or schema-shape changes.

## Test Plan

- Add/Edit Device focused tests:
  - New description text renders.
  - `General` and `I/O Interfaces` tab-content headings are not rendered.
  - New labels render exactly.
  - Bottom helper paragraphs are removed from General fields.
  - Parenthetical helper label text is present.
  - Mount-height dropdown includes `No mount height` and `1 RU` through `48 RU`.
  - `No mount height` submits `rackSizeRu: null`.
  - Numbered RU choices submit the selected number.
- I/O focused tests:
  - Up/down reorder buttons are removed.
  - Drag reorder still persists combined interface order to `project.portGroups`.
  - Remove and collapse controls still work.
- Add Rack focused tests:
  - New rack default height is `48`.
  - Height dropdown includes `1 RU` through `48 RU`.
- Validation:
  - Run targeted tests for changed components/domain helpers.
  - Run `npm run typecheck`.
  - Run `npm run version:check`.
  - Run `npm run clean`.
  - Run `npm run clean:check`.

## Assumptions

- This is feature-development polish, not a release task.
- Light theme stays.
- The StudioWire IO footer mark is CSS/HTML text, not a generated image asset.
- Rack default height changes only for newly created racks.
- Existing project JSON shape remains unchanged.
