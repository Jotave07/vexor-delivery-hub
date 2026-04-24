
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin_vexor', 'store_owner', 'store_staff', 'delivery_staff');
CREATE TYPE public.order_status AS ENUM ('novo', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'pronto_para_retirada', 'entregue', 'cancelado');
CREATE TYPE public.order_type AS ENUM ('entrega', 'retirada');
CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'pix', 'cartao_entrega');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'cancelado');
CREATE TYPE public.subscription_status AS ENUM ('trial', 'ativa', 'suspensa', 'cancelada');
CREATE TYPE public.coupon_type AS ENUM ('percentual', 'fixo');

-- =========================================================
-- HELPER: updated_at trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  store_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, store_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vexor_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_vexor'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_store(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND store_id = _store_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_vexor'
  );
$$;

-- =========================================================
-- PLANS
-- =========================================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_products INTEGER,
  allows_coupons BOOLEAN NOT NULL DEFAULT false,
  allows_advanced_reports BOOLEAN NOT NULL DEFAULT false,
  allows_custom_branding BOOLEAN NOT NULL DEFAULT false,
  allows_custom_domain BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- STORES
-- =========================================================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  document TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  primary_color TEXT DEFAULT '#7C3AED',
  secondary_color TEXT DEFAULT '#0F172A',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_stores_owner ON public.stores(owner_user_id);
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now add FK from profiles to stores (was deferred)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- =========================================================
-- STORE SETTINGS
-- =========================================================
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  is_open BOOLEAN NOT NULL DEFAULT true,
  accept_orders_when_closed BOOLEAN NOT NULL DEFAULT false,
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_prep_time_minutes INTEGER NOT NULL DEFAULT 30,
  allow_delivery BOOLEAN NOT NULL DEFAULT true,
  allow_pickup BOOLEAN NOT NULL DEFAULT true,
  accept_cash BOOLEAN NOT NULL DEFAULT true,
  accept_pix BOOLEAN NOT NULL DEFAULT true,
  accept_card_on_delivery BOOLEAN NOT NULL DEFAULT true,
  pix_key TEXT,
  pix_key_type TEXT,
  business_hours JSONB NOT NULL DEFAULT '{"mon":{"open":"18:00","close":"23:00","enabled":true},"tue":{"open":"18:00","close":"23:00","enabled":true},"wed":{"open":"18:00","close":"23:00","enabled":true},"thu":{"open":"18:00","close":"23:00","enabled":true},"fri":{"open":"18:00","close":"23:30","enabled":true},"sat":{"open":"18:00","close":"23:30","enabled":true},"sun":{"open":"18:00","close":"23:00","enabled":true}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_subscriptions_store ON public.subscriptions(store_id);
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CATEGORIES
-- =========================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_categories_store ON public.categories(store_id);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PRODUCTS
-- =========================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  promo_price NUMERIC(10,2) CHECK (promo_price IS NULL OR promo_price >= 0),
  prep_time_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PRODUCT OPTIONS (grupos)
-- =========================================================
CREATE TABLE public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  min_choices INTEGER NOT NULL DEFAULT 0,
  max_choices INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_options_product ON public.product_options(product_id);
CREATE TRIGGER trg_product_options_updated_at BEFORE UPDATE ON public.product_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PRODUCT OPTION ITEMS
-- =========================================================
CREATE TABLE public.product_option_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  extra_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_option_items_option ON public.product_option_items(option_id);
CREATE TRIGGER trg_option_items_updated_at BEFORE UPDATE ON public.product_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- DELIVERY ZONES
-- =========================================================
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  neighborhood TEXT NOT NULL,
  city TEXT,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  min_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_zones_store ON public.delivery_zones(store_id);
CREATE TRIGGER trg_zones_updated_at BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- COUPONS
-- =========================================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type public.coupon_type NOT NULL DEFAULT 'percentual',
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_coupons_store ON public.coupons(store_id);
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, phone)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_customers_store ON public.customers(store_id);
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CUSTOMER ADDRESSES
-- =========================================================
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT,
  reference TEXT,
  zip_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_addresses_customer ON public.customer_addresses(customer_id);

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number SERIAL,
  public_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status public.order_status NOT NULL DEFAULT 'novo',
  order_type public.order_type NOT NULL DEFAULT 'entrega',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT,
  delivery_neighborhood TEXT,
  delivery_reference TEXT,
  delivery_zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code TEXT,
  payment_method public.payment_method NOT NULL,
  change_for NUMERIC(10,2),
  notes TEXT,
  estimated_minutes INTEGER,
  is_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_token ON public.orders(public_token);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ORDER ITEMS
