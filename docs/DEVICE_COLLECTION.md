# Device Collection

StudioWire IO bundles reusable device templates from `collections/devices`. Templates populate Add Device for review; they do not bypass the normal create, uniqueness, validation, or cable-allocation workflow.

## Folder Structure

Store each template at:

`collections/devices/<Manufacturer>/<Category>/<Model>/*.studiowire-device.json`

The three folder names must match the template manufacturer, primary category, and model after trimming and case folding. One exact manufacturer/category/model configuration may appear only once in the bundled collection.

## Template Contract

New templates use schema version `0.2.0`; StudioWire IO continues importing `0.1.0`. They contain visible hardware metadata and ordered I/O definitions only. Category and connector references are names that are matched case-insensitively against the open project's settings.

Each `0.2.0` I/O interface stores its Cable Label Pattern, nullable Device Port Label Pattern, and either `null` or one trimmed manual device-body label per ordered row. Legacy `0.1.0` interfaces are loaded as pattern mode with Device Port Label Pattern set to “Same as cable label.” Manual labels remain presentation-only and never become cable labels.

Templates must not contain project IDs, location or folder assignments, rack placement, cable prefixes, cable numbers, numbering ranges, planned cable IDs, or cable records. The project derives those values when the template fills Add Device. A manual label array must exactly match its interface count and contain no empty labels.

Run `npm run validate:collections` after adding or editing templates. Invalid templates remain visible in the application for diagnosis, but cannot be loaded.

## Export Workflow

Right-click a standard device and choose `Export Device Template`. StudioWire IO downloads a `.studiowire-device.json` file and reports its intended relative collection path. Place the file there, run collection validation, and restart or rebuild the app so Vite includes it in the bundled catalog.

Image metadata, pinout images, rear views, and rack-face images are intentionally deferred until a portable asset-storage contract is defined.
