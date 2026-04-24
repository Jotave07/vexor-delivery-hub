import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Upload, Save } from "lucide-react";

const Settings = () => {
  const { store } = useOutletContext<{ store: any }>();
  const [s, setS] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [storeRes, settRes] = await Promise.all([
      supabase.from("stores").select("*").eq("id", store.id).single(),
      supabase.from("store_settings").select("*").eq("store_id", store.id).single(),
    ]);
    setS(storeRes.data); setSettings(settRes.data); setLoading(false);
  };
  useEffect(() => { if (store?.id) load(); /* eslint-disable-next-line */ }, [store?.id]);

  const upload = async (file: File, field: "logo_url" | "cover_url") => {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    const ext = file.name.split(".").pop();
    const path = `${store.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
    setS({ ...s, [field]: data.publicUrl });
    toast.success("Imagem enviada");
  };

  const save = async () => {
    setSaving(true);
    const [r1, r2] = await Promise.all([
      supabase.from("stores").update({
        name: s.name, description: s.description, logo_url: s.logo_url, cover_url: s.cover_url,
        phone: s.phone, whatsapp: s.whatsapp, email: s.email, document: s.document,
        address: s.address, city: s.city, state: s.state, zip_code: s.zip_code,
        primary_color: s.primary_color,
      }).eq("id", store.id),
      supabase.from("store_settings").update({
        is_open: settings.is_open, accept_orders_when_closed: settings.accept_orders_when_closed,
        min_order_value: Number(settings.min_order_value) || 0, avg_prep_time_minutes: Number(settings.avg_prep_time_minutes) || 30,
        allow_delivery: settings.allow_delivery, allow_pickup: settings.allow_pickup,
        accept_cash: settings.accept_cash, accept_pix: settings.accept_pix, accept_card_on_delivery: settings.accept_card_on_delivery,
        pix_key: settings.pix_key, pix_key_type: settings.pix_key_type,
      }).eq("store_id", store.id),
    ]);
    setSaving(false);
    if (r1.error || r2.error) return toast.error("Erro ao salvar");
    toast.success("Configurações salvas!");
  };

  if (loading || !s || !settings) return <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl md:text-3xl font-bold">Configurações</h1><p className="text-muted-foreground">Personalize sua loja.</p></div>
        <Button variant="hero" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</Button>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Identidade visual</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Logo</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-16 h-16 rounded bg-muted overflow-hidden flex items-center justify-center">
                {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              </div>
              <label className="cursor-pointer"><input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo_url")} /><Button type="button" variant="outline" asChild><span>Escolher</span></Button></label>
            </div>
          </div>
          <div>
            <Label>Capa</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-24 h-16 rounded bg-muted overflow-hidden flex items-center justify-center">
                {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              </div>
              <label className="cursor-pointer"><input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_url")} /><Button type="button" variant="outline" asChild><span>Escolher</span></Button></label>
            </div>
          </div>
        </div>
        <div><Label>Cor principal</Label><Input type="color" value={s.primary_color ?? "#7C3AED"} onChange={(e) => setS({ ...s, primary_color: e.target.value })} className="h-10 w-24" /></div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Dados da loja</h2>
        <div><Label>Nome</Label><Input value={s.name ?? ""} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
        <div><Label>Descrição</Label><Textarea value={s.description ?? ""} onChange={(e) => setS({ ...s, description: e.target.value })} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>WhatsApp</Label><Input value={s.whatsapp ?? ""} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={s.phone ?? ""} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
        </div>
        <div><Label>E-mail</Label><Input type="email" value={s.email ?? ""} onChange={(e) => setS({ ...s, email: e.target.value })} /></div>
        <div><Label>Documento (CNPJ/CPF)</Label><Input value={s.document ?? ""} onChange={(e) => setS({ ...s, document: e.target.value })} /></div>
        <div><Label>Endereço</Label><Input value={s.address ?? ""} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Label>Cidade</Label><Input value={s.city ?? ""} onChange={(e) => setS({ ...s, city: e.target.value })} /></div>
          <div><Label>UF</Label><Input value={s.state ?? ""} onChange={(e) => setS({ ...s, state: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></div>
        </div>
        <div><Label>CEP</Label><Input value={s.zip_code ?? ""} onChange={(e) => setS({ ...s, zip_code: e.target.value })} /></div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Operação</h2>
        <div className="flex items-center justify-between">
          <Label>Loja aberta agora</Label>
          <Switch checked={settings.is_open} onCheckedChange={(v) => setSettings({ ...settings, is_open: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Aceitar pedidos fora do horário</Label>
          <Switch checked={settings.accept_orders_when_closed} onCheckedChange={(v) => setSettings({ ...settings, accept_orders_when_closed: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Pedido mínimo (R$)</Label><Input type="number" step="0.01" value={settings.min_order_value} onChange={(e) => setSettings({ ...settings, min_order_value: e.target.value })} /></div>
          <div><Label>Tempo médio (min)</Label><Input type="number" value={settings.avg_prep_time_minutes} onChange={(e) => setSettings({ ...settings, avg_prep_time_minutes: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between"><Label>Permitir entrega</Label><Switch checked={settings.allow_delivery} onCheckedChange={(v) => setSettings({ ...settings, allow_delivery: v })} /></div>
        <div className="flex items-center justify-between"><Label>Permitir retirada</Label><Switch checked={settings.allow_pickup} onCheckedChange={(v) => setSettings({ ...settings, allow_pickup: v })} /></div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Pagamento</h2>
        <div className="flex items-center justify-between"><Label>Aceitar dinheiro</Label><Switch checked={settings.accept_cash} onCheckedChange={(v) => setSettings({ ...settings, accept_cash: v })} /></div>
        <div className="flex items-center justify-between"><Label>Aceitar Pix</Label><Switch checked={settings.accept_pix} onCheckedChange={(v) => setSettings({ ...settings, accept_pix: v })} /></div>
        <div className="flex items-center justify-between"><Label>Cartão na entrega</Label><Switch checked={settings.accept_card_on_delivery} onCheckedChange={(v) => setSettings({ ...settings, accept_card_on_delivery: v })} /></div>
        {settings.accept_pix && (
          <>
            <div><Label>Tipo de chave Pix</Label><Input value={settings.pix_key_type ?? ""} onChange={(e) => setSettings({ ...settings, pix_key_type: e.target.value })} placeholder="CPF, CNPJ, e-mail, telefone, aleatória" /></div>
            <div><Label>Chave Pix</Label><Input value={settings.pix_key ?? ""} onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })} /></div>
          </>
        )}
      </Card>
    </div>
  );
};
export default Settings;
