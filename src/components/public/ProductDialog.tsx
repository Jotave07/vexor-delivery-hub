import { useEffect, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import { useCart, type CartOption } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

type OptGroup = { id: string; name: string; is_required: boolean; min_choices: number; max_choices: number };
type OptItem = { id: string; option_id: string; name: string; extra_price: number; is_active: boolean };

export const ProductDialog = ({ product, onClose }: { product: any; onClose: () => void }) => {
  const { addItem } = useCart();
  const [groups, setGroups] = useState<OptGroup[]>([]);
  const [items, setItems] = useState<OptItem[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from("product_options").select("*").eq("product_id", product.id).order("sort_order");
      const groupsData = (g ?? []) as OptGroup[];
      setGroups(groupsData);
      if (groupsData.length) {
        const { data: optionItems } = await supabase
          .from("product_option_items")
          .select("*")
          .in("option_id", groupsData.map((item) => item.id))
          .eq("is_active", true)
          .order("sort_order");
        setItems((optionItems ?? []) as OptItem[]);
      }
      setLoading(false);
    })();
  }, [product.id]);

  const toggleItem = (group: OptGroup, itemId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.max_choices === 1) return { ...prev, [group.id]: current[0] === itemId ? [] : [itemId] };
      const has = current.includes(itemId);
      if (has) return { ...prev, [group.id]: current.filter((entry) => entry !== itemId) };
      if (current.length >= group.max_choices) {
        toast.error(`Maximo ${group.max_choices} em ${group.name}`);
        return prev;
      }
      return { ...prev, [group.id]: [...current, itemId] };
    });
  };

  const unitPrice = Number(product.promo_price ?? product.price);
  const optionsExtra = Object.values(selected).flat().reduce((sum, id) => {
    const item = items.find((entry) => entry.id === id);
    return sum + Number(item?.extra_price ?? 0);
  }, 0);
  const total = (unitPrice + optionsExtra) * qty;

  const handleAdd = () => {
    for (const group of groups) {
      const selection = selected[group.id] ?? [];
      if (group.is_required && selection.length < Math.max(1, group.min_choices)) {
        return toast.error(`Selecione em "${group.name}"`);
      }
      if (selection.length < group.min_choices) {
        return toast.error(`Minimo ${group.min_choices} em "${group.name}"`);
      }
    }

    const options: CartOption[] = [];
    for (const group of groups) {
      for (const itemId of selected[group.id] ?? []) {
        const item = items.find((entry) => entry.id === itemId);
        if (!item) continue;
        options.push({
          option_id: group.id,
          option_name: group.name,
          item_id: item.id,
          item_name: item.name,
          extra_price: Number(item.extra_price),
        });
      }
    }

    addItem({
      product_id: product.id,
      product_name: product.name,
      unit_price: unitPrice,
      quantity: qty,
      options,
      notes: notes.trim() || undefined,
    });
    toast.success("Adicionado ao carrinho");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-2xl overflow-y-auto p-0">
        <div className="grid min-h-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[240px] border-b border-border bg-black/40 lg:min-h-full lg:border-b-0 lg:border-r">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover public-product-image" />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Preview do produto
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/88">
              <span className="border border-white/12 bg-black/36 px-2 py-1">Detalhes</span>
              <span className="border border-white/12 bg-black/36 px-2 py-1">{product.is_available ? "Disponivel" : "Esgotado"}</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="space-y-4 p-5">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold">{product.name}</DialogTitle>
              </DialogHeader>

              {product.description && <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>}

              <div className="border border-border bg-black/24 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preco base</div>
                <div className="mt-2 text-xl font-semibold text-foreground">
                  {product.promo_price ? (
                    <>
                      <span className="text-primary">{formatBRL(product.promo_price)}</span>{" "}
                      <span className="text-sm font-normal text-muted-foreground line-through">{formatBRL(product.price)}</span>
                    </>
                  ) : (
                    <span className="text-primary">{formatBRL(product.price)}</span>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => {
                    const groupItems = items.filter((item) => item.option_id === group.id);
                    if (!groupItems.length) return null;
                    const groupSelection = selected[group.id] ?? [];

                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                            {group.name} {group.is_required && <span className="text-primary">*</span>}
                          </h4>
                          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {group.max_choices === 1 ? "Escolha 1" : `Ate ${group.max_choices}`}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {groupItems.map((item) => {
                            const checked = groupSelection.includes(item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => toggleItem(group, item.id)}
                                className={cn("public-choice w-full justify-between text-left", checked && "ring-1 ring-accent/30")}
                                data-active={checked}
                              >
                                <div>
                                  <div className="font-medium text-foreground">{item.name}</div>
                                  {Number(item.extra_price) > 0 && (
                                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                      Extra {formatBRL(item.extra_price)}
                                    </div>
                                  )}
                                </div>
                                <div className={cn("h-4 w-4 border", checked ? "border-accent bg-accent" : "border-muted-foreground")} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-foreground">Observacoes</h4>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: sem cebola" rows={3} maxLength={200} />
              </div>
            </div>

            <div className="public-bottom-bar sticky bottom-0 mt-auto border-t border-border p-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border bg-black/24">
                  <Button size="icon" variant="ghost" onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{qty}</span>
                  <Button size="icon" variant="ghost" onClick={() => setQty(qty + 1)} className="h-11 w-11">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="hero" className="flex-1" onClick={handleAdd} disabled={loading}>
                  Adicionar • {formatBRL(total)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
