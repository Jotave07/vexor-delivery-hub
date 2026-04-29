import { describe, expect, it, vi } from "vitest";
import {
  handleStripeWebhookRequest,
  type OrderPaymentStateInput,
  type StripeWebhookEvent,
  type StripeWebhookLogger,
  type StripeWebhookRepository,
  type SubscriptionStateInput,
} from "../../supabase/functions/_shared/stripe-webhook-handler";

type MemoryState = {
  processedEvents: Set<string>;
  orders: Record<string, { id: string; couponId: string | null; paymentStatus: string; status: string; storeId: string }>;
  paymentsByOrderId: Record<string, OrderPaymentStateInput | undefined>;
  paymentIntentToOrderId: Record<string, string | undefined>;
  orderHistory: Array<{ orderId: string; storeId: string; status: string; notes: string }>;
  couponIncrements: string[];
  priceToPlanId: Record<string, string | undefined>;
  subscriptionsByStoreId: Record<string, SubscriptionStateInput | undefined>;
  subscriptionsByProviderSubscriptionId: Record<string, SubscriptionStateInput | undefined>;
  storePlans: Record<string, string | undefined>;
};

const createRepository = (state: MemoryState): StripeWebhookRepository => ({
  markEventProcessed: async (eventId) => {
    if (state.processedEvents.has(eventId)) return false;
    state.processedEvents.add(eventId);
    return true;
  },
  getOrderById: async (orderId) => state.orders[orderId] ?? null,
  getOrderIdByPaymentIntentId: async (paymentIntentId) => state.paymentIntentToOrderId[paymentIntentId] ?? null,
  saveOrderPaymentState: async (input) => {
    state.paymentsByOrderId[input.orderId] = input;
    if (input.paymentIntentId) state.paymentIntentToOrderId[input.paymentIntentId] = input.orderId;
  },
  updateOrderById: async (orderId, payload) => {
    const order = state.orders[orderId];
    if (!order) return;
    state.orders[orderId] = {
      ...order,
      paymentStatus: payload.paymentStatus ?? order.paymentStatus,
      status: payload.status ?? order.status,
    };
  },
  insertOrderStatusHistory: async (input) => {
    state.orderHistory.push(input);
  },
  incrementCouponUsage: async (couponId) => {
    state.couponIncrements.push(couponId);
  },
  findPlanByPriceId: async (priceId) => {
    const planId = state.priceToPlanId[priceId];
    return planId ? { id: planId } : null;
  },
  upsertSubscriptionByStoreId: async (storeId, payload) => {
    state.subscriptionsByStoreId[storeId] = payload;
    if (payload.providerSubscriptionId) {
      state.subscriptionsByProviderSubscriptionId[payload.providerSubscriptionId] = payload;
    }
  },
  updateSubscriptionByProviderSubscriptionId: async (providerSubscriptionId, payload) => {
    state.subscriptionsByProviderSubscriptionId[providerSubscriptionId] = payload;
  },
  updateStorePlan: async (storeId, planId) => {
    state.storePlans[storeId] = planId;
  },
});

const logger: StripeWebhookLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const createState = (): MemoryState => ({
  processedEvents: new Set<string>(),
  orders: {
    order_1: {
      id: "order_1",
      couponId: "coupon_1",
      paymentStatus: "processando",
      status: "novo",
      storeId: "store_1",
    },
  },
  paymentsByOrderId: {},
  paymentIntentToOrderId: {},
  orderHistory: [],
  couponIncrements: [],
  priceToPlanId: {
    price_basic: "plan_basic",
  },
  subscriptionsByStoreId: {},
  subscriptionsByProviderSubscriptionId: {},
  storePlans: {},
});

const handleEvent = async (event: StripeWebhookEvent, state = createState()) => {
  const repository = createRepository(state);
  const response = await handleStripeWebhookRequest({
    method: "POST",
    rawBody: JSON.stringify(event),
    signature: "sig_test",
    webhookSecret: "whsec_test",
    repository,
    logger,
    now: () => "2026-04-29T13:30:00.000Z",
    constructEvent: async () => event,
  });

  return { response, state };
};

