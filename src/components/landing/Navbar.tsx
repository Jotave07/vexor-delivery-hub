import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Vexor<span className="text-primary"> Delivery</span>
          </span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#beneficios" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Benefícios</a>
          <a href="#como-funciona" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Como funciona</a>
          <a href="#nichos" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Para quem</a>
          <a href="#planos" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Planos</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild><Link to="/entrar">Entrar</Link></Button>
          <Button variant="hero" size="sm" asChild><Link to="/cadastrar">Começar agora</Link></Button>
        </div>
      </nav>
    </header>
  );
};
