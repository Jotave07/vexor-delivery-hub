import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Inicial",
    price: "R$ 79",
    period: "/mes",
    desc: "Para validar o delivery proprio com uma operacao enxuta.",
    features: ["Cardapio online", "Pedidos ilimitados", "Link publico", "Gestao de produtos", "Suporte essencial"],
    cta: "Comecar gratis",
    variant: "outline" as const,
  },
  {
    name: "Profissional",
    price: "R$ 149",
    period: "/mes",
    desc: "Para lojas que precisam de rotina, dados e promocao.",
    features: ["Tudo do Inicial", "Cupons", "Taxas por bairro", "Relatorios completos", "Personalizacao visual", "Clientes"],
    cta: "Assinar Profissional",
    variant: "hero" as const,
    highlight: true,
  },
  {
    name: "Rede",
    price: "Sob consulta",
    period: "",
    desc: "Para grupos, franquias e operacoes com necessidades especificas.",
    features: ["Tudo do Profissional", "Multiunidades", "Dominio proprio", "Marca dedicada", "Recursos avancados", "Suporte prioritario"],
    cta: "Falar com vendas",
    variant: "outline" as const,
  },
];

export const Pricing = () => {
  return (
    <section id="planos" className="section-band py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">Planos</p>
          <h2 className="mb-4 text-3xl font-bold md:text-5xl">Custo previsivel para uma operacao mais independente.</h2>
          <p className="text-lg text-muted-foreground">Sem taxa por pedido e com troca de plano conforme a loja cresce.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`vexor-panel relative flex flex-col border bg-card p-7 shadow-card transition-smooth ${plan.highlight ? "border-primary shadow-elegant" : "border-border hover:border-primary/40"}`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-5 border border-primary bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                  Mais escolhido
                </div>
              )}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mb-6 mt-2 min-h-12 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant={plan.variant} size="lg" className="mt-auto w-full" asChild>
                <Link to="/cadastrar">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