describe("stripe webhook handler", () => {
  it("retorna 400 para assinatura invalida", async () => {
    const response = await handleStripeWebhookRequest({
      method: "POST",
      rawBody: "{}",
      signature: "sig_invalid",
      webhookSecret: "whsec_test",
      repository: createRepository(createState()),
      logger,
      constructEvent: async () => {
        throw new Error("invalid signature");
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Assinatura Stripe invalida." });
  });

  it("processa checkout.session.completed de pedido e confirma o acesso", async () => {
    const { response, state } = await handleEvent({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          mode: "payment",
          client_reference_id: "order_1",
          payment_status: "paid",
          payment_intent: "pi_123",
          metadata: {
            order_id: "order_1",
            store_id: "store_1",
          },
        },
      },
    });

    expect(response.status).toBe(200);
    expect(state.orders.order_1.paymentStatus).toBe("pago");
    expect(state.orders.order_1.status).toBe("confirmado");
    expect(state.paymentsByOrderId.order_1).toMatchObject({
      orderId: "order_1",
      sessionId: "cs_test_123",
      paymentIntentId: "pi_123",
      paymentStatus: "pago",
    });
    expect(state.couponIncrements).toEqual(["coupon_1"]);
    expect(state.orderHistory).toHaveLength(1);
  });

  it("processa payment_intent.succeeded via lookup de payment intent", async () => {
    const state = createState();
    state.paymentIntentToOrderId.pi_lookup = "order_1";

    await handleEvent(
      {
        id: "evt_payment_intent_succeeded",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_lookup",
            metadata: {},
          },
        },
      },
      state,
    );

    expect(state.orders.order_1.paymentStatus).toBe("pago");
    expect(state.paymentsByOrderId.order_1?.paymentStatus).toBe("pago");
  });

  it("processa payment_intent.payment_failed", async () => {
    const { state } = await handleEvent({
      id: "evt_payment_failed",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_failed",
          metadata: {
            order_id: "order_1",
          },
          last_payment_error: {
            message: "Cartao recusado",
          },
        },
      },
    });

    expect(state.orders.order_1.paymentStatus).toBe("falhou");
    expect(state.paymentsByOrderId.order_1).toMatchObject({
      paymentStatus: "cancelado",
      failureReason: "Cartao recusado",
    });
  });

  it("nao reprocessa o mesmo evento", async () => {
    const state = createState();
    const event: StripeWebhookEvent = {
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_duplicate",
          mode: "payment",
          client_reference_id: "order_1",
          payment_status: "paid",
          metadata: {
            order_id: "order_1",
          },
        },
      },
    };

    const first = await handleEvent(event, state);
    const second = await handleEvent(event, state);

    expect(first.response.body).toEqual({ received: true });
    expect(second.response.body).toEqual({ received: true, duplicate: true });
    expect(state.orderHistory).toHaveLength(1);
  });

  it("atualiza assinaturas com base em invoice.payment_succeeded", async () => {
    const { state } = await handleEvent({
      id: "evt_invoice_paid",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_123",
          subscription: "sub_123",
          customer: "cus_123",
          lines: {
            data: [
              {
                price: {
                  id: "price_basic",
                },
              },
            ],
          },
          metadata: {
            store_id: "store_1",
          },
          current_period_start: 1_777_465_800,
          current_period_end: 1_780_057_000,
        },
      },
    });

    expect(state.subscriptionsByStoreId.store_1).toMatchObject({
      providerSubscriptionId: "sub_123",
      providerCustomerId: "cus_123",
      planId: "plan_basic",
      status: "ativa",
      lastPaymentStatus: "paid",
    });
    expect(state.storePlans.store_1).toBe("plan_basic");
  });
});
