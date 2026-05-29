# Entries module setup

Run in Supabase SQL Editor (in order):

1. `schema_entries.sql`
2. `rls_policies_entries.sql`

Then redeploy the app. On first visit to **Entries**, default types are created: Recipe, Book notes, Learning.

**Metadata starts empty.** Tap **Add field** for two boxes:

- **Field** — pick from suggestions (ingredients, steps…) or type a new name; saved names appear next time.
- **Content** — free text (steps can be `1. …` / `2. …` with `  - sub` lines).

No auto-filled fields and no value presets.
