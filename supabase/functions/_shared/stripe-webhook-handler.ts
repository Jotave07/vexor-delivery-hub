type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined };

type StripeEventObject = Record<string, unknown>;

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: StripeEventObject;
  };
};

export type WebhookResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type OrderSnapshot = {
  id: string;
  couponId: string | null;
  paymentStatus: string;
  status: string;
  storeId: string;
};

export type OrderPaymentStateInput = {
  orderId: string;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  paymentStatus: "pendente" | "pago" | "cancelado";
  paidAt?: string | null;
  failureReason?: string | null;
  lastEventAt: string;
};

export type SubscriptionStateInput = {
  planId?: string | null;
  provider: "stripe";
  providerCustomerId?: string | null;
  providerCheckoutId?: string | null;
  providerSubscriptionId?: string | null;
  status: "trial" | "ativa" | "suspensa" | "cancelada" | "pendente_pagamento" | "inadimplente" | "bloqueada";
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  lastPaymentStatus?: string | null;
};

export type StripeWebhookRepository = {
  markEventProcessed: (eventId: string, eventType: string, payload: JsonValue) => Promise<boolean>;
  getOrderById: (orderId: string) => Promise<OrderSnapshot | null>;
  getOrderIdByPaymentIntentId: (paymentIntentId: string) => Promise<string | null>;
  saveOrderPaymentState: (input: OrderPaymentStateInput) => Promise<void>;
  updateOrderById: (
    orderId: string,
    payload: {
      paymentStatus?: "pendente" | "processando" | "pago" | "falhou" | "cancelado" | "expirado" | "reembolsado";
      status?: string;
    },
  ) => Promise<void>;
  insertOrderStatusHistory: (input: { orderId: string; storeId: string; status: string; notes: string }) => Promise<void>;
  incrementCouponUsage: (couponId: string) => Promise<void>;
  findPlanByPriceId: (priceId: string) => Promise<{ id: string } | null>;
  upsertSubscriptionByStoreId: (storeId: string, payload: SubscriptionStateInput) => Promise<void>;
  updateSubscriptionByProviderSubscriptionId: (providerSubscriptionId: string, payload: SubscriptionStateInput) => Promise<void>;
  updateStorePlan: (storeId: string, planId: string) => Promise<void>;
};

export type StripeWebhookLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

type HandleStripeWebhookArgs = {
  method: string;
  rawBody: string;
  signature: string | null;
  repository: StripeWebhookRepository;
  webhookSecret: string;
  constructEvent: (rawBody: string, signature: string, webhookSecret: string) => Promise<StripeWebhookEvent>;
  logger: StripeWebhookLogger;
  now?: () => string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

const asBoolean = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);

const toIsoDate = (value: unknown): string | null =>
  typeof value === "number" ? new Date(value * 1000).toISOString() : null;

const getMetadata = (object: StripeEventObject) =>
  isRecord(object.metadata) ? object.metadata : {};

const getCheckoutSessionMode = (object: StripeEventObject) => asString(object.mode);

const getCheckoutSessionOrderId = (object: StripeEventObject) => {
  const metadata = getMetadata(object);
  return asString(metadata.order_id) ?? asString(object.client_reference_id);
};

const getCheckoutSessionStoreId = (object: StripeEventObject) => {
  const metadata = getMetadata(object);
  return asString(metadata.store_id);
};

const getCheckoutSessionPlanId = (object: StripeEventObject) => {
  const metadata = getMetadata(object);
  return asString(metadata.plan_id);
};

const getPaymentIntentIdFromSession = (object: StripeEventObject) => {
  if (typeof object.payment_intent === "string") return object.payment_intent;
  if (isRecord(object.payment_intent)) return asString(object.payment_intent.id);
  return null;
};

const getSubscriptionIdFromSession = (object: StripeEventObject) => {
  if (typeof object.subscription === "string") return object.subscription;
  if (isRecord(object.subscription)) return asString(object.subscription.id);
  return null;
};

