// Cria uma Stripe Checkout Session para um pedido existente.
// O backend recalcula o total do pedido a partir do banco; nunca confia no frontend.
import Stripe from "https://esm.sh/stripe@16.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

type Body = {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";
const STRIPE_SUCCESS_URL = Deno.env.get("STRIPE_SUCCESS_URL") ?? "";
const STRIPE_CANCEL_URL = Deno.env.get("STRIPE_CANCEL_URL") ?? "";

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2026-02-25.clover", httpClient: Stripe.createFetchHttpClient() })
  : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const resolveAllowedUrl = (candidate: string | undefined, fallback: string) => {
  if (!candidate) return fallback;
  if (!APP_URL) return candidate;

  try {
    const appOrigin = new URL(APP_URL).origin;
    const parsed = new URL(candidate);
    return parsed.origin === appOrigin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Backend nao configurado." }, 500);
    if (!stripe) return json({ error: "STRIPE_SECRET_KEY nao configurada." }, 500);

    const payload = (await req.json()) as Body;
    if (!payload?.orderId || !payload?.successUrl || !payload?.cancelUrl) {
      return json({ error: "orderId, successUrl e cancelUrl sao obrigatorios." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, store_id, customer_email, total, payment_method, payment_status, status, public_token, order_number")
      .eq("id", payload.orderId)
      .maybeSingle();

    if (orderError || !order) return json({ error: "Pedido nao encontrado." }, 404);
    if (order.payment_method !== "cartao_online") return json({ error: "Este pedido nao usa cartao online." }, 409);
    if (order.payment_status === "pago") return json({ error: "Pedido ja esta pago." }, 409);
    if (order.status === "cancelado") return json({ error: "Pedido cancelado." }, 409);

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, quantity, subtotal")
      .eq("order_id", order.id);

    if (itemsError || !items || items.length === 0) {
      return json({ error: "Pedido sem itens." }, 400);
    }

    const { data: store } = await supabase
      .from("stores")
      .select("name")
      .eq("id", order.store_id)
      .maybeSingle();

    const totalCents = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(totalCents) || totalCents < 50) {
      return json({ error: "Valor do pedido invalido para cobranca online." }, 400);
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .eq("provider", "stripe")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fallbackSuccessUrl =
      STRIPE_SUCCESS_URL ||
      (APP_URL ? `${APP_URL}/pedido/${order.public_token}/sucesso?session_id={CHECKOUT_SESSION_ID}` : payload.successUrl);
    const fallbackCancelUrl =
      STRIPE_CANCEL_URL ||
      (APP_URL ? `${APP_URL}/pedido/${order.public_token}/cancelado` : payload.cancelUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: resolveAllowedUrl(payload.successUrl, fallbackSuccessUrl),
      cancel_url: resolveAllowedUrl(payload.cancelUrl, fallbackCancelUrl),
      customer_email: order.customer_email ?? undefined,
      client_reference_id: order.id,
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: totalCents,
            product_data: {
              name: `Pedido #${order.order_number}${store?.name ? ` - ${store.name}` : ""}`,
              description: items
                .slice(0, 5)
                .map((item) => `${item.quantity}x ${item.product_name}`)
                .join(", "),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: order.id,
        store_id: order.store_id,
        order_number: String(order.order_number),
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          store_id: order.store_id,
        },
      },
    });

    if (!session.url) return json({ error: "Stripe nao retornou URL de checkout." }, 502);

    const paymentPayload = {
      order_id: order.id,
      store_id: order.store_id,
      method: order.payment_method,
      provider: "stripe",
      provider_session_id: session.id,
      currency: "brl",
      amount: Number(order.total),
      status: "pendente" as const,
      last_event_at: new Date().toISOString(),
    };

    if (existingPayment?.id) {
      await supabase.from("payments").update(paymentPayload).eq("id", existingPayment.id);
    } else {
      await supabase.from("payments").insert(paymentPayload);
    }

    await supabase
      .from("orders")
      .update({ payment_status: "processando" })
      .eq("id", order.id);

    return json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    console.error("create-order-checkout error", message);
    return json({ error: message }, 500);
  }
});
