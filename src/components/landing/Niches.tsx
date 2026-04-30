import { Beef, Cake, Croissant, IceCream, Pizza, Salad, Sandwich, ShoppingBasket, UtensilsCrossed, Wine } from "lucide-react";

const niches = [
  { icon: UtensilsCrossed, name: "Restaurantes" },
  { icon: Beef, name: "Hamburguerias" },
  { icon: Pizza, name: "Pizzarias" },
  { icon: IceCream, name: "Acaiterias" },
  { icon: Croissant, name: "Padarias" },
  { icon: ShoppingBasket, name: "Mercados" },
  { icon: Sandwich, name: "Lanchonetes" },
  { icon: Cake, name: "Docerias" },
  { icon: Salad, name: "Marmitarias" },
  { icon: Wine, name: "Petiscos e bebidas" },
];

export const Niches = () => {
  return (
    <section id="nichos" className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Segmentos</p>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight md:text-5xl">Feito para negocios que precisam vender com agilidade.</h2>
          <p className="text-lg leading-8 text-muted-foreground">A estrutura serve para estabelecimentos com retirada, entrega propria ou operacao hibrida.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {niches.map((niche) => (
            <div key={niche.name} className="group flex min-h-32 flex-col items-center justify-center gap-3 border border-border/90 bg-card p-5 text-center transition-smooth hover:border-primary/45">
              <div className="flex h-11 w-11 items-center justify-center bg-secondary text-primary transition-smooth group-hover:bg-primary/12">
                <niche.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">{niche.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
