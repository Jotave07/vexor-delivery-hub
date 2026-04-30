import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto flex flex-col gap-8 border border-border/90 bg-card px-6 py-10 shadow-card md:flex-row md:items-center md:justify-between md:px-10">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Pronto para operar</p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">Venda no seu link, acompanhe no seu painel, mantenha sua margem.</h2>
        </div>
        <Button variant="hero" size="xl" className="w-full shrink-0 md:w-auto" asChild>
          <Link to="/cadastrar">
            Criar minha loja
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
};
