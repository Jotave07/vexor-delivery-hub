# Deploy na VPS Hostinger

Este projeto usa uma arquitetura hibrida:

- frontend estatico em `Vite + React`
- backend e banco no `Supabase`
- pagamentos e webhook Stripe em `Supabase Edge Functions`

## Estratégia recomendada

Para a VPS da Hostinger, a estrategia mais simples e robusta e:

1. buildar o frontend com Node.js
2. publicar o conteudo de `dist/` na VPS
3. servir os arquivos estaticos com `Nginx`
4. usar `HTTPS` com `Certbot`
5. manter o `Supabase` como backend oficial
6. expor o webhook Stripe no seu dominio com um `proxy_pass` do Nginx para a Edge Function publica

Nao recomendo Docker aqui como primeira opcao, porque:

- o projeto nao depende de um servidor Node em runtime para o frontend
- o backend nao roda localmente na VPS por padrao
- Nginx servindo estatico fica mais simples, barato e facil de manter

Tambem nao recomendo PM2 como processo principal desta aplicacao, porque o frontend final e estatico. PM2 so faria sentido se voce quisesse rodar um servidor Node auxiliar, o que nao e necessario na arquitetura atual.

## 1. Analise da stack

### Framework e linguagem

- frontend: `React 18`
- bundler: `Vite 5`
- linguagem: `TypeScript 5`
- estilos: `Tailwind CSS`
- rotas: `react-router-dom`

### Backend e banco

- backend: `Supabase`
- banco: `PostgreSQL` gerenciado pelo Supabase
- autenticacao: `Supabase Auth`
- server-side payments: `Supabase Edge Functions`

### Gerenciador de pacotes

- `npm`
- existe `package-lock.json`, entao o comando recomendado e `npm ci`

### Versão recomendada de runtime

- `Node.js 20 LTS`
- `npm 10+`

### Scripts disponiveis

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

Observacao:

- `npm run preview` existe apenas para validacao local
- para producao real na VPS, o recomendado e servir `dist/` via `Nginx`

### Comando de build

```bash
npm run build
```

### Comando de start em produção

Nao existe um `start` Node recomendado para producao, porque o build final e estatico.

Em producao, o fluxo correto e:

1. gerar `dist/`
2. copiar `dist/` para `/var/www/...`
3. deixar o `Nginx` servir os arquivos

### Portas usadas

- desenvolvimento Vite: `8080` conforme `vite.config.ts`
- producao recomendada:
  - `80` HTTP
  - `443` HTTPS
- nao ha porta interna obrigatoria de app em runtime no modelo recomendado

### Dependências externas

- `Supabase`:
  - projeto
  - banco PostgreSQL
  - auth
  - edge functions
- `Stripe`:
  - Checkout
  - webhook

## 2. Variáveis de ambiente

Crie um `.env` apenas no ambiente de build ou CI. Nao commite esse arquivo.

Base recomendada:

```env
VITE_SUPABASE_PROJECT_ID=SEU_SUPABASE_PROJECT_REF
VITE_SUPABASE_URL=https://SEU_SUPABASE_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SEU_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_ou_pk_test

APP_URL=https://SEU_DOMINIO.com
STRIPE_SUCCESS_URL=https://SEU_DOMINIO.com/app/assinatura?state=pending_payment
STRIPE_CANCEL_URL=https://SEU_DOMINIO.com/app/assinatura?state=no_plan
```

Importante:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

nao sao usadas pelo frontend da VPS; elas precisam ficar configuradas nas `Supabase Edge Functions`.

## 3. Acesso à VPS

Exemplo de acesso SSH:

```bash
ssh root@SEU_IP
```

Recomendado criar um usuario nao-root:

```bash
adduser deploy
usermod -aG sudo deploy
```

Depois use:

```bash
ssh deploy@SEU_IP
```

## 4. Atualização inicial da VPS

