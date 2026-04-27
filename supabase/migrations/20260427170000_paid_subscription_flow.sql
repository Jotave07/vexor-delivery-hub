ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'pendente_pagamento';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'inadimplente';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'bloqueada';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payment_status TEXT;

UPDATE public.plans
SET is_active = false
WHERE slug = 'inicial' OR price_monthly <= 0;

INSERT INTO public.plans (
  slug,
  name,
  description,
  price_monthly,
  allows_coupons,
  allows_advanced_reports,
  allows_custom_branding,
  allows_custom_domain,
  sort_order,
  features,
  is_active
)
SELECT
  'basico',
  'Basico',
  'Plano de entrada pago para operar sua loja com assinatura recorrente.',
  49,
  false,
  false,
  false,
  false,
  1,
  '["Cardapio digital","Pedidos online","Painel operacional","Suporte inicial"]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.plans WHERE slug = 'basico'
);
