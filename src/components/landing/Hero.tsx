import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle, ShieldCheck } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-[86svh] overflow-hidden pt-24 text-white md:pt-28">
      <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(0,255,255,0.14),transparent_20%),radial-gradient(circle_at_46%_60%,rgba(255,69,0,0.14),transparent_26%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.08)_0%,rgba(10,10,10,0.82)_100%)]" />

      <div className="container relative mx-auto flex min-h-[68svh] items-center px-4 pb-20">
        <div className="max-w-3xl animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Operacao propria para vender sem intermediarios
          </div>

          <h1 className="mb-6 max-w-3xl font-display text-4xl font-bold leading-[0.98] tracking-tight md:text-6xl lg:text-7xl">
            Vexor Delivery
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-8 text-white/72 md:text-xl">
            Cardapio online, pedidos, clientes, entregas e relatorios em um painel feito para restaurantes e negocios locais assumirem o controle do delivery.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="hero" size="xl" className="group" asChild>
              <Link to="/cadastrar">
                Criar minha loja
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="border-white/12 bg-background/55 text-white hover:bg-background/74" asChild>
              <a href="#como-funciona">
                <PlayCircle className="h-5 w-5" />
                Ver fluxo
              </a>
            </Button>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-1 gap-3 text-sm text-white/70 sm:grid-cols-3">
            <span className="border-l border-primary pl-3">Sem comissao por pedido</span>
            <span className="border-l border-primary pl-3">Checkout proprio</span>
            <span className="border-l border-primary pl-3">Pedidos em tempo real</span>
          </div>
        </div>
      </div>
    </section>
  );
};
