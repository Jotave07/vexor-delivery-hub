-- 1. Extend enums used by code (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_attendant';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'pendente_pagamento';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'inadimplente';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'bloqueada';
