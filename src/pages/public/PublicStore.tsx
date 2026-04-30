import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Clock, ShoppingBag, Search, ScanSearch, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { ProductDialog } from "@/components/public/ProductDialog";
import { CartDrawer } from "@/components/public/CartDrawer";
import { useCart } from "@/contexts/CartContext";

const PRODUCT_TONES = [
  "hsl(var(--brand-magenta))",
  "hsl(var(--brand-cyan))",
  "hsl(var(--brand-orange))",
  "hsl(var(--brand-terracotta))",
];

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

  useEffect(() => {
    if (slug) setStoreSlug(slug);
  }, [slug, setStoreSlug]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!s) {
        setLoading(false);
        return;
      }
      setStore(s);
      const [settRes, catRes, prodRes] = await Promise.all([
        supabase.from("store_settings").select("*").eq("store_id", s.id).maybeSingle(),
        supabase.from("categories").select("*").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
        supabase.from("products").select("*").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
      ]);
      setSettings(settRes.data);
      setCategories(catRes.data ?? []);
      setProducts(prodRes.data ?? []);
      setLoading(false);
    })();
  }, [slug]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [products, search]);

  const sections = useMemo(
    () => categories
      .map((category) => ({
        category,
        products: filtered.filter((product) => product.category_id === category.id),
      }))
      .filter((section) => section.products.length > 0),
    [categories, filtered],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loja nao encontrada</div>;
  }

  const isOpen = settings?.is_open;
  const acceptOrders = isOpen || settings?.accept_orders_when_closed;
  const publicStoreName = store.public_name || store.name;

  return (
    <div className="public-store-shell pb-36">
      <section className="public-store-hero">
        <div className="public-store-cover h-44 md:h-64">
          {store.cover_url && <img src={store.cover_url} alt="" className="h-full w-full object-cover object-center opacity-92" />}
        </div>

        <div className="container mx-auto px-4 pb-8 relative -mt-12 md:-mt-16">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="public-store-panel p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="vexor-sheen relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-black/60 md:h-24 md:w-24">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="h-full w-full object-cover public-product-image" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      VXT
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={isOpen ? "default" : "secondary"}>{isOpen ? "Aberto agora" : "Fechado"}</Badge>
                    <Badge variant="outline">Cardapio publico</Badge>
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight md:text-4xl">{publicStoreName}</h1>
                  {store.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                      {store.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoTile
                  icon={<MapPin className="h-4 w-4 text-[hsl(var(--brand-cyan))]" />}
                  label="Local"
                  value={store.city ? `${store.city}${store.state ? `/${store.state}` : ""}` : "Atendimento local"}
                />
                <InfoTile
                  icon={<Clock className="h-4 w-4 text-[hsl(var(--brand-orange))]" />}
                  label="Tempo medio"
                  value={settings?.avg_prep_time_minutes ? `~${settings.avg_prep_time_minutes} min` : "Sob consulta"}
                />
                <InfoTile
                  icon={<Sparkles className="h-4 w-4 text-[hsl(var(--brand-magenta))]" />}
                  label="Pedido minimo"
                  value={settings?.min_order_value > 0 ? formatBRL(settings.min_order_value) : "Sem minimo"}
                />
              </div>
            </div>

            <div className="public-store-panel p-5 md:p-6">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <ScanSearch className="h-4 w-4 text-[hsl(var(--brand-cyan))]" />
                Explorar catalogo
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar produtos, combos e detalhes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {sections.slice(0, 5).map((section) => (
                  <a key={section.category.id} href={`#category-${section.category.id}`} className="public-chip">
                    {section.category.name}
                    <span className="text-[10px] text-foreground/72">{section.products.length}</span>
                  </a>
                ))}
              </div>

              {!acceptOrders && (
                <div className="mt-4 border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">
                  A loja esta fechada e nao esta aceitando pedidos no momento.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pt-8">
        <div className="space-y-10">
          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              {products.length === 0 ? "Cardapio em construcao." : "Nenhum produto encontrado."}
            </Card>
          ) : (
            sections.map((section) => (
              <section key={section.category.id} id={`category-${section.category.id}`} className="space-y-4 scroll-mt-24">
                <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Categoria
                    </div>
                    <h2 className="mt-1 font-display text-xl font-bold md:text-2xl">{section.category.name}</h2>
                  </div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {section.products.length} itens
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {section.products.map((product, index) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => acceptOrders && product.is_available && setSelectedProduct(product)}
                      disabled={!acceptOrders || !product.is_available}
                      className="group text-left disabled:opacity-45"
                    >
                      <Card
                        className="public-product-card h-full p-0"
                        style={{ "--product-accent": PRODUCT_TONES[index % PRODUCT_TONES.length] } as CSSProperties}
                      >
                        <div className="vexor-sheen relative aspect-[0.92] overflow-hidden border-b border-border bg-black/30">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="public-product-image h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {section.category.name}
                            </div>
                          )}

                          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/88">
                            <span className="border border-white/12 bg-black/38 px-2 py-1">{product.promo_price ? "Promo" : "Menu"}</span>
                            <span className="border border-white/12 bg-black/38 px-2 py-1">{String(index + 1).padStart(2, "0")}</span>
                          </div>

                          {!product.is_available && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/58 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                              Esgotado
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-5 md:text-base">{product.name}</h3>
                            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">#{String(index + 1).padStart(2, "0")}</span>
                          </div>

                          {product.description && (
                            <p className="line-clamp-3 text-xs leading-5 text-muted-foreground md:text-sm">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-auto pt-4">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Valor</div>
                            <div className="mt-1 text-sm font-semibold text-foreground md:text-base">
                              {product.promo_price ? (
                                <>
                                  <span className="text-primary">{formatBRL(product.promo_price)}</span>{" "}
                                  <span className="text-xs font-normal text-muted-foreground line-through">{formatBRL(product.price)}</span>
                                </>
                              ) : (
                                <span className="text-primary">{formatBRL(product.price)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border public-bottom-bar p-4">
          <div className="container mx-auto max-w-2xl">
            <Button variant="hero" size="lg" className="w-full justify-between" onClick={() => setCartOpen(true)}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ver carrinho ({count})
              </span>
              <span>{formatBRL(subtotal)}</span>
            </Button>
          </div>
        </div>
      )}

      {selectedProduct && <ProductDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {slug && <CartDrawer open={cartOpen} onOpenChange={setCartOpen} slug={slug} />}
    </div>
  );
};

const InfoTile = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="border border-border bg-black/28 p-3">
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="text-sm font-medium text-foreground">{value}</div>
  </div>
);

export default PublicStore;
