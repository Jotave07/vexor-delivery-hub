import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";

const PublicStore = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setStore(s);
      const [settRes, catRes, prodRes] = await Promise.all([
        supabase.from("store_settings").select("*").eq("store_id", s.id).maybeSingle(),
        supabase.from("categories").select("*").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
        supabase.from("products").select("*").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
      ]);
      setSettings(settRes.data); setCategories(catRes.data ?? []); setProducts(prodRes.data ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loja não encontrada</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-40 md:h-56 bg-muted relative">
        {store.cover_url && <img src={store.cover_url} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="container mx-auto px-4 -mt-10 relative">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
            {store.logo_url && <img src={store.logo_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{store.name}</h1>
            {store.description && <p className="text-sm text-muted-foreground line-clamp-2">{store.description}</p>}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <Badge variant={settings?.is_open ? "default" : "secondary"}>{settings?.is_open ? "Aberto" : "Fechado"}</Badge>
              {store.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {store.city}{store.state && `/${store.state}`}</span>}
              {settings?.avg_prep_time_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{settings.avg_prep_time_minutes} min</span>}
            </div>
          </div>
        </Card>

        <div className="mt-6 space-y-8">
          {categories.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">Cardápio em construção.</Card>
          ) : categories.map((c) => {
            const prods = products.filter((p) => p.category_id === c.id);
            if (!prods.length) return null;
            return (
              <section key={c.id}>
                <h2 className="text-lg font-bold mb-3">{c.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prods.map((p) => (
                    <Card key={p.id} className="p-4 flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                        <div className="mt-1 text-sm font-semibold text-primary">
                          {p.promo_price ? <>{formatBRL(p.promo_price)} <span className="line-through text-xs text-muted-foreground">{formatBRL(p.price)}</span></> : formatBRL(p.price)}
                        </div>
                      </div>
                      {p.image_url && <div className="w-20 h-20 rounded bg-muted overflow-hidden shrink-0"><img src={p.image_url} alt="" className="w-full h-full object-cover" /></div>}
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-muted-foreground">
          Powered by <Link to="/" className="text-primary hover:underline">Vexor Delivery</Link>
        </div>
      </div>
    </div>
  );
};
export default PublicStore;
