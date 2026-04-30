import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import { normalizePlan } from "@/lib/subscription";

type PlanRow = Tables<"plans">;
const SALES_PHONE_LABEL = "(27) 99528-8081";
const SALES_PHONE_LINK = "https://wa.me/5527995288081";
const SALES_EMAIL = "jvieira@vexortech.com.br";

export const Pricing = () => {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesOpen, setSalesOpen] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (!error) {
        setPlans((data ?? []) as PlanRow[]);
      }

      setLoading(false);
    };

    void loadPlans();
  }, []);

  const pricingPlans = useMemo(
    () => plans.map((plan, index) => buildPricingPlan(plan, index)),
    [plans],
  );

  return (
    <section id="planos" className="section-band py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Planos</p>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight md:text-5xl">Custo previsivel para uma operacao mais independente.</h2>
          <p className="text-lg leading-8 text-muted-foreground">Os cards abaixo sempre leem os planos ativos cadastrados no painel administrativo da Vexor.</p>
        </div>

        {loading ? (
          <div className="rounded-lg border border-border/90 bg-card p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Carregando planos...
          </div>
        ) : pricingPlans.length === 0 ? (
          <div className="rounded-lg border border-border/90 bg-card p-8 text-sm text-muted-foreground">
            Nenhum plano ativo foi encontrado no painel administrativo.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col border bg-card p-7 transition-smooth ${
                  plan.highlight ? "border-primary bg-card" : "border-border/90 hover:border-primary/40"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-5 bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                    Mais escolhido
                  </div>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className="mb-6 mt-2 min-h-12 text-sm leading-7 text-muted-foreground">{plan.description}</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{plan.priceLabel}</span>
                  <span className="text-sm text-muted-foreground">{plan.periodLabel}</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.isEnterprise ? (
                  <Button variant={plan.variant} size="lg" className="mt-auto w-full" onClick={() => setSalesOpen(true)}>
                    {plan.cta}
                  </Button>
                ) : (
                  <Button variant={plan.variant} size="lg" className="mt-auto w-full" asChild>
                    <Link to="/cadastrar">{plan.cta}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={salesOpen} onOpenChange={setSalesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Falar com vendas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Entre em contato para montar a melhor configuracao para sua operacao.
            </p>
            <div className="rounded-lg border border-border bg-secondary/35 p-4 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">WhatsApp</div>
                <div className="mt-1 font-medium text-foreground">{SALES_PHONE_LABEL}</div>
                <a
                  href={SALES_PHONE_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-primary underline-offset-4 hover:underline"
                >
                  Abrir conversa no WhatsApp
                </a>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">E-mail</div>
                <a
                  href={`mailto:${SALES_EMAIL}`}
                  className="mt-1 inline-flex font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {SALES_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

const buildPricingPlan = (plan: PlanRow, index: number) => {
  const normalized = normalizePlan(plan);
  const features = normalized?.marketingFeatures?.length
    ? normalized.marketingFeatures
    : buildFallbackFeatures(plan, normalized);
  const isEnterprise = isEnterprisePlan(plan);
  const isFree = Number(plan.price_monthly ?? 0) <= 0;
  const highlight = plan.slug === "profissional" || index === 1;

  return {
    id: plan.id,
    isEnterprise,
    name: plan.name,
    description: plan.description ?? "Plano configurado no painel administrativo da Vexor.",
    features,
    highlight,
    variant: highlight ? ("hero" as const) : ("outline" as const),
    cta: isEnterprise ? "Falar com vendas" : isFree ? "Comecar gratis" : `Assinar ${plan.name}`,
    priceLabel: isEnterprise && isFree ? "Sob consulta" : formatBRL(Number(plan.price_monthly ?? 0)),
    periodLabel: isEnterprise && isFree ? "" : "/mes",
  };
};

const buildFallbackFeatures = (plan: PlanRow, normalized: ReturnType<typeof normalizePlan>) => {
  const features: string[] = [];

  if (plan.max_products) {
    features.push(`${plan.max_products} produtos`);
  } else {
    features.push("Produtos ilimitados");
  }

  if (normalized?.limits.monthlyOrders) {
    features.push(`${normalized.limits.monthlyOrders} pedidos por mes`);
  } else {
    features.push("Pedidos ilimitados");
  }

  features.push("Link publico da loja");

  if (plan.allows_coupons) {
    features.push("Cupons");
  }

  if (plan.allows_advanced_reports) {
    features.push("Relatorios completos");
  }

  if (plan.allows_custom_branding) {
    features.push("Personalizacao visual");
  }

  if (plan.allows_custom_domain) {
    features.push("Dominio proprio");
  }

  if (normalized?.capabilities.multiStore) {
    features.push("Multiunidades");
  }

  return Array.from(new Set(features)).slice(0, 6);
};

const isEnterprisePlan = (plan: PlanRow) => {
  const slug = plan.slug.toLowerCase();
  const name = plan.name.toLowerCase();

  return slug.includes("rede") || slug.includes("white") || name.includes("rede");
};
