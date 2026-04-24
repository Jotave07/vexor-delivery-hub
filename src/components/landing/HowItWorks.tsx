const steps = [
  { n: "01", t: "Cadastre seu estabelecimento", d: "Crie sua conta e configure os dados da loja em poucos minutos." },
  { n: "02", t: "Monte seu cardápio", d: "Adicione categorias, produtos, fotos, adicionais e preços promocionais." },
  { n: "03", t: "Compartilhe seu link", d: "Divulgue no WhatsApp, Instagram, Google e onde seus clientes estão." },
  { n: "04", t: "Receba pedidos", d: "Acompanhe cada pedido no painel com status em tempo real." },
  { n: "05", t: "Entregue e acompanhe vendas", d: "Gere relatórios, fidelize clientes e aumente seu faturamento." },
];

export const HowItWorks = () => {
  return (
    <section id="como-funciona" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            Simples como deveria ser
          </h2>
          <p className="text-lg text-muted-foreground">Do cadastro ao primeiro pedido em menos de uma tarde.</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="absolute left-8 top-0 bottom-0 hidden w-px bg-gradient-to-b from-primary via-primary/30 to-transparent md:block" />
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.n} className="relative flex gap-6 rounded-2xl border border-border bg-card p-6 transition-smooth hover:border-primary/50 md:pl-20">
                <div className="absolute left-4 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow md:left-4">
                  {s.n}
                </div>
                <div className="ml-14 md:ml-0">
                  <h3 className="mb-1 text-lg font-semibold">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
