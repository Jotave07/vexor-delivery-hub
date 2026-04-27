import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

const Subscription = () => {
  const { store } = useOutletContext<{ store: any }>();
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("subscriptions").select("*, plans(*)").eq("store_id", store.id).maybeSingle(),
    ]);
    setPlans(p ?? []);
    setSub(s);
    setLoading(false);
  };

  useEffect(() => { if (store?.id) load(); /* eslint-disable-next-line */ }, [store?.id]);

  const choose = async (plan: any) => {
    setChanging(plan.id);
    if (sub) {
      const { error } = await supabase.from("subscriptions").update({
        plan_id: plan.id, status: sub.status === "trial" ? "trial" : "ativa",
      }).eq("id", sub.id);
      if (error) { setChanging(null); return toast.error(error.message); }
    } else {
      const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 14);
      const { error } = await supabase.from("subscriptions").insert({
        store_id: store.id, plan_id: plan.id, status: "trial", trial_ends_at: trialEnd.toISOString(),
      });
      if (error) { setChanging(null); return toast.error(error.message); }
    }
    await supabase.from("stores").update({ plan_id: plan.id }).eq("id", store.id);
    setChanging(null);
    toast.success("Plano atualizado");
    load();
  };

  if (loading) return <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin inline text-primary" /></div>;

  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Assinatura</h1>
        <p className="text-muted-foreground">Seu plano Vexor.</p>
      </div>

      {sub && (
        <Card className="p-5 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm opacity-90">Plano atual</div>
              <div className="text-2xl font-bold">{sub.plans?.name}</div>
              <Badge variant="secondary" className="mt-1 capitalize">{sub.status}</Badge>
            </div>
            {sub.status === "trial" && (
              <div className="text-right">
                <div className="text-xs opacity-90">Período de teste</div>
                <div className="text-xl font-bold">{trialDaysLeft} dia(s) restantes</div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = sub?.plan_id === p.id;
          const isPro = p.slug === "profissional";
          return (
            <Card key={p.id} className={cn("p-6 relative", isPro && "border-primary shadow-glow", isCurrent && "ring-2 ring-primary")}>
              {isPro && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2"><Sparkles className="h-3 w-3" /> Mais escolhido</Badge>}
              <h3 className="font-bold text-lg">{p.name}</h3>
              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              <div className="mt-4 mb-4">
                <span className="text-3xl font-bold">{formatBRL(p.price_monthly)}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {p.max_products ? `Até ${p.max_products} produtos` : "Produtos ilimitados"}</li>
                {p.allows_coupons && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Cupons de desconto</li>}
                {p.allows_advanced_reports && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Relatórios avançados</li>}
                {p.allows_custom_branding && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Marca personalizada</li>}
                {p.allows_custom_domain && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Domínio próprio</li>}
                {Array.isArray(p.features) && p.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {f}</li>
                ))}
              </ul>
              <Button variant={isPro ? "hero" : "outline"} className="w-full" disabled={isCurrent || changing === p.id} onClick={() => choose(p)}>
                {changing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? "Plano atual" : sub ? "Trocar para este" : "Iniciar trial 14 dias"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 text-xs text-muted-foreground">
        💳 A cobrança automática será habilitada em breve. Por enquanto, troca de plano é manual e cortesia.
      </Card>
    </div>
  );
};
export default Subscription;
