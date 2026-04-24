import { Zap } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Vexor Delivery</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A plataforma de delivery próprio para negócios locais.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#beneficios" className="hover:text-foreground">Benefícios</a></li>
              <li><a href="#como-funciona" className="hover:text-foreground">Como funciona</a></li>
              <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Sobre a Vexor</a></li>
              <li><a href="#" className="hover:text-foreground">Contato</a></li>
              <li><a href="#" className="hover:text-foreground">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Termos de uso</a></li>
              <li><a href="#" className="hover:text-foreground">Privacidade</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Vexor. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
