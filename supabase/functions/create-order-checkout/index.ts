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

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
  : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Backend não configurado." }, 500);
    if (!stripe) return json({ error: "STRIPE_SECRET_KEY não configurada. Adicione a chave nos secrets do projeto." }, 500);

    const payload = (await req.json()) as Body;
    if (!payload?.orderId || !payload?.successUrl || !payload?.cancelUrl) {
      return json({ error: "orderId, successUrl e cancelUrl são obrigatórios." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Buscar pedido + itens (autoritativo no servidor)
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, store_id, customer_name, customer_email, customer_phone, total, payment_method, payment_status, status, public_token, order_number")
      .eq("id", payload.orderId)
      .maybeSingle();

    if (oErr || !order) return json({ error: "Pedido não encontrado." }, 404);

    if (order.payment_status === "pago") {
      return json({ error: "Pedido já está pago." }, 409);
    }
    if (order.status === "cancelado") {
      return json({ error: "Pedido cancelado." }, 409);
    }

    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select("product_name, quantity, subtotal")
      .eq("order_id", order.id);

    if (iErr || !items || items.length === 0) {
      return json({ error: "Pedido sem itens." }, 400);
    }

    const { data: store } = await supabase
      .from("stores")
      .select("name")
      .eq("id", order.store_id)
      .maybeSingle();

    // 2. Total de referência (vindo do banco). Cobramos como uma linha única
    //    "Pedido #N - Loja" para refletir entrega/desconto já aplicados no order.total.
    const totalCents = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(totalCents) || totalCents < 50) {
      return json({ error: "Valor do pedido inválido para cobrança online." }, 400);
    }

    // 3. Reaproveitar pagamento pendente se houver
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, provider_session_id, status")
      .eq("order_id", order.id)
      .eq("provider", "stripe")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Criar Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
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
                .map((i) => `${i.quantity}x ${i.product_name}`)
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

    if (!session.url) {
      return json({ error: "Stripe não retornou URL de checkout." }, 502);
    }

    // 5. Persistir registro de pagamento + estado do pedido
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    console.error("create-order-checkout error", msg);
    return json({ error: msg }, 500);
  }
});
