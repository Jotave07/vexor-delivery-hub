ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS public_name TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS delivery_base_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_message TEXT,
  ADD COLUMN IF NOT EXISTS excluded_neighborhoods JSONB NOT NULL DEFAULT '[]'::jsonb;
