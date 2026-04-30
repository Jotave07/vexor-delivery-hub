import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

type PlanFormState = {
  name: string;
  slug: string;
  description: string;
  price_monthly: string;
  max_products: string;
  is_active: boolean;
  allows_coupons: boolean;
  allows_advanced_reports: boolean;
  allows_custom_branding: boolean;
  allows_custom_domain: boolean;
  features_text: string;
};

const EMPTY_FORM: PlanFormState = {
  name: "",
  slug: "",
  description: "",
  price_monthly: "0",
  max_products: "",
  is_active: true,
  allows_coupons: false,
  allows_advanced_reports: false,
  allows_custom_branding: false,
  allows_custom_domain: false,
  features_text: "",
};

const AdminPlans = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openEdit = (plan: any) => {
    setEditing(plan);
    setForm({
      name: plan.name ?? "",
      slug: plan.slug ?? "",
      description: plan.description ?? "",
      price_monthly: String(plan.price_monthly ?? 0),
      max_products: plan.max_products != null ? String(plan.max_products) : "",
      is_active: Boolean(plan.is_active),
      allows_coupons: Boolean(plan.allows_coupons),
      allows_advanced_reports: Boolean(plan.allows_advanced_reports),
      allows_custom_branding: Boolean(plan.allows_custom_branding),
      allows_custom_domain: Boolean(plan.allows_custom_domain),
      features_text: Array.isArray(plan.features) ? plan.features.join("\n") : "",
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nome e slug sao obrigatorios.");
      return;
    }

    setSaving(true);

    const features = form.features_text
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      price_monthly: Number(form.price_monthly) || 0,
      max_products: form.max_products ? Number(form.max_products) : null,
      is_active: form.is_active,
      allows_coupons: form.allows_coupons,
      allows_advanced_reports: form.allows_advanced_reports,
      allows_custom_branding: form.allows_custom_branding,
      allows_custom_domain: form.allows_custom_domain,
      features,
    };

    const { error } = editing
      ? await supabase.from("plans").update(payload).eq("id", editing.id)
      : await supabase.from("plans").insert({ ...payload, sort_order: plans.length });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Plano salvo.");
    setOpen(false);
    void load();
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="inline h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Planos</h1>
          <p className="text-muted-foreground">Catalogo de planos Vexor.</p>
        </div>
        <Button variant="hero" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Novo plano
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{plan.name}</h3>
                <div className="text-xs text-muted-foreground">/{plan.slug}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(plan)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-2 text-2xl font-bold">
              {formatBRL(plan.price_monthly)}
              <span className="text-xs font-normal text-muted-foreground">/mes</span>
            </div>

            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>{plan.max_products ? `${plan.max_products} produtos` : "Produtos ilimitados"}</li>
              {Array.isArray(plan.features) && plan.features.slice(0, 4).map((feature: string) => (
                <li key={feature}>- {feature}</li>
              ))}
              {plan.allows_coupons && <li>- Cupons</li>}
              {plan.allows_advanced_reports && <li>- Relatorios avancados</li>}
              {plan.allows_custom_branding && <li>- Marca personalizada</li>}
              {plan.allows_custom_domain && <li>- Dominio proprio</li>}
            </ul>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} plano</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>

            <div>
              <Label>Descricao</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Preco/mes</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price_monthly}
                  onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
                />
              </div>
              <div>
                <Label>Max. produtos</Label>
                <Input
                  type="number"
                  value={form.max_products}
                  onChange={(e) => setForm({ ...form, max_products: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div>
              <Label>Recursos do plano</Label>
              <Textarea
                rows={6}
                value={form.features_text}
                onChange={(e) => setForm({ ...form, features_text: e.target.value })}
                placeholder={"Um recurso por linha\nEx: Cupons de desconto\nEx: Relatorios completos"}
              />
            </div>

            {[
              ["allows_coupons", "Cupons"],
              ["allows_advanced_reports", "Relatorios avancados"],
              ["allows_custom_branding", "Marca personalizada"],
              ["allows_custom_domain", "Dominio proprio"],
              ["is_active", "Ativo"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch
                  checked={Boolean(form[key as keyof PlanFormState])}
                  onCheckedChange={(value) => setForm({ ...form, [key]: value })}
                />
              </div>
            ))}

            <Button variant="hero" className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlans;
