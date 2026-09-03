-- Maxi Hub TT production schema sync.
-- Safe to run more than once in the Supabase SQL Editor.
-- This adds the columns used by the current API without deleting booking data.

ALTER TABLE IF EXISTS public.jobs
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS pickup_datetime TEXT,
  ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS rush_fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS rating_comment TEXT,
  ADD COLUMN IF NOT EXISTS passenger_count INTEGER,
  ADD COLUMN IF NOT EXISTS number_buses INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'one-way',
  ADD COLUMN IF NOT EXISTS fare_status TEXT NOT NULL DEFAULT 'custom_quote',
  ADD COLUMN IF NOT EXISTS fare_route_id TEXT,
  ADD COLUMN IF NOT EXISTS base_fare NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_fare NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);

ALTER TABLE IF EXISTS public.jobs
  ALTER COLUMN deposit_amount TYPE NUMERIC(10, 2)
  USING deposit_amount::NUMERIC;

ALTER TABLE IF EXISTS public.driver_signups
  ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS public.drivers
  ADD COLUMN IF NOT EXISTS dp_expiry DATE,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE;