import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CartDrawer = ({ open, onOpenChange, slug }: { open: boolean; onOpenChange: (o: boolean) => void; slug: string }) => {
  const { items, itemSubtotal, subtotal, updateQty, removeItem, count } = useCart();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-5 border-b border-border">
          <SheetTitle>Seu carrinho</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mb-3" />
            <p>Carrinho vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((it) => (
                <div key={it.uid} className="border-b border-border pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{it.product_name}</div>
                      {it.options.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-1">
                          {it.options.map((o, i) => (
                            <li key={i}>+ {o.item_name}{Number(o.extra_price) > 0 && ` (${formatBRL(o.extra_price)})`}</li>
                          ))}
                        </ul>
                      )}
                      {it.notes && <div className="text-xs italic text-muted-foreground mt-1">"{it.notes}"</div>}
                    </div>
                    <button onClick={() => removeItem(it.uid)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 border border-border rounded-md">
                      <button onClick={() => updateQty(it.uid, it.quantity - 1)} className="px-2 py-1"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center text-sm">{it.quantity}</span>
                      <button onClick={() => updateQty(it.uid, it.quantity + 1)} className="px-2 py-1"><Plus className="h-3 w-3" /></button>
                    </div>
                    <span className="font-semibold text-sm">{formatBRL(itemSubtotal(it))}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({count} {count === 1 ? "item" : "itens"})</span>
                <span className="font-bold">{formatBRL(subtotal)}</span>
              </div>
              <Button variant="hero" className="w-full" onClick={() => { onOpenChange(false); navigate(`/loja/${slug}/checkout`); }}>
                Continuar para checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
