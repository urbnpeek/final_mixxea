# Supabase Setup for mixxea-vscode

## 1. Add your keys in .env
Use these variables:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_DB_SCHEMA
- SUPABASE_STORAGE_ARTWORK_BUCKET
- SUPABASE_STORAGE_AUDIO_BUCKET
- SUPABASE_STORAGE_CONTRACTS_BUCKET

## 2. Create the project schema
Run the SQL in supabase/migrations/0001_init.sql inside the Supabase SQL editor,
or use the Supabase CLI later.

## 3. Verify local wiring
Start the app and open:
- /api/supabase/config
- /api/supabase/status

## 4. Current behavior
The app still runs on the local JSON store today.
The Supabase layer is scaffolded but not forced on yet, so nothing breaks while you add keys.

## 5. Next migration step
Once keys are in place, we can switch the CRUD routes one by one from JSON to Supabase tables.
