import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-card p-12 text-center shadow-elegant md:p-20">
          <div className="absolute inset-0 bg-gradient-hero opacity-70" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl animate-glow-pulse" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-glow/20 blur-3xl animate-glow-pulse" />

          <div className="relative">
            <h2 className="mx-auto mb-6 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">
              Comece a vender com seu próprio <span className="text-gradient">delivery hoje</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
              Junte-se a milhares de estabelecimentos que já cortaram comissões e assumiram o controle das próprias vendas.
            </p>
            <Button variant="hero" size="xl" className="group">
              Criar minha loja
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
