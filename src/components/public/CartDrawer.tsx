import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";

export const CartDrawer = ({ open, onOpenChange, slug }: { open: boolean; onOpenChange: (open: boolean) => void; slug: string }) => {
  const { items, itemSubtotal, subtotal, updateQty, removeItem, count } = useCart();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-5">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-display text-2xl font-bold">Seu carrinho</SheetTitle>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{count} itens</div>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <ShoppingBag className="mb-3 h-10 w-10 text-primary" />
            <p>Carrinho vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {items.map((item, index) => (
                <div key={item.uid} className="public-store-panel p-4" style={{ "--product-accent": index % 2 === 0 ? "hsl(var(--brand-magenta))" : "hsl(var(--brand-cyan))" } as CSSProperties}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{item.product_name}</div>
                      {item.options.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {item.options.map((option, optionIndex) => (
                            <li key={optionIndex}>
                              + {option.item_name}
                              {Number(option.extra_price) > 0 && ` (${formatBRL(option.extra_price)})`}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.notes && <div className="mt-2 text-xs italic text-muted-foreground">"{item.notes}"</div>}
                    </div>
                    <button type="button" onClick={() => removeItem(item.uid)} className="border border-border p-2 text-destructive transition-smooth hover:border-destructive/50 hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center border border-border bg-black/24">
                      <button type="button" onClick={() => updateQty(item.uid, item.quantity - 1)} className="px-3 py-2 transition-smooth hover:bg-secondary">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.uid, item.quantity + 1)} className="px-3 py-2 transition-smooth hover:bg-secondary">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-semibold text-primary">{formatBRL(itemSubtotal(item))}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="public-bottom-bar space-y-3 border-t border-border p-5">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({count} {count === 1 ? "item" : "itens"})</span>
                <span className="font-bold">{formatBRL(subtotal)}</span>
              </div>
              <Button
                variant="hero"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/loja/${slug}/checkout`);
                }}
              >
                Continuar para checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
