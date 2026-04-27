import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Clock, ShoppingBag, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { ProductDialog } from "@/components/public/ProductDialog";
import { CartDrawer } from "@/components/public/CartDrawer";
import { useCart } from "@/contexts/CartContext";

const PublicStore = () => {
  const { slug } = useParams();
  const { setStoreSlug, count, subtotal } = useCart();
  const [store, setStore] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { if (slug) setStoreSlug(slug); }, [slug, setStoreSlug]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [products, search]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loja não encontrada</div>;

  const isOpen = settings?.is_open;
  const acceptOrders = isOpen || settings?.accept_orders_when_closed;

  return (
    <div className="min-h-screen bg-background pb-28">
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
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant={isOpen ? "default" : "secondary"}>{isOpen ? "Aberto agora" : "Fechado"}</Badge>
              {store.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {store.city}{store.state && `/${store.state}`}</span>}
              {settings?.avg_prep_time_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{settings.avg_prep_time_minutes} min</span>}
              {settings?.min_order_value > 0 && <span>Pedido mín: {formatBRL(settings.min_order_value)}</span>}
            </div>
          </div>
        </Card>

        {!acceptOrders && (
          <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm text-center">
            A loja está fechada e não está aceitando pedidos no momento.
          </div>
        )}

        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar no cardápio..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="mt-6 space-y-8">
          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              {products.length === 0 ? "Cardápio em construção." : "Nenhum produto encontrado."}
            </Card>
          ) : categories.map((c) => {
            const prods = filtered.filter((p) => p.category_id === c.id);
            if (!prods.length) return null;
            return (
              <section key={c.id}>
                <h2 className="text-lg font-bold mb-3">{c.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prods.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => acceptOrders && p.is_available && setSelectedProduct(p)}
                      disabled={!acceptOrders || !p.is_available}
                      className="text-left disabled:opacity-50"
                    >
                      <Card className="p-4 flex gap-3 hover:border-primary/50 transition-colors h-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{p.name}</div>
                          {p.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</div>}
                          <div className="mt-2 text-sm font-semibold text-primary">
                            {p.promo_price ? <>{formatBRL(p.promo_price)} <span className="line-through text-xs text-muted-foreground font-normal">{formatBRL(p.price)}</span></> : formatBRL(p.price)}
                          </div>
                          {!p.is_available && <Badge variant="destructive" className="text-xs mt-2">Esgotado</Badge>}
                        </div>
                        {p.image_url && <div className="w-20 h-20 rounded bg-muted overflow-hidden shrink-0"><img src={p.image_url} alt="" className="w-full h-full object-cover" /></div>}
                      </Card>
                    </button>
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

      {count > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md">
          <Button variant="hero" size="lg" className="w-full justify-between shadow-glow" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Ver carrinho ({count})</span>
            <span>{formatBRL(subtotal)}</span>
          </Button>
        </div>
      )}

      {selectedProduct && <ProductDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {slug && <CartDrawer open={cartOpen} onOpenChange={setCartOpen} slug={slug} />}
    </div>
  );
};
export default PublicStore;
