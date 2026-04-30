import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { slugify } from "@/lib/format";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  slug: z.string().trim().min(3, "Slug muito curto").max(50).regex(/^[a-z0-9-]+$/, "Use apenas letras, numeros e hifen"),
  description: z.string().max(500).optional(),
  whatsapp: z.string().trim().min(10, "WhatsApp invalido").max(20),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(2).optional(),
});

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: "", slug: "", description: "", whatsapp: "", city: "", state: "" });
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const publicBaseUrl = `${window.location.host}/loja/`;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCheckingAccess(false);
      return;
    }

    const ensureAccessTarget = async () => {
      const [{ data: isAdmin }, { data: ownedStore, error: ownedStoreError }] = await Promise.all([
        supabase.rpc("is_vexor_admin", { _user_id: user.id }),
        supabase.from("stores").select("id").eq("owner_user_id", user.id).maybeSingle(),
      ]);

      if (ownedStoreError) {
        toast.error("Nao foi possivel validar a conta.");
        setCheckingAccess(false);
        return;
      }

      if (ownedStore?.id) {
        if (profile?.store_id !== ownedStore.id) {
          await supabase.from("profiles").update({ store_id: ownedStore.id }).eq("user_id", user.id);
          await refreshProfile();
        }

        navigate(Boolean(isAdmin) ? "/admin" : "/app/assinatura", { replace: true });
        return;
      }

      if (isAdmin) {
        navigate("/admin", { replace: true });
        return;
      }

      setCheckingAccess(false);
    };

    void ensureAccessTarget();
  }, [authLoading, navigate, profile?.store_id, refreshProfile, user]);

  useEffect(() => {
    if (form.name && !form.slug) setForm((f) => ({ ...f, slug: slugify(form.name) }));
  }, [form.name, form.slug]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    const { data: ownedStore, error: ownedStoreError } = await supabase
      .from("stores")
      .select("id, slug")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (ownedStoreError) {
      setLoading(false);
      return toast.error("Nao foi possivel validar a conta antes de criar a loja.");
    }

    if (ownedStore) {
      await refreshProfile();
      setLoading(false);
      toast.error("Esta conta ja possui uma loja criada. Regularize a assinatura para continuar.");
      navigate("/app/assinatura?state=pending_payment", { replace: true });
      return;
    }

    const { data: existing } = await supabase.from("stores").select("id").eq("slug", parsed.data.slug).maybeSingle();
    if (existing) {
      setLoading(false);
      return toast.error("Este endereco ja esta em uso. Escolha outro.");
    }

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .insert({
        owner_user_id: user.id,
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

    const setupResults = await Promise.allSettled([
      supabase.from("store_settings").insert({ store_id: store.id }),
      supabase.from("profiles").update({ store_id: store.id, full_name: profile?.full_name ?? null }).eq("user_id", user.id),
      supabase.from("user_roles").insert({ user_id: user.id, role: "store_owner", store_id: store.id }),
    ]);

    const setupError = setupResults.find((result) => (
      result.status === "rejected" ||
      Boolean(result.status === "fulfilled" && result.value?.error)
    ));

    if (setupError) {
      setLoading(false);
      return toast.error("A loja foi criada, mas a configuracao inicial falhou. Revise a assinatura antes de continuar.");
    }

    setLoading(false);
    await refreshProfile();
    toast.success("Loja criada com sucesso. Agora escolha um plano para ativar o acesso.");
    navigate("/app/assinatura?state=no_plan", { replace: true });
  };

  if (authLoading || checkingAccess) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="auth-shell py-8">
      <BrandMark className="mb-8" />
      <Card className="w-full max-w-xl p-8 shadow-card">
        <h1 className="mb-2 text-2xl font-bold">Vamos criar sua loja</h1>
        <p className="mb-6 text-sm text-muted-foreground">Configure os dados iniciais da operacao. O plano e o pagamento serao escolhidos depois.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do estabelecimento *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Burger Vexor" required />
          </div>
          <div>
            <Label htmlFor="slug">Endereco da loja *</Label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{publicBaseUrl}</span>
              <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="burger-vexor" required />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descricao curta</Label>
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
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Criar loja
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;
