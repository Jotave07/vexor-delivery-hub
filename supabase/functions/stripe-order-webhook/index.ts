// Webhook do Stripe para pedidos do e-commerce.
// - Valida a assinatura.
// - Garante idempotência via tabela stripe_events.
// - Atualiza orders.payment_status e payments conforme o evento.
import Stripe from "https://esm.sh/stripe@16.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_ORDER_WEBHOOK_SECRET") ?? "";

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
  : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type PaymentStatus = "pendente" | "processando" | "pago" | "falhou" | "cancelado" | "expirado" | "reembolsado";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Backend não configurado." }, 500);
    if (!stripe) return json({ error: "STRIPE_SECRET_KEY ausente." }, 500);
    if (!WEBHOOK_SECRET) return json({ error: "STRIPE_ORDER_WEBHOOK_SECRET ausente." }, 500);

    const signature = req.headers.get("stripe-signature");
    if (!signature) return json({ error: "Assinatura ausente." }, 400);

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, WEBHOOK_SECRET);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "assinatura inválida";
      console.error("stripe-order-webhook signature error", msg);
      return json({ error: `Webhook signature: ${msg}` }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Idempotência: registra o evento; se já existia, sai 200 sem reprocessar.
    const { data: isNew } = await supabase.rpc("mark_stripe_event_processed", {
      _event_id: event.id,
      _event_type: event.type,
      _payload: event as unknown as Record<string, unknown>,
    });
    if (isNew === false) {
      return json({ received: true, duplicate: true });
    }

    const handleSession = async (session: Stripe.Checkout.Session, paymentStatus: PaymentStatus, failureReason?: string) => {
      const orderId = session.metadata?.order_id ?? session.client_reference_id ?? null;
      if (!orderId) return;

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

      const paymentUpdate: Record<string, unknown> = {
        status:
          paymentStatus === "pago"
            ? "pago"
            : paymentStatus === "falhou" || paymentStatus === "cancelado" || paymentStatus === "expirado"
              ? "cancelado"
              : "pendente",
        provider_payment_intent_id: paymentIntentId,
        last_event_at: new Date().toISOString(),
      };
      if (paymentStatus === "pago") paymentUpdate.paid_at = new Date().toISOString();
      if (failureReason) paymentUpdate.failure_reason = failureReason;

      await supabase.from("payments").update(paymentUpdate).eq("provider_session_id", session.id);

      await supabase
        .from("orders")
        .update({ payment_status: paymentStatus })
        .eq("id", orderId);

      if (paymentStatus === "pago") {
        // Marca o pedido como confirmado se ainda estiver novo
        const { data: order } = await supabase.from("orders").select("status, store_id").eq("id", orderId).maybeSingle();
        if (order?.status === "novo") {
          await supabase.from("orders").update({ status: "confirmado" }).eq("id", orderId);
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            store_id: order.store_id,
            status: "confirmado",
            notes: "Pagamento confirmado pelo Stripe",
          });
        }
      }
    };

    const handlePaymentIntent = async (pi: Stripe.PaymentIntent, paymentStatus: PaymentStatus) => {
      const orderId = pi.metadata?.order_id ?? null;
      const update: Record<string, unknown> = {
        provider_payment_intent_id: pi.id,
        last_event_at: new Date().toISOString(),
        status: paymentStatus === "pago" ? "pago" : "cancelado",
      };
      if (paymentStatus === "pago") update.paid_at = new Date().toISOString();
      if (pi.last_payment_error?.message) update.failure_reason = pi.last_payment_error.message;

      await supabase.from("payments").update(update).eq("provider_payment_intent_id", pi.id);
      if (orderId) {
        await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
      }
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const status: PaymentStatus = session.payment_status === "paid" ? "pago" : "processando";
        await handleSession(session, status);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSession(session, "expirado", "Sessão expirou sem pagamento");
        break;
      }
      case "payment_intent.succeeded": {
        await handlePaymentIntent(event.data.object as Stripe.PaymentIntent, "pago");
        break;
      }
      case "payment_intent.payment_failed": {
        await handlePaymentIntent(event.data.object as Stripe.PaymentIntent, "falhou");
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
        if (piId) {
          await supabase.from("payments").update({ status: "cancelado", last_event_at: new Date().toISOString() }).eq("provider_payment_intent_id", piId);
          const { data: pay } = await supabase.from("payments").select("order_id").eq("provider_payment_intent_id", piId).maybeSingle();
          if (pay?.order_id) {
            await supabase.from("orders").update({ payment_status: "reembolsado" }).eq("id", pay.order_id);
          }
        }
        break;
      }
      default:
        // ignorado
        break;
    }

    return json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    console.error("stripe-order-webhook error", msg);
    return json({ error: msg }, 500);
  }
});
