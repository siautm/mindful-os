# Entries module setup

Run in Supabase SQL Editor (in order):

1. `schema_entries.sql`
2. `rls_policies_entries.sql`

Then redeploy the app.

If the `entries` table already exists, also run: `entries_add_photo_url.sql`

**Frontend brief:** [`docs/ENTRIES_MODULE.md`](../docs/ENTRIES_MODULE.md)
