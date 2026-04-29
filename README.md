# Vexor Delivery Hub

Aplicacao React + Supabase para operacao de delivery proprio, com vitrine publica, checkout, acompanhamento de pedidos, painel da loja e administracao da plataforma.

## Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- Radix UI / shadcn-ui
- Supabase (Auth, Postgres, Edge Functions)
- Vitest
- Stripe Checkout + Stripe Webhooks

## Arquitetura resumida

- Frontend SPA em `src/` com `react-router-dom`.
- Backend serverless em `supabase/functions/`.
- Banco e regras em `supabase/migrations/`.
- Integracao Stripe dividida entre:
  - `supabase/functions/create-order-checkout`
  - `supabase/functions/create-subscription-checkout`
  - `supabase/functions/stripe-webhook`

O webhook oficial e unico para Stripe agora e `stripe-webhook`. Nao configure `stripe-order-webhook` nem `stripe-subscription-webhook` no Dashboard para evitar concorrencia desnecessaria entre endpoints legados.

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Fluxo de pagamento

### Pedido avulso

1. O frontend cria `orders`, `order_items`, `payments` e o historico inicial.
2. Se o metodo for `cartao_online`, o frontend chama `create-order-checkout`.
3. A Edge Function recalcula o total pelo banco e cria a Checkout Session no Stripe.
4. O Stripe redireciona o cliente.
5. O webhook `stripe-webhook` confirma o pagamento com base no evento assinado.
6. O webhook atualiza `orders.payment_status`, `payments`, confirma o pedido e registra historico.

### Assinatura

1. O lojista escolhe um plano pago.
2. O frontend chama `create-subscription-checkout`.
3. A Edge Function valida usuario, loja, plano e `provider_price_id`.
4. O Stripe cria a Checkout Session em `mode=subscription`.
5. O webhook `stripe-webhook` salva `provider_customer_id`, `provider_subscription_id`, status, periodo atual e plano efetivo.

## Endpoint do webhook

Produção Supabase:

```bash
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

Desenvolvimento local com Supabase CLI:

```bash
http://127.0.0.1:54321/functions/v1/stripe-webhook
```

## Eventos tratados

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.paid`

## Variáveis de ambiente

Veja `.env.example`.

Chaves secretas:

- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` devem existir apenas no backend / Edge Functions.
- `VITE_STRIPE_PUBLISHABLE_KEY` foi documentada para compatibilidade futura, mas o fluxo atual usa Stripe Checkout hospedado e nao precisa expor a secret key no frontend.

## Teste local com Stripe CLI

1. Suba o app e as Edge Functions.

```bash
npm run dev
supabase functions serve stripe-webhook --no-verify-jwt --env-file .env
```

2. Encaminhe os eventos Stripe para o webhook local.

```bash
stripe login
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

3. Copie o `whsec_...` exibido pelo `stripe listen` e coloque em `STRIPE_WEBHOOK_SECRET`.

4. Dispare eventos de teste.

```bash
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

5. Valide no banco:

- `orders.payment_status`
- `payments.status`
- `payments.provider_session_id`
- `payments.provider_payment_intent_id`
- `subscriptions.provider_customer_id`
- `subscriptions.provider_subscription_id`
- `subscriptions.current_period_start`
- `subscriptions.current_period_end`
- `stripe_events`

## Configuração em produção

1. Cadastre apenas o endpoint `stripe-webhook` no Stripe Dashboard.
2. Copie o segredo do endpoint para `STRIPE_WEBHOOK_SECRET`.
3. Garanta que `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `APP_URL` estejam definidos nas Edge Functions.
4. Confirme que todos os planos pagos possuem `plans.provider_price_id`.
5. Confirme que o metodo `cartao_online` esta habilitado em `store_settings.accept_card_online`.

## Checklist de deploy

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Aplicar migrations em `supabase/migrations/`
- Publicar a function `stripe-webhook`
- Configurar `STRIPE_WEBHOOK_SECRET`
- Configurar apenas um webhook Stripe no Dashboard

## Documentação adicional

Veja `docs/stripe-integration.md`.
