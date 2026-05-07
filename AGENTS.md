# StudioWire IO Agent Instructions

These instructions apply to future Codex sessions working in this repository.

1. Project data is the source of truth.
2. Drawings are generated views, not source data.
3. Do not implement v0.2 features unless explicitly requested.
4. Do not add authentication in v0.1.
5. Do not add a server or database in v0.1.
6. Do not invent engineering concepts outside the documented data model.
7. Keep all domain logic separate from UI components.
8. Keep the import/export format stable and documented.
9. Cable numbers must be unique per project.
10. Skipped cable number gaps are reserved and cannot be reused.

## Engineering Boundaries

- v0.1 is a local, frontend-only project editor.
- Store project state as structured data and keep UI components as views over that data.
- Put reusable domain rules, validation, numbering, import, and export code outside React components.
- Update `docs/DATA_MODEL_V0_1.md` and `docs/VALIDATION_RULES_V0_1.md` before changing the v0.1 data shape or validation behavior.
- Preserve JSON import/export compatibility once a format is released.