-- =========================================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  options_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- =========================================================
-- ORDER ITEM OPTIONS
-- =========================================================
CREATE TABLE public.order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  extra_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_order_item_options_item ON public.order_item_options(order_item_id);

-- =========================================================
-- ORDER STATUS HISTORY
-- =========================================================
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_status_history_order ON public.order_status_history(order_id);

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  amount NUMERIC(10,2) NOT NULL,
  external_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_store ON public.notifications(store_id);

-- =========================================================
-- TRIGGER: create profile on new user
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- PUBLIC FUNCTION: get order by token (no auth needed)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_public_order(_token TEXT)
RETURNS TABLE (
  id UUID,
  order_number INTEGER,
  status public.order_status,
  order_type public.order_type,
  customer_name TEXT,
  store_id UUID,
  store_name TEXT,
  store_whatsapp TEXT,
  store_logo_url TEXT,
  delivery_address TEXT,
  delivery_neighborhood TEXT,
  subtotal NUMERIC,
  delivery_fee NUMERIC,
  discount NUMERIC,
  total NUMERIC,
  payment_method public.payment_method,
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.order_number, o.status, o.order_type, o.customer_name,
         s.id, s.name, s.whatsapp, s.logo_url,
         o.delivery_address, o.delivery_neighborhood,
         o.subtotal, o.delivery_fee, o.discount, o.total,
         o.payment_method, o.estimated_minutes, o.created_at
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.public_token = _token;
$$;

CREATE OR REPLACE FUNCTION public.get_public_order_items(_token TEXT)
RETURNS TABLE (
  item_id UUID,
  product_name TEXT,
  unit_price NUMERIC,
  quantity INTEGER,
  options_total NUMERIC,
  subtotal NUMERIC,
  notes TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.id, oi.product_name, oi.unit_price, oi.quantity, oi.options_total, oi.subtotal, oi.notes
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.public_token = _token
  ORDER BY oi.created_at;
$$;

CREATE OR REPLACE FUNCTION public.get_public_order_status_history(_token TEXT)
RETURNS TABLE (
  status public.order_status,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.status, h.notes, h.created_at
  FROM public.order_status_history h
  JOIN public.orders o ON o.id = h.order_id
  WHERE o.public_token = _token
  ORDER BY h.created_at;
$$;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- PROFILES
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_vexor_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER_ROLES
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_vexor_admin(auth.uid()));
CREATE POLICY "Vexor admin manages roles" ON public.user_roles
  FOR ALL USING (public.is_vexor_admin(auth.uid())) WITH CHECK (public.is_vexor_admin(auth.uid()));
CREATE POLICY "Allow self insert role on signup" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'store_owner');

-- PLANS — public read
CREATE POLICY "Plans are public" ON public.plans
  FOR SELECT USING (true);
CREATE POLICY "Vexor admin manages plans" ON public.plans
  FOR ALL USING (public.is_vexor_admin(auth.uid())) WITH CHECK (public.is_vexor_admin(auth.uid()));

-- STORES — public read of active stores; owner full access
CREATE POLICY "Active stores are public" ON public.stores
  FOR SELECT USING (is_active = true AND is_suspended = false OR public.user_belongs_to_store(auth.uid(), id));
CREATE POLICY "Owner inserts own store" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner updates own store" ON public.stores
  FOR UPDATE USING (auth.uid() = owner_user_id OR public.is_vexor_admin(auth.uid()));
CREATE POLICY "Vexor admin deletes stores" ON public.stores
  FOR DELETE USING (public.is_vexor_admin(auth.uid()));

-- STORE_SETTINGS — public read; staff manage
CREATE POLICY "Store settings public read" ON public.store_settings
  FOR SELECT USING (true);
CREATE POLICY "Store staff manages settings" ON public.store_settings
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- SUBSCRIPTIONS — store owner reads, vexor admin manages
CREATE POLICY "Store reads own subscription" ON public.subscriptions
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Owner inserts own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Vexor admin manages subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_vexor_admin(auth.uid())) WITH CHECK (public.is_vexor_admin(auth.uid()));

