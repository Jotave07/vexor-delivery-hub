# Stripe Integration

## Onde a integracao fica

- `supabase/functions/create-order-checkout/index.ts`
- `supabase/functions/create-subscription-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/_shared/stripe-webhook-handler.ts`

## Fonte de verdade do pagamento

O frontend nunca confirma pagamento por query param de sucesso.

A confirmacao final vem do webhook assinado pelo Stripe:

- pedidos: atualiza `orders` e `payments`
- assinaturas: atualiza `subscriptions` e `stores.plan_id`

## Mapeamento atual

### Pedido avulso

- `checkout.session.completed`
  - marca `orders.payment_status` como `pago` ou `processando`
  - grava `payments.provider_session_id`
  - grava `payments.provider_payment_intent_id`
- `payment_intent.succeeded`
  - marca `orders.payment_status = pago`
  - marca `payments.status = pago`
  - preenche `paid_at`
- `payment_intent.payment_failed`
  - marca `orders.payment_status = falhou`
  - marca `payments.status = cancelado`
  - salva `failure_reason`
- `checkout.session.expired`
  - marca `orders.payment_status = expirado`

### Assinatura

- `checkout.session.completed`
  - salva `provider_customer_id`
  - salva `provider_checkout_id`
  - salva `provider_subscription_id` quando disponivel
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Os eventos acima atualizam:

- `subscriptions.status`
- `subscriptions.current_period_start`
- `subscriptions.current_period_end`
- `subscriptions.cancel_at_period_end`
- `subscriptions.last_payment_status`
- `stores.plan_id`

## Idempotencia

Todos os eventos entram primeiro em `public.stripe_events` por meio da function SQL `mark_stripe_event_processed`.

Se o `event.id` ja existir, o webhook retorna `200` com `duplicate: true` e nao reprocessa efeitos colaterais.

## Segurança aplicada

- validacao de `stripe-signature`
- uso de raw body
- segredo do webhook apenas no backend
- `STRIPE_SECRET_KEY` nunca exposta ao frontend
- recalculo e validacao do pedido pelo backend
- restricao de URLs de sucesso/cancelamento para a origem definida em `APP_URL`
- pedido online so cria checkout se `payment_method = cartao_online`

## Variáveis de ambiente

Obrigatorias:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`

Documentadas para uso publico / futuro:

- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Opcionais para fallback de retorno:

- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

## Testes

Cobertura automatizada em `src/test/stripe-webhook-handler.test.ts`:

- assinatura invalida
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- idempotencia
- `invoice.payment_succeeded`

## Stripe CLI

Exemplo local:

```bash
supabase functions serve stripe-webhook --no-verify-jwt --env-file .env
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

## Produção

Cadastre no Stripe Dashboard:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

Checklist:

- publicar a function `stripe-webhook`
- aplicar migrations
- configurar `STRIPE_WEBHOOK_SECRET`
- validar os `provider_price_id` dos planos
- testar um pagamento real em modo teste antes do go-live
