ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

UPDATE public.subscriptions
SET provider_subscription_id = external_subscription_id
WHERE provider_subscription_id IS NULL
  AND external_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_subscription_id_key
  ON public.subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