-- CATEGORIES — active public read; staff manage
CREATE POLICY "Active categories public" ON public.categories
  FOR SELECT USING (is_active = true OR public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff manages categories" ON public.categories
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- PRODUCTS — active public; staff manage
CREATE POLICY "Active products public" ON public.products
  FOR SELECT USING (is_active = true OR public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff manages products" ON public.products
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- PRODUCT OPTIONS — public read; staff manage
CREATE POLICY "Product options public" ON public.product_options
  FOR SELECT USING (true);
CREATE POLICY "Store staff manages product_options" ON public.product_options
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- PRODUCT OPTION ITEMS — public read; staff manage
CREATE POLICY "Option items public" ON public.product_option_items
  FOR SELECT USING (true);
CREATE POLICY "Store staff manages option_items" ON public.product_option_items
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- DELIVERY ZONES — active public; staff manage
CREATE POLICY "Active zones public" ON public.delivery_zones
  FOR SELECT USING (is_active = true OR public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff manages zones" ON public.delivery_zones
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- COUPONS — staff full; public can validate via select on active+code (allow read of active)
CREATE POLICY "Active coupons readable" ON public.coupons
  FOR SELECT USING (is_active = true OR public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff manages coupons" ON public.coupons
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));

-- CUSTOMERS — staff only
CREATE POLICY "Store staff manages customers" ON public.customers
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));
-- Public insert for checkout (anonymous order creation)
CREATE POLICY "Anyone creates customer at checkout" ON public.customers
  FOR INSERT WITH CHECK (true);

-- CUSTOMER ADDRESSES
CREATE POLICY "Store staff reads addresses" ON public.customer_addresses
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Anyone creates address at checkout" ON public.customer_addresses
  FOR INSERT WITH CHECK (true);

-- ORDERS — staff full; anyone can insert (checkout); public read via SECURITY DEFINER func
CREATE POLICY "Store staff reads orders" ON public.orders
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff updates orders" ON public.orders
  FOR UPDATE USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Anyone creates order at checkout" ON public.orders
  FOR INSERT WITH CHECK (true);

-- ORDER ITEMS
CREATE POLICY "Store staff reads order_items" ON public.order_items
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Anyone creates order_items at checkout" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- ORDER ITEM OPTIONS
CREATE POLICY "Store staff reads order_item_options" ON public.order_item_options
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Anyone creates order_item_options at checkout" ON public.order_item_options
  FOR INSERT WITH CHECK (true);

-- ORDER STATUS HISTORY
CREATE POLICY "Store staff reads status_history" ON public.order_status_history
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff inserts status_history" ON public.order_status_history
  FOR INSERT WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Anyone inserts initial status" ON public.order_status_history
  FOR INSERT WITH CHECK (true);

-- PAYMENTS
CREATE POLICY "Store staff manages payments" ON public.payments
  FOR ALL USING (public.user_belongs_to_store(auth.uid(), store_id))
  WITH CHECK (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Anyone creates payment at checkout" ON public.payments
  FOR INSERT WITH CHECK (true);

-- NOTIFICATIONS
CREATE POLICY "Store staff reads notifications" ON public.notifications
  FOR SELECT USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "Store staff updates notifications" ON public.notifications
  FOR UPDATE USING (public.user_belongs_to_store(auth.uid(), store_id));
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Store assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users upload store assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users update own store assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'store-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users delete own store assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'store-assets' AND auth.uid() IS NOT NULL);

-- =========================================================
-- SEED PLANS
-- =========================================================
INSERT INTO public.plans (slug, name, description, price_monthly, allows_coupons, allows_advanced_reports, allows_custom_branding, allows_custom_domain, sort_order, features) VALUES
('inicial', 'Inicial', 'Para começar a vender online com seu próprio delivery.', 0, false, false, false, false, 1, '["Cardápio digital","Pedidos ilimitados","Painel de pedidos","WhatsApp integrado"]'::jsonb),
('profissional', 'Profissional', 'Para escalar suas vendas com cupons e relatórios completos.', 99, true, true, true, false, 2, '["Tudo do Inicial","Cupons de desconto","Relatórios completos","Gestão de clientes","Taxas por bairro","Personalização visual"]'::jsonb),
('white_label', 'White-label', 'Sua marca, seu domínio, sem nenhuma referência à Vexor.', 249, true, true, true, true, 3, '["Tudo do Profissional","Domínio próprio","Marca personalizada","Suporte prioritário","Multiunidades"]'::jsonb);
