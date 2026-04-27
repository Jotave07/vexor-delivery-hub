import Stripe from "https://esm.sh/stripe@16.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

type CheckoutRequest = {
  planId: string;
  storeId: string;
  successUrl: string;
  cancelUrl: string;
  provider?: "stripe";
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

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
      throw new Error("As credenciais seguras do Supabase nao estao configuradas na Edge Function.");
    }

    if (!stripe) {
      throw new Error("STRIPE_SECRET_KEY nao configurada. Conecte o gateway antes de iniciar checkouts recorrentes.");
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Sessao nao encontrada." }, 401);
    }

    const payload = (await request.json()) as CheckoutRequest;
    if (!payload.planId || !payload.storeId || !payload.successUrl || !payload.cancelUrl) {
      return jsonResponse({ error: "Campos obrigatorios ausentes para criar o checkout." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Usuario nao autenticado." }, 401);
    }

    const [{ data: store, error: storeError }, { data: plan, error: planError }] = await Promise.all([
      supabase.from("stores").select("id, owner_user_id, name, slug, plan_id").eq("id", payload.storeId).maybeSingle(),
      supabase
        .from("plans")
        .select("id, slug, name, price_monthly, subscription_provider, provider_price_id")
        .eq("id", payload.planId)
        .eq("is_active", true)
        .gt("price_monthly", 0)
        .maybeSingle(),
    ]);

    if (storeError || !store) {
      return jsonResponse({ error: storeError?.message ?? "Loja nao encontrada." }, 404);
    }

    if (store.owner_user_id !== user.id) {
      return jsonResponse({ error: "Voce nao pode iniciar checkout para esta loja." }, 403);
    }

    if (planError || !plan) {
      return jsonResponse({ error: planError?.message ?? "Plano pago nao encontrado." }, 404);
    }

    if (!plan.provider_price_id) {
      return jsonResponse(
        { error: `O plano ${plan.name} ainda nao possui provider_price_id configurado para cobranca recorrente.` },
        422,
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, provider_customer_id")
      .eq("store_id", store.id)
      .maybeSingle();

    const customer =
      subscription?.provider_customer_id
        ? subscription.provider_customer_id
        : (
            await stripe.customers.create({
              email: user.email,
              name: store.name,
              metadata: {
                store_id: store.id,
                owner_user_id: user.id,
              },
            })
          ).id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
      customer,
      client_reference_id: store.id,
      line_items: [
        {
          price: plan.provider_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        store_id: store.id,
        plan_id: plan.id,
        owner_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          store_id: store.id,
          plan_id: plan.id,
          owner_user_id: user.id,
        },
      },
    });

    const subscriptionPayload = {
      store_id: store.id,
      plan_id: plan.id,
      provider: "stripe",
      provider_customer_id: customer,
      provider_checkout_id: session.id,
      status: "pendente_pagamento" as const,
      last_payment_status: "pending",
    };

    if (subscription?.id) {
      await supabase.from("subscriptions").update(subscriptionPayload).eq("id", subscription.id);
    } else {
      await supabase.from("subscriptions").insert(subscriptionPayload);
    }

    return jsonResponse({
      provider: "stripe",
      checkoutId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao criar checkout.";
    return jsonResponse({ error: message }, 500);
  }
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
