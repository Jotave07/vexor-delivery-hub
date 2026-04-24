import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { slugify } from "@/lib/format";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  slug: z.string().trim().min(3, "Slug muito curto").max(50).regex(/^[a-z0-9-]+$/, "Use apenas letras, números e hífen"),
  description: z.string().max(500).optional(),
  whatsapp: z.string().trim().min(10, "WhatsApp inválido").max(20),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(2).optional(),
});

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: "", slug: "", description: "", whatsapp: "", city: "", state: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && profile?.store_id) navigate("/app", { replace: true });
  }, [authLoading, profile, navigate]);

  useEffect(() => {
    if (form.name && !form.slug) setForm((f) => ({ ...f, slug: slugify(form.name) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    // check slug uniqueness
    const { data: existing } = await supabase.from("stores").select("id").eq("slug", parsed.data.slug).maybeSingle();
    if (existing) {
      setLoading(false);
      return toast.error("Este endereço (slug) já está em uso. Escolha outro.");
    }

    // get inicial plan
    const { data: plan } = await supabase.from("plans").select("id").eq("slug", "inicial").maybeSingle();

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .insert({
        owner_user_id: user.id,
        plan_id: plan?.id ?? null,
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description || null,
        whatsapp: parsed.data.whatsapp,
        phone: parsed.data.whatsapp,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
      })
      .select()
      .single();

    if (storeErr || !store) {
      setLoading(false);
      return toast.error("Erro ao criar loja: " + (storeErr?.message ?? "desconhecido"));
    }

    await Promise.all([
      supabase.from("store_settings").insert({ store_id: store.id }),
      supabase.from("profiles").update({ store_id: store.id, full_name: profile?.full_name ?? null }).eq("user_id", user.id),
      supabase.from("user_roles").insert({ user_id: user.id, role: "store_owner", store_id: store.id }),
      plan?.id ? supabase.from("subscriptions").insert({ store_id: store.id, plan_id: plan.id, status: "trial", trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString() }) : Promise.resolve(),
    ]);

    setLoading(false);
    await refreshProfile();
    toast.success("Loja criada! Bem-vindo.");
    navigate("/app", { replace: true });
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">Vexor<span className="text-primary"> Delivery</span></span>
      </div>
      <Card className="w-full max-w-xl p-8">
        <h1 className="text-2xl font-bold mb-2">Vamos criar sua loja</h1>
        <p className="text-sm text-muted-foreground mb-6">Preencha os dados básicos. Você pode personalizar tudo depois.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do estabelecimento *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Burger Vexor" required />
          </div>
          <div>
            <Label htmlFor="slug">Endereço da loja *</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">vexor.app/loja/</span>
              <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="burger-vexor" required />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição curta</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="state">UF</Label>
              <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
            </div>
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Criar minha loja
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;
