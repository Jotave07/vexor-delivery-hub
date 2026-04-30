import { supabase } from "@/integrations/supabase/client";

export type BillingProvider = "stripe";

export type CreateSubscriptionCheckoutInput = {
  planId: string;
  storeId: string;
  successUrl: string;
  cancelUrl: string;
  provider?: BillingProvider;
};

export type CreateSubscriptionCheckoutResult = {
  checkoutUrl: string;
  provider: BillingProvider;
  checkoutId?: string | null;
};

export const createSubscriptionCheckout = async ({
  planId,
  storeId,
  successUrl,
  cancelUrl,
  provider = "stripe",
}: CreateSubscriptionCheckoutInput): Promise<CreateSubscriptionCheckoutResult> => {
  const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
    body: {
      planId,
      storeId,
      successUrl,
      cancelUrl,
      provider,
    },
  });

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error));
  }

  if (!data?.checkoutUrl) {
    throw new Error("O backend nao retornou uma URL de checkout para a assinatura.");
  }

  return data as CreateSubscriptionCheckoutResult;
};

const resolveFunctionErrorMessage = async (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "Falha ao iniciar o checkout da assinatura.";
  }

  const defaultMessage =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "Falha ao iniciar o checkout da assinatura.";

  if (!("context" in error) || !error.context || typeof error.context !== "object") {
    return defaultMessage;
  }

  const context = error.context as { json?: () => Promise<unknown>; text?: () => Promise<string> };

  try {
    const payload = context.json ? await context.json() : null;
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // ignore and try plain text fallback
  }

  try {
    const text = context.text ? await context.text() : "";
    if (text) return text;
  } catch {
    // ignore and use default message
  }

  return defaultMessage;
};
