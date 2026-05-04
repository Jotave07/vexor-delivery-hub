import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Minus, Plus } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { useCart, CartOption } from "@/contexts/CartContext";
import { toast } from "sonner";
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
      const gs = (g ?? []) as OptGroup[];
      setGroups(gs);
      if (gs.length) {
        const { data: its } = await supabase.from("product_option_items").select("*").in("option_id", gs.map((x) => x.id)).eq("is_active", true).order("sort_order");
        setItems((its ?? []) as OptItem[]);
      }
      setLoading(false);
    })();
  }, [product.id]);

  const toggleItem = (group: OptGroup, itemId: string) => {
    setSelected((prev) => {
      const cur = prev[group.id] ?? [];
      if (group.max_choices === 1) return { ...prev, [group.id]: cur[0] === itemId ? [] : [itemId] };
      const has = cur.includes(itemId);
      if (has) return { ...prev, [group.id]: cur.filter((x) => x !== itemId) };
      if (cur.length >= group.max_choices) {
        toast.error(`Máximo ${group.max_choices} em ${group.name}`);
        return prev;
      }
      return { ...prev, [group.id]: [...cur, itemId] };
    });
  };

  const unitPrice = Number(product.promo_price ?? product.price);
  const optionsExtra = Object.values(selected).flat().reduce((s, id) => {
    const it = items.find((i) => i.id === id);
    return s + Number(it?.extra_price ?? 0);
  }, 0);
  const total = (unitPrice + optionsExtra) * qty;

  const handleAdd = () => {
    for (const g of groups) {
      const sel = selected[g.id] ?? [];
      if (g.is_required && sel.length < Math.max(1, g.min_choices)) {
        return toast.error(`Selecione em "${g.name}"`);
      }
      if (sel.length < g.min_choices) {
        return toast.error(`Mínimo ${g.min_choices} em "${g.name}"`);
      }
    }
    const opts: CartOption[] = [];
    for (const g of groups) {
      for (const itemId of selected[g.id] ?? []) {
        const it = items.find((i) => i.id === itemId);
        if (!it) continue;
        opts.push({ option_id: g.id, option_name: g.name, item_id: it.id, item_name: it.name, extra_price: Number(it.extra_price) });
      }
    }
    addItem({
      product_id: product.id,
      product_name: product.name,
      unit_price: unitPrice,
      quantity: qty,
      options: opts,
      notes: notes.trim() || undefined,
    });
    toast.success("Adicionado ao carrinho");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
          <div className="text-lg font-bold text-primary">
            {product.promo_price ? <>{formatBRL(product.promo_price)} <span className="text-sm line-through text-muted-foreground font-normal">{formatBRL(product.price)}</span></> : formatBRL(product.price)}
          </div>

          {loading ? (
            <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
          ) : (
            groups.map((g) => {
              const its = items.filter((i) => i.option_id === g.id);
              if (!its.length) return null;
              const sel = selected[g.id] ?? [];
              return (
                <div key={g.id} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-medium text-sm">{g.name} {g.is_required && <span className="text-destructive">*</span>}</h4>
                    <span className="text-xs text-muted-foreground">
                      {g.max_choices === 1 ? "Escolha 1" : `Até ${g.max_choices}`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {its.map((it) => {
                      const checked = sel.includes(it.id);
                      return (
                        <button
                          type="button"
                          key={it.id}
                          onClick={() => toggleItem(g, it.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                          )}
                        >
                          <span>{it.name}</span>
                          <div className="flex items-center gap-2">
                            {Number(it.extra_price) > 0 && <span className="text-xs text-muted-foreground">+ {formatBRL(it.extra_price)}</span>}
                            <div className={cn("h-4 w-4 rounded-full border-2", checked ? "border-primary bg-primary" : "border-muted-foreground")} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          <div>
            <h4 className="font-medium text-sm mb-2">Observações</h4>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: sem cebola" rows={2} maxLength={200} />
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-4 bg-card border-t border-border flex items-center gap-3">
            <div className="flex items-center gap-2 border border-border rounded-md">
              <Button size="icon" variant="ghost" onClick={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9"><Minus className="h-4 w-4" /></Button>
              <span className="w-6 text-center font-medium">{qty}</span>
              <Button size="icon" variant="ghost" onClick={() => setQty(qty + 1)} className="h-9 w-9"><Plus className="h-4 w-4" /></Button>
            </div>
            <Button variant="hero" className="flex-1" onClick={handleAdd} disabled={loading}>
              Adicionar • {formatBRL(total)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
