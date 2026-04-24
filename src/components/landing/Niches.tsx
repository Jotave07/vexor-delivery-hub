import { UtensilsCrossed, Beef, Pizza, IceCream, Croissant, ShoppingBasket, Sandwich, Cake, Salad, Wine } from "lucide-react";

const niches = [
  { icon: UtensilsCrossed, name: "Restaurantes" },
  { icon: Beef, name: "Hamburguerias" },
  { icon: Pizza, name: "Pizzarias" },
  { icon: IceCream, name: "Açaíterias" },
  { icon: Croissant, name: "Padarias" },
  { icon: ShoppingBasket, name: "Mercados" },
  { icon: Sandwich, name: "Lanchonetes" },
  { icon: Cake, name: "Docerias" },
  { icon: Salad, name: "Marmitarias" },
  { icon: Wine, name: "Petiscos e bebidas" },
];

export const Niches = () => {
  return (
    <section id="nichos" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            Feito para <span className="text-gradient">negócios locais</span>
          </h2>
          <p className="text-lg text-muted-foreground">Qualquer estabelecimento que vende e entrega pode usar a Vexor.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {niches.map((n) => (
            <div
              key={n.name}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-smooth group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <n.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">{n.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
