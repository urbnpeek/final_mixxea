-- Mixxea Records — Supabase setup
-- Run this in your Supabase project → SQL Editor

CREATE TABLE IF NOT EXISTS mixxea_data (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (the server uses service_role key which bypasses RLS)
ALTER TABLE mixxea_data ENABLE ROW LEVEL SECURITY;

-- No public read/write policies — all access is server-side via service role key
