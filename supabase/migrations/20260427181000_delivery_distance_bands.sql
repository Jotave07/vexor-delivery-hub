ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS delivery_distance_rules JSONB NOT NULL DEFAULT '[]'::jsonb;
