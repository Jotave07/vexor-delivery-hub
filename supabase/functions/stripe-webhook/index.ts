import Stripe from "https://esm.sh/stripe@16.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";
import {
  handleStripeWebhookRequest,
  type OrderPaymentStateInput,
  type StripeWebhookLogger,
  type StripeWebhookRepository,
  type SubscriptionStateInput,
} from "../_shared/stripe-webhook-handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WEBHOOK_SECRET =
  Deno.env.get("STRIPE_WEBHOOK_SECRET") ??
  Deno.env.get("STRIPE_ORDER_WEBHOOK_SECRET") ??
  "";

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, {
      apiVersion: "2026-02-25.clover",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const logger: StripeWebhookLogger = {
  info: (message, meta) => console.info(message, meta ?? {}),
  warn: (message, meta) => console.warn(message, meta ?? {}),
  error: (message, meta) => console.error(message, meta ?? {}),
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const buildRepository = (): StripeWebhookRepository => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const mapSubscriptionPayload = (payload: SubscriptionStateInput) => ({
    plan_id: payload.planId ?? undefined,
    provider: payload.provider,
    provider_customer_id: payload.providerCustomerId ?? undefined,
    provider_checkout_id: payload.providerCheckoutId ?? undefined,
    provider_subscription_id: payload.providerSubscriptionId ?? undefined,
    status: payload.status,
    current_period_start: payload.currentPeriodStart ?? undefined,
    current_period_end: payload.currentPeriodEnd ?? undefined,
    cancel_at_period_end: payload.cancelAtPeriodEnd ?? false,
    last_payment_status: payload.lastPaymentStatus ?? undefined,
  });

  const saveOrderPaymentState = async (input: OrderPaymentStateInput) => {
    const payload = {
      status: input.paymentStatus,
      provider_session_id: input.sessionId ?? undefined,
      provider_payment_intent_id: input.paymentIntentId ?? undefined,
      paid_at: input.paidAt ?? undefined,
      failure_reason: input.failureReason ?? undefined,
      last_event_at: input.lastEventAt,
    };

    let query = supabase.from("payments").update(payload).eq("order_id", input.orderId).eq("provider", "stripe");

    if (input.sessionId) {
      query = supabase.from("payments").update(payload).eq("provider_session_id", input.sessionId);
    } else if (input.paymentIntentId) {
      query = supabase.from("payments").update(payload).eq("provider_payment_intent_id", input.paymentIntentId);
    }

    const { error } = await query;
    if (error) throw error;
  };

  const upsertSubscriptionByStoreId = async (storeId: string, payload: SubscriptionStateInput) => {
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("store_id", storeId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      const { error } = await supabase.from("subscriptions").update(mapSubscriptionPayload(payload)).eq("id", existing.id);
      if (error) throw error;
      return;
    }

    if (!payload.planId) {
      throw new Error(`Nao foi possivel inserir assinatura Stripe sem plan_id para a loja ${storeId}.`);
    }

    const { error } = await supabase.from("subscriptions").insert({
      ...mapSubscriptionPayload(payload),
      store_id: storeId,
      plan_id: payload.planId,
    });
    if (error) throw error;
  };

  return {
    markEventProcessed: async (eventId, eventType, payload) => {
      const { data, error } = await supabase.rpc("mark_stripe_event_processed", {
        _event_id: eventId,
        _event_type: eventType,
        _payload: payload,
      });
      if (error) throw error;
      return Boolean(data);
    },
    getOrderById: async (orderId) => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, coupon_id, payment_status, status, store_id")
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        couponId: data.coupon_id,
        paymentStatus: data.payment_status,
        status: data.status,
        storeId: data.store_id,
      };
    },
    getOrderIdByPaymentIntentId: async (paymentIntentId) => {
      const { data, error } = await supabase
        .from("payments")
        .select("order_id")
        .eq("provider_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (error) throw error;
      return data?.order_id ?? null;
    },
    saveOrderPaymentState,
    updateOrderById: async (orderId, payload) => {
      const update: Record<string, unknown> = {};
      if (payload.paymentStatus) update.payment_status = payload.paymentStatus;
      if (payload.status) update.status = payload.status;

      const { error } = await supabase.from("orders").update(update).eq("id", orderId);
      if (error) throw error;
    },
    insertOrderStatusHistory: async ({ orderId, storeId, status, notes }) => {
      const { error } = await supabase.from("order_status_history").insert({
        order_id: orderId,
        store_id: storeId,
        status,
        notes,
      });
      if (error) throw error;
    },
    incrementCouponUsage: async (couponId) => {
      const { data, error } = await supabase.from("coupons").select("usage_count").eq("id", couponId).maybeSingle();
      if (error) throw error;
      if (!data) return;

      const { error: updateError } = await supabase
        .from("coupons")
        .update({ usage_count: (data.usage_count ?? 0) + 1 })
        .eq("id", couponId);
      if (updateError) throw updateError;
    },
    findPlanByPriceId: async (priceId) => {
      const { data, error } = await supabase
        .from("plans")
        .select("id")
        .eq("provider_price_id", priceId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    upsertSubscriptionByStoreId,
    updateSubscriptionByProviderSubscriptionId: async (providerSubscriptionId, payload) => {
      const { error } = await supabase
        .from("subscriptions")
        .update(mapSubscriptionPayload(payload))
        .eq("provider_subscription_id", providerSubscriptionId);
      if (error) throw error;
    },
    updateStorePlan: async (storeId, planId) => {
      const { error } = await supabase.from("stores").update({ plan_id: planId }).eq("id", storeId);
      if (error) throw error;
    },
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes." }, 500);
    }

    if (!stripe) {
      return json({ error: "STRIPE_SECRET_KEY ausente." }, 500);
    }

    if (!WEBHOOK_SECRET) {
      return json({ error: "STRIPE_WEBHOOK_SECRET ausente." }, 500);
    }

    const rawBody = await request.text();
    const response = await handleStripeWebhookRequest({
      method: request.method,
      rawBody,
      signature: request.headers.get("stripe-signature"),
      repository: buildRepository(),
      webhookSecret: WEBHOOK_SECRET,
      constructEvent: (body, signature, secret) => stripe.webhooks.constructEventAsync(body, signature, secret),
      logger,
    });

    return json(response.body, response.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao processar webhook Stripe.";
    logger.error("stripe-webhook fatal error", { message });
    return json({ error: "Erro inesperado ao processar webhook Stripe." }, 500);
  }
});
