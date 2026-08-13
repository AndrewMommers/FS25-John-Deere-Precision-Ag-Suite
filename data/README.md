# Data Storage

Local persistence layer for field, guidance, pass, and session records. Schemas are defined in [../docs/dev-technical.md §8](../docs/dev-technical.md).

```text
/data/
  fields/     field boundary records
  passes/     recorded operation pass points (FieldPassRecord, §6)
  guidance/   generated guidance lines, offset by implement width
  sessions/   session summaries
```

Naming convention: `<fieldId>_<operationType>_<sequence>.json`, e.g. `field_001_planting_001.json`.