Ubuntu/Debian:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip ca-certificates gnupg lsb-release ufw
```

## 5. Instalação do ambiente

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### PM2

PM2 nao e necessario para servir este frontend, mas se quiser manter instalado para outros processos:

```bash
sudo npm install -g pm2
pm2 -v
```

### Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 6. Firewall básico

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 7. Clonar o projeto

```bash
sudo mkdir -p /var/www/vexor-delivery-hub
sudo chown -R $USER:$USER /var/www/vexor-delivery-hub
cd /var/www/vexor-delivery-hub
git clone SEU_REPOSITORIO repo
cd repo
```

## 8. Configuração do projeto

### Instalar dependências

```bash
npm ci
```

### Criar `.env`

```bash
cp .env.example .env
nano .env
```

Preencha com os valores reais de producao.

### Validar build

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 9. Banco de dados e migrations

O banco de dados deste projeto nao roda localmente na VPS por padrao. Ele vive no `Supabase PostgreSQL`.

### Caminho recomendado

- manter o banco no Supabase
- aplicar migrations com Supabase CLI ou pipeline de deploy
- publicar tambem as Edge Functions no projeto de producao

Exemplo com Supabase CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_SUPABASE_PROJECT_REF
supabase db push
supabase functions deploy stripe-webhook
supabase functions deploy create-order-checkout
supabase functions deploy create-subscription-checkout
```

### Configurar secrets das Edge Functions

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  SUPABASE_URL=https://SEU_SUPABASE_PROJECT_REF.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY \
  APP_URL=https://SEU_DOMINIO.com \
  STRIPE_SUCCESS_URL=https://SEU_DOMINIO.com/app/assinatura?state=pending_payment \
  STRIPE_CANCEL_URL=https://SEU_DOMINIO.com/app/assinatura?state=no_plan
```

Se voce preferir, tambem pode rodar esse passo localmente ou no CI, desde que a base de producao seja a do Supabase.

### Backup basico

Como o banco esta no Supabase, faca backup por:

- backups do painel do Supabase
- `pg_dump` apontando para a string de conexao de producao

Exemplo:

```bash
pg_dump "DATABASE_URL" > backup-$(date +%F).sql
```

## 10. Deploy recomendado na VPS

### Estrutura sugerida

```text
/var/www/vexor-delivery-hub/
  repo/
  releases/
  current -> /var/www/vexor-delivery-hub/releases/2026xxxxxx
```

### Build e publicacao manual

```bash
cd /var/www/vexor-delivery-hub/repo
npm ci
npm run build

RELEASE_DIR=/var/www/vexor-delivery-hub/releases/$(date +%Y%m%d%H%M%S)
mkdir -p "$RELEASE_DIR"
rsync -av --delete dist/ "$RELEASE_DIR"/
ln -sfn "$RELEASE_DIR" /var/www/vexor-delivery-hub/current
```

## 11. Nginx

Crie o arquivo:

```bash
sudo nano /etc/nginx/sites-available/vexor-delivery-hub
```

Configuracao recomendada:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    root /var/www/vexor-delivery-hub/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Webhook Stripe publico no seu dominio.
    # A rota publica da VPS e /api/stripe/webhook,
    # mas o processamento real continua na Edge Function do Supabase.
    location = /api/stripe/webhook {
        proxy_pass https://SEU_SUPABASE_PROJECT_REF.supabase.co/functions/v1/stripe-webhook;
        proxy_http_version 1.1;

        proxy_set_header Host SEU_SUPABASE_PROJECT_REF.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Stripe-Signature $http_stripe_signature;
    }
}
```

Ative o site:

```bash
sudo ln -s /etc/nginx/sites-available/vexor-delivery-hub /etc/nginx/sites-enabled/vexor-delivery-hub
sudo nginx -t
sudo systemctl reload nginx
```

## 12. HTTPS com Certbot

```bash
sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com
```

Teste renovacao:

```bash
sudo certbot renew --dry-run
```

Verifique o timer:

```bash
sudo systemctl status certbot.timer
```

