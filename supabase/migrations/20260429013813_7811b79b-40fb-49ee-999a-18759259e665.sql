ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'cartao_online';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS accept_card_online boolean NOT NULL DEFAULT true;