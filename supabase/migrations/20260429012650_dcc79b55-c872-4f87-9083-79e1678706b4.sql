-- Subscriptions: gateway columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_status TEXT;

-- Plans: provider columns
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS subscription_provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT;

-- Stores: extended address fields
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS public_name TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Store settings: extended delivery fields
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_base_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_message TEXT,
  ADD COLUMN IF NOT EXISTS delivery_distance_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_neighborhoods JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: ensure every store has a store_settings row
INSERT INTO public.store_settings (store_id)
SELECT s.id FROM public.stores s
LEFT JOIN public.store_settings ss ON ss.store_id = s.id
WHERE ss.id IS NULL;

-- Promote Vexor Adm owner to platform admin
INSERT INTO public.user_roles (user_id, role)
SELECT s.owner_user_id, 'admin_vexor'::app_role
FROM public.stores s
WHERE s.slug = 'vexoradm'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = s.owner_user_id AND r.role = 'admin_vexor'
  );

-- Mark Vexor Adm subscription as active and free of charge
UPDATE public.subscriptions sub
SET status = 'ativa',
    last_payment_status = 'comp_admin',
    current_period_end = (now() + interval '100 years')
FROM public.stores s
WHERE sub.store_id = s.id AND s.slug = 'vexoradm';
