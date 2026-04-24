import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Inicial",
    price: "R$ 79",
    period: "/mês",
    desc: "Para quem está começando no delivery próprio.",
    features: ["Cardápio online", "Pedidos ilimitados", "Link próprio", "Gestão de produtos", "Suporte básico"],
    cta: "Começar grátis",
    variant: "outline" as const,
  },
  {
    name: "Profissional",
    price: "R$ 149",
    period: "/mês",
    desc: "Para negócios que querem crescer com organização.",
    features: ["Tudo do Inicial", "Cupons e promoções", "Taxas por bairro", "Relatórios completos", "Personalização visual", "Gestão de clientes"],
    cta: "Assinar Profissional",
    variant: "hero" as const,
    highlight: true,
  },
  {
    name: "White-label",
    price: "Sob consulta",
    period: "",
    desc: "Para agências e redes com múltiplas unidades.",
    features: ["Tudo do Profissional", "Multiunidades", "Domínio próprio", "Marca personalizada", "Recursos avançados", "Suporte prioritário"],
    cta: "Falar com vendas",
    variant: "outline" as const,
  },
];

export const Pricing = () => {
  return (
    <section id="planos" className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            Planos que cabem no seu <span className="text-gradient">faturamento</span>
          </h2>
          <p className="text-lg text-muted-foreground">Sem taxa por pedido. Cancele quando quiser.</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-smooth ${
                p.highlight
                  ? "border-primary/60 bg-gradient-card shadow-elegant scale-[1.02]"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                  Mais popular
                </div>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mb-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant={p.variant} size="lg" className="mt-auto w-full">{p.cta}</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
