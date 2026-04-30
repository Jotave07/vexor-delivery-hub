import { Ban, Bell, Link2, MapPin, MessageCircle, Tag, Users } from "lucide-react";

const benefits = [
  { icon: Ban, title: "Margem preservada", desc: "Receba o valor dos pedidos sem taxa por venda corroendo o resultado." },
  { icon: Link2, title: "Link de loja", desc: "Uma vitrine publica para divulgar em redes sociais, WhatsApp, Google e materiais fisicos." },
  { icon: Bell, title: "Fila em tempo real", desc: "Pedidos entram no painel com status, historico e acao rapida para a equipe." },
  { icon: MapPin, title: "Entrega por regiao", desc: "Defina bairros, taxas, minimo e tempo estimado de forma simples." },
  { icon: Tag, title: "Cupons controlados", desc: "Crie descontos com validade, limite de uso e pedido minimo." },
  { icon: Users, title: "Base de clientes", desc: "Acompanhe historico, ticket medio e dados uteis para relacionamento." },
  { icon: MessageCircle, title: "Contato direto", desc: "Leve clientes para WhatsApp quando fizer sentido, sem perder o registro do pedido." },
];

export const Benefits = () => {
  return (
    <section id="beneficios" className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Controle operacional</p>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight md:text-5xl">O essencial do delivery em um sistema sob sua marca.</h2>
          <p className="text-lg leading-8 text-muted-foreground">Menos ruido, mais clareza para aceitar pedidos, organizar produtos e entender vendas.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="group border border-border/90 bg-card p-6 transition-smooth hover:border-primary/45">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center bg-secondary text-primary transition-smooth group-hover:bg-primary/10">
                <benefit.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold">{benefit.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