## 13. Stripe em produção

### Chaves

No Supabase, configure nas Edge Functions:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

### URL pública do webhook

Voce pode usar uma destas opcoes:

1. URL do seu dominio na VPS, recomendada para centralizar tudo:

```text
https://SEU_DOMINIO.com/api/stripe/webhook
```

2. URL direta da Edge Function do Supabase:

```text
https://SEU_SUPABASE_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Como voce quer o webhook publico sob a URL da aplicacao, a opcao recomendada neste projeto e:

```text
https://SEU_DOMINIO.com/api/stripe/webhook
```

### Eventos para ativar no Dashboard Stripe

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Importante

O endpoint real que processa o webhook continua sendo a Edge Function:

```text
/functions/v1/stripe-webhook
```

Na VPS, o Nginx so faz proxy da rota publica:

```text
/api/stripe/webhook
```

## 14. PM2

### Recomendação

Para esta aplicacao, PM2 nao e o processo principal recomendado.

Motivo:

- o build final e estatico
- o Nginx entrega os arquivos diretamente
- nao ha API Node local para manter viva

### Se ainda quiser usar PM2 para algum servidor auxiliar

Comandos uteis:

```bash
pm2 list
pm2 logs
pm2 restart NOME
pm2 stop NOME
pm2 delete NOME
pm2 save
pm2 startup
```

## 15. Validação pós-deploy

### Validar arquivos publicados

```bash
ls -lah /var/www/vexor-delivery-hub/current
```

### Validar Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx --no-pager -n 200
```

### Testar aplicação

```bash
curl -I http://SEU_DOMINIO.com
curl -I https://SEU_DOMINIO.com
curl https://SEU_DOMINIO.com
```

### Testar webhook publico

```bash
curl -i -X POST https://SEU_DOMINIO.com/api/stripe/webhook
```

Sem assinatura Stripe valida, o esperado e erro `400`, o que confirma que a rota publica existe e esta chegando ao validador.

### Testar rota local servida pelo Nginx

```bash
curl -I http://127.0.0.1
```

### Verificar portas

```bash
sudo ss -tulpn | grep -E ':80|:443'
```

## 16. Segurança básica da VPS

- use usuario nao-root para deploy
- mantenha apenas portas `22`, `80` e `443` abertas
- nao exponha porta interna de app, porque neste modelo nao ha servidor Node publico
- mantenha `.env` fora do Git
- armazene segredos server-side no Supabase e/ou CI seguro
- force HTTPS
- revise logs do Nginx e eventos do Stripe
- gire segredos se algum arquivo sensivel foi exposto no passado

## 17. Checklist final

- dominio apontando para o IP da VPS
- app acessivel por `https://SEU_DOMINIO.com`
- Nginx configurado
- SSL ativo
- `.env` de build configurado
- `npm run build` funcionando
- Supabase conectado
- migrations aplicadas no Supabase
- webhook Stripe publico configurado
- `https://SEU_DOMINIO.com/api/stripe/webhook` respondendo
- logs do Nginx funcionando
- teste real em modo test validado
- so depois trocar tudo para modo live

## 18. O que fazer dentro da Hostinger

1. Criar a VPS.
2. Apontar o dominio para o IP da VPS no DNS da Hostinger.
3. Acessar via SSH.
4. Instalar `Node.js 20`, `Git`, `Nginx` e `Certbot`.
5. Clonar o repositorio.
6. Criar `.env` com os valores publicos do frontend.
7. Rodar `npm ci && npm run build`.
8. Copiar `dist/` para `/var/www/vexor-delivery-hub/current`.
9. Configurar o site no Nginx.
10. Ativar HTTPS com Certbot.
11. No Supabase, publicar e configurar as Edge Functions com os segredos Stripe.
12. No Stripe Dashboard, cadastrar:

```text
https://SEU_DOMINIO.com/api/stripe/webhook
```

13. Fazer um pagamento real em modo test antes de virar live.
