import Stripe from "https://esm.sh/stripe@16.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("As credenciais seguras do Supabase nao estao configuradas.");
    }
    if (!stripe || !webhookSecret) {
      throw new Error("STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET nao configuradas.");
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return jsonResponse({ error: "Cabecalho stripe-signature ausente." }, 400);
    }

    const rawBody = await request.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Idempotência: mesmo event.id usado pelo webhook de pedidos.
    const { data: isNew } = await supabase.rpc("mark_stripe_event_processed", {
      _event_id: event.id,
      _event_type: event.type,
      _payload: event as unknown as Record<string, unknown>,
    });
    if (isNew === false) {
      return jsonResponse({ received: true, duplicate: true });
    }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const storeId = session.metadata?.store_id;
        const planId = session.metadata?.plan_id;

        if (storeId && planId) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("store_id", storeId)
            .maybeSingle();

          const payload = {
            plan_id: planId,
            provider: "stripe",
            provider_customer_id: customerId ?? null,
            provider_subscription_id: subscriptionId ?? null,
            provider_checkout_id: session.id,
            status: "pendente_pagamento" as const,
            last_payment_status: "processing",
          };

          if (subscription?.id) {
            await supabase.from("subscriptions").update(payload).eq("id", subscription.id);
          } else {
            await supabase.from("subscriptions").insert({
              ...payload,
              store_id: storeId,
            });
          }
        }
        break;
      }

      case "invoice.paid":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const object = event.data.object as Stripe.Subscription | Stripe.Invoice;
        const subscriptionId =
          "subscription" in object && typeof object.subscription === "string"
            ? object.subscription
            : "id" in object
              ? object.id
              : null;

        if (!subscriptionId) break;

        const status = mapStripeStatusToInternal(event.type, object);
        const periodStart = getTimestamp(
          "current_period_start" in object ? object.current_period_start : null,
        );
        const periodEnd = getTimestamp(
          "current_period_end" in object ? object.current_period_end : null,
        );
        const cancelAtPeriodEnd =
          "cancel_at_period_end" in object && typeof object.cancel_at_period_end === "boolean"
            ? object.cancel_at_period_end
            : false;

        await supabase
          .from("subscriptions")
          .update({
            provider: "stripe",
            provider_subscription_id: subscriptionId,
            status,
            current_period_start: periodStart ?? undefined,
            current_period_end: periodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            last_payment_status: event.type === "invoice.payment_failed" ? "failed" : "paid",
          })
          .eq("provider_subscription_id", subscriptionId);
        break;
      }
      default:
        break;
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar webhook.";
    return jsonResponse({ error: message }, 400);
  }
});

const mapStripeStatusToInternal = (
  eventType: string,
  object: Stripe.Subscription | Stripe.Invoice,
): "ativa" | "inadimplente" | "cancelada" | "pendente_pagamento" => {
  if (eventType === "invoice.payment_failed") return "inadimplente";
  if ("status" in object && object.status === "canceled") return "cancelada";
  if ("status" in object && (object.status === "active" || object.status === "trialing")) return "ativa";
  if ("status" in object && object.status === "past_due") return "inadimplente";
  return "pendente_pagamento";
};

const getTimestamp = (value: number | null) =>
  typeof value === "number" ? new Date(value * 1000).toISOString() : null;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
