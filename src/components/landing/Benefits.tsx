import { Ban, Link2, Bell, MapPin, Tag, Users, MessageCircle } from "lucide-react";

const benefits = [
  { icon: Ban, title: "Zero comissão", desc: "Você recebe 100% do valor de cada pedido. Sem taxas por venda." },
  { icon: Link2, title: "Link próprio", desc: "Seu cardápio em uma URL personalizada para compartilhar onde quiser." },
  { icon: Bell, title: "Pedidos no painel", desc: "Receba, aceite e organize pedidos em tempo real com notificações." },
  { icon: MapPin, title: "Entrega por bairro", desc: "Configure taxas, pedido mínimo e tempo estimado para cada região." },
  { icon: Tag, title: "Cupons e promoções", desc: "Crie descontos percentuais ou fixos, com regras e validade." },
  { icon: Users, title: "Base de clientes", desc: "Histórico, ticket médio e endereços salvos automaticamente." },
  { icon: MessageCircle, title: "WhatsApp, Insta e Google", desc: "Compartilhe seu link e venda onde seus clientes já estão." },
];

export const Benefits = () => {
  return (
    <section id="beneficios" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            Tudo que você precisa para vender <span className="text-gradient">sem intermediários</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Uma plataforma completa pensada para o negócio local crescer com autonomia.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-elegant"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-smooth group-hover:bg-gradient-primary group-hover:text-primary-foreground group-hover:shadow-glow">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