const getCustomerId = (object: StripeEventObject) => {
  if (typeof object.customer === "string") return object.customer;
  if (isRecord(object.customer)) return asString(object.customer.id);
  return null;
};

const getSubscriptionPriceIds = (object: StripeEventObject): string[] => {
  if (!isRecord(object.items) || !Array.isArray(object.items.data)) return [];
  return object.items.data
    .map((item) => {
      if (!isRecord(item) || !isRecord(item.price)) return null;
      return asString(item.price.id);
    })
    .filter((priceId): priceId is string => Boolean(priceId));
};

const getInvoicePriceIds = (object: StripeEventObject): string[] => {
  if (!isRecord(object.lines) || !Array.isArray(object.lines.data)) return [];
  return object.lines.data
    .map((item) => {
      if (!isRecord(item) || !isRecord(item.price)) return null;
      return asString(item.price.id);
    })
    .filter((priceId): priceId is string => Boolean(priceId));
};

const mapCheckoutPaymentStatusToOrderStatus = (paymentStatus: unknown) => {
  if (paymentStatus === "paid") return "pago" as const;
  if (paymentStatus === "unpaid" || paymentStatus === "no_payment_required") return "processando" as const;
  return "processando" as const;
};

const mapOrderStatusToPaymentStatus = (orderStatus: "pendente" | "processando" | "pago" | "falhou" | "cancelado" | "expirado" | "reembolsado") => {
  if (orderStatus === "pago") return "pago" as const;
  if (orderStatus === "falhou" || orderStatus === "cancelado" || orderStatus === "expirado" || orderStatus === "reembolsado") {
    return "cancelado" as const;
  }
  return "pendente" as const;
};

const mapStripeSubscriptionStatus = (stripeStatus: string | null) => {
  switch (stripeStatus) {
    case "trialing":
      return "trial" as const;
    case "active":
      return "ativa" as const;
    case "past_due":
    case "unpaid":
      return "inadimplente" as const;
    case "canceled":
      return "cancelada" as const;
    case "paused":
      return "bloqueada" as const;
    case "incomplete":
    case "incomplete_expired":
      return "pendente_pagamento" as const;
    default:
      return "pendente_pagamento" as const;
  }
};

const resolvePlanId = async (
  repository: StripeWebhookRepository,
  explicitPlanId: string | null,
  priceIds: string[],
) => {
  if (explicitPlanId) return explicitPlanId;

  for (const priceId of priceIds) {
    const plan = await repository.findPlanByPriceId(priceId);
    if (plan?.id) return plan.id;
  }

  return null;
};

const ensurePaidOrderSideEffects = async (
  repository: StripeWebhookRepository,
  logger: StripeWebhookLogger,
  order: OrderSnapshot,
) => {
  if (order.paymentStatus === "pago") return;

  if (order.couponId) {
    await repository.incrementCouponUsage(order.couponId);
  }

  if (order.status === "novo") {
    await repository.updateOrderById(order.id, { status: "confirmado" });
    await repository.insertOrderStatusHistory({
      orderId: order.id,
      storeId: order.storeId,
      status: "confirmado",
      notes: "Pagamento confirmado pelo Stripe",
    });
    logger.info("Pedido confirmado apos pagamento Stripe", { orderId: order.id });
  }
};

const handleOrderStatusChange = async (
  repository: StripeWebhookRepository,
  logger: StripeWebhookLogger,
  input: {
    orderId: string;
    sessionId?: string | null;
    paymentIntentId?: string | null;
    orderPaymentStatus: "pendente" | "processando" | "pago" | "falhou" | "cancelado" | "expirado" | "reembolsado";
    failureReason?: string | null;
    nowIso: string;
  },
) => {
  const order = await repository.getOrderById(input.orderId);
  if (!order) {
    logger.warn("Evento Stripe ignorado porque o pedido nao foi encontrado", { orderId: input.orderId });
    return;
  }

  await repository.saveOrderPaymentState({
    orderId: input.orderId,
    sessionId: input.sessionId ?? null,
    paymentIntentId: input.paymentIntentId ?? null,
    paymentStatus: mapOrderStatusToPaymentStatus(input.orderPaymentStatus),
    paidAt: input.orderPaymentStatus === "pago" ? input.nowIso : null,
    failureReason: input.failureReason ?? null,
    lastEventAt: input.nowIso,
  });

  await repository.updateOrderById(input.orderId, {
    paymentStatus: input.orderPaymentStatus,
  });

  if (input.orderPaymentStatus === "pago") {
    await ensurePaidOrderSideEffects(repository, logger, order);
  }
};

const handleCheckoutSessionCompleted = async (
  repository: StripeWebhookRepository,
  logger: StripeWebhookLogger,
  object: StripeEventObject,
  nowIso: string,
) => {
  const mode = getCheckoutSessionMode(object);
  if (mode === "subscription") {
    const storeId = getCheckoutSessionStoreId(object);
    const planId = getCheckoutSessionPlanId(object);
    const subscriptionId = getSubscriptionIdFromSession(object);
    const customerId = getCustomerId(object);

    if (!storeId) {
      logger.warn("checkout.session.completed de assinatura sem store_id", { sessionId: object.id });
      return;
    }

    const status = object.payment_status === "paid" ? "ativa" : "pendente_pagamento";
    await repository.upsertSubscriptionByStoreId(storeId, {
      planId,
      provider: "stripe",
      providerCustomerId: customerId,
      providerCheckoutId: asString(object.id),
      providerSubscriptionId: subscriptionId,
      status,
      lastPaymentStatus: object.payment_status === "paid" ? "paid" : "processing",
      currentPeriodStart: nowIso,
    });

    if (planId) {
      await repository.updateStorePlan(storeId, planId);
    }

    return;
  }

  const orderId = getCheckoutSessionOrderId(object);
  if (!orderId) {
    logger.warn("checkout.session.completed sem order_id", { sessionId: object.id });
    return;
  }

  await handleOrderStatusChange(repository, logger, {
    orderId,
    sessionId: asString(object.id),
    paymentIntentId: getPaymentIntentIdFromSession(object),
    orderPaymentStatus: mapCheckoutPaymentStatusToOrderStatus(object.payment_status),
    nowIso,
  });
};

const handlePaymentIntentEvent = async (
  repository: StripeWebhookRepository,
  logger: StripeWebhookLogger,
  object: StripeEventObject,
  eventType: "payment_intent.succeeded" | "payment_intent.payment_failed",
  nowIso: string,
) => {
  const metadata = getMetadata(object);
  const paymentIntentId = asString(object.id);
  const orderId = asString(metadata.order_id) ?? (paymentIntentId ? await repository.getOrderIdByPaymentIntentId(paymentIntentId) : null);

  if (!paymentIntentId || !orderId) {
    logger.warn("payment_intent sem vinculo com pedido", { paymentIntentId, eventType });
    return;
  }

  await handleOrderStatusChange(repository, logger, {
    orderId,
    paymentIntentId,
    orderPaymentStatus: eventType === "payment_intent.succeeded" ? "pago" : "falhou",
    failureReason:
      eventType === "payment_intent.payment_failed" && isRecord(object.last_payment_error)
        ? asString(object.last_payment_error.message)
        : null,
    nowIso,
  });
};

