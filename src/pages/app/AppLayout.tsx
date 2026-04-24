import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, ShoppingBag, UtensilsCrossed, Tags, Users, Ticket, Truck, BarChart3, Settings, CreditCard, UserCog, LogOut, Zap, Menu, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/pedidos", icon: ShoppingBag, label: "Pedidos" },
  { to: "/app/cardapio", icon: UtensilsCrossed, label: "Cardápio" },
  { to: "/app/categorias", icon: Tags, label: "Categorias" },
  { to: "/app/clientes", icon: Users, label: "Clientes" },
  { to: "/app/cupons", icon: Ticket, label: "Cupons" },
  { to: "/app/entregas", icon: Truck, label: "Entregas" },
  { to: "/app/relatorios", icon: BarChart3, label: "Relatórios" },
  { to: "/app/configuracoes", icon: Settings, label: "Configurações" },
  { to: "/app/assinatura", icon: CreditCard, label: "Assinatura" },
  { to: "/app/usuarios", icon: UserCog, label: "Usuários" },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const { profile, loading, signOut } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!profile?.store_id) {
      navigate("/onboarding", { replace: true });
      return;
    }
    supabase.from("stores").select("*").eq("id", profile.store_id).maybeSingle().then(({ data }) => setStore(data));
  }, [loading, profile, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (loading || !store) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* mobile toggle */}
      <button onClick={() => setOpen(!open)} className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-md bg-card border border-border">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside className={cn(
        "fixed md:sticky inset-y-0 left-0 top-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform md:translate-x-0 h-screen",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">Vexor</span>
          </div>
          <div className="text-sm font-medium truncate">{store.name}</div>
          <a href={`/loja/${store.slug}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
            ver loja <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 md:ml-0">
        <div className="p-4 md:p-8 pt-16 md:pt-8">
          <Outlet context={{ store }} />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
