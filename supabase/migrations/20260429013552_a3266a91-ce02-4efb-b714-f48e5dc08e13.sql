-- Enum extended payment status
DO $$ BEGIN
  CREATE TYPE public.payment_status_extended AS ENUM ('pendente', 'processando', 'pago', 'falhou', 'cancelado', 'expirado', 'reembolsado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- orders: payment_status
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status public.payment_status_extended NOT NULL DEFAULT 'pendente';

-- payments: stripe fields
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_session_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'brl',
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_session_id_key ON public.payments (provider_session_id) WHERE provider_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_provider_payment_intent_idx ON public.payments (provider_payment_intent_id) WHERE provider_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);

-- stripe_events: idempotency log
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vexor admin reads stripe events" ON public.stripe_events;
CREATE POLICY "Vexor admin reads stripe events"
  ON public.stripe_events FOR SELECT
  USING (public.is_vexor_admin(auth.uid()));

-- Idempotency helper (used by edge function webhooks via service role)
CREATE OR REPLACE FUNCTION public.mark_stripe_event_processed(_event_id text, _event_type text, _payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stripe_events (id, type, payload) VALUES (_event_id, _event_type, _payload);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;

-- Update get_public_order to include payment_status
DROP FUNCTION IF EXISTS public.get_public_order(text);
CREATE OR REPLACE FUNCTION public.get_public_order(_token text)
RETURNS TABLE(
  id uuid, order_number integer, status order_status, order_type order_type, customer_name text,
  store_id uuid, store_name text, store_whatsapp text, store_logo_url text,
  delivery_address text, delivery_neighborhood text,
  subtotal numeric, delivery_fee numeric, discount numeric, total numeric,
  payment_method payment_method, payment_status payment_status_extended,
  estimated_minutes integer, created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.order_number, o.status, o.order_type, o.customer_name,
         s.id, s.name, s.whatsapp, s.logo_url,
         o.delivery_address, o.delivery_neighborhood,
         o.subtotal, o.delivery_fee, o.discount, o.total,
         o.payment_method, o.payment_status,
         o.estimated_minutes, o.created_at
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.public_token = _token;
$$;