const handleSubscriptionEvent = async (
  repository: StripeWebhookRepository,
  logger: StripeWebhookLogger,
  object: StripeEventObject,
  eventType:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed"
    | "invoice.paid",
  nowIso: string,
) => {
  const metadata = getMetadata(object);
  const storeId = asString(metadata.store_id);
  const explicitPlanId = asString(metadata.plan_id);
  const providerCustomerId = getCustomerId(object);
  const providerSubscriptionId =
    eventType.startsWith("customer.subscription")
      ? asString(object.id)
      : asString(object.subscription) ?? asString(object.id);

  if (!providerSubscriptionId && !storeId) {
    logger.warn("Evento de assinatura sem identificadores suficientes", { eventType });
    return;
  }

  const priceIds =
    eventType.startsWith("customer.subscription")
      ? getSubscriptionPriceIds(object)
      : getInvoicePriceIds(object);
  const planId = await resolvePlanId(repository, explicitPlanId, priceIds);

  const payload: SubscriptionStateInput = {
    planId,
    provider: "stripe",
    providerCustomerId,
    providerSubscriptionId,
    status:
      eventType === "invoice.payment_failed"
        ? "inadimplente"
        : eventType === "invoice.payment_succeeded" || eventType === "invoice.paid"
          ? "ativa"
          : eventType === "customer.subscription.deleted"
            ? "cancelada"
            : mapStripeSubscriptionStatus(asString(object.status)),
    currentPeriodStart: toIsoDate(object.current_period_start) ?? nowIso,
    currentPeriodEnd: toIsoDate(object.current_period_end),
    cancelAtPeriodEnd: asBoolean(object.cancel_at_period_end) ?? false,
    lastPaymentStatus:
      eventType === "invoice.payment_failed"
        ? "failed"
        : eventType === "invoice.payment_succeeded" || eventType === "invoice.paid"
          ? "paid"
          : asString(object.status),
  };

  if (storeId) {
    await repository.upsertSubscriptionByStoreId(storeId, payload);
    if (planId) {
      await repository.updateStorePlan(storeId, planId);
    }
    return;
  }

  if (providerSubscriptionId) {
    await repository.updateSubscriptionByProviderSubscriptionId(providerSubscriptionId, payload);
  }
};

export const handleStripeWebhookRequest = async ({
  method,
  rawBody,
  signature,
  repository,
  webhookSecret,
  constructEvent,
  logger,
  now = () => new Date().toISOString(),
}: HandleStripeWebhookArgs): Promise<WebhookResponse> => {
  if (method !== "POST") {
    return {
      status: 405,
      body: { error: "Method not allowed." },
    };
  }

  if (!signature) {
    return {
      status: 400,
      body: { error: "Cabecalho stripe-signature ausente." },
    };
  }

  let event: StripeWebhookEvent;
  try {
    event = await constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura invalida.";
    logger.warn("Assinatura Stripe invalida", { message });
    return {
      status: 400,
      body: { error: "Assinatura Stripe invalida." },
    };
  }

  const isNewEvent = await repository.markEventProcessed(
    event.id,
    event.type,
    event as unknown as JsonValue,
  );

  if (!isNewEvent) {
    logger.info("Evento Stripe duplicado ignorado", { eventId: event.id, eventType: event.type });
    return {
      status: 200,
      body: { received: true, duplicate: true },
    };
  }

  const nowIso = now();
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(repository, logger, object, nowIso);
      break;
    case "checkout.session.expired": {
      const orderId = getCheckoutSessionOrderId(object);
      if (orderId) {
        await handleOrderStatusChange(repository, logger, {
          orderId,
          sessionId: asString(object.id),
          paymentIntentId: getPaymentIntentIdFromSession(object),
          orderPaymentStatus: "expirado",
          failureReason: "Sessao Stripe expirada sem pagamento.",
          nowIso,
        });
      }
      break;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
      await handlePaymentIntentEvent(repository, logger, object, event.type, nowIso);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    case "invoice.paid":
      await handleSubscriptionEvent(repository, logger, object, event.type, nowIso);
      break;
    default:
      logger.info("Evento Stripe recebido e ignorado", { eventType: event.type, eventId: event.id });
      break;
  }

  return {
    status: 200,
    body: { received: true },
  };
};
