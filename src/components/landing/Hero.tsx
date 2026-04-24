import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div
        className="absolute inset-0 opacity-30 mix-blend-screen"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 grid-pattern opacity-40" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma SaaS de delivery próprio
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Seu delivery próprio,{" "}
            <span className="text-gradient">sem comissões abusivas</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Com a Vexor Delivery, restaurantes e negócios locais vendem online com cardápio próprio,
            pedidos organizados e controle total sobre clientes, entregas e pagamentos.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="hero" size="xl" className="group">
              Começar agora
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="xl">
              <PlayCircle className="h-5 w-5" />
              Ver demonstração
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-success" />Sem comissão por pedido</span>
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-success" />Setup em minutos</span>
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-success" />Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </section>
  );
};
