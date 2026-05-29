# Entries module setup

Run in Supabase SQL Editor (in order):

1. `schema_entries.sql`
2. `rls_policies_entries.sql`

Then redeploy the app. On first visit to **Entries**, default types are created automatically:

- **Recipe** — ingredients, cook time (preset), steps (mindmap), allergy (preset), dislike_by (one-off)
- **Book notes** — author, rating, quotes
- **Learning** — source, url, key points (mindmap)

## Presets vs one-off

- Fields marked **preset** copy their default into **new** entries only.
- Edit a single entry without changing the preset (e.g. `dislike_by` on one recipe).
- Use **Presets** in the Entries page to update defaults for future entries.

## Mindmap steps input

```
1. Add water
2. Add sauce
  - stir slowly
  - low heat
```

Sub-lines starting with `-` attach to the previous step.
