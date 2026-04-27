import { useEffect, useState } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Zap, LogOut, Building2, BarChart3, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/admin", icon: BarChart3, label: "Visão geral", end: true },
  { to: "/admin/lojas", icon: Building2, label: "Lojas" },
  { to: "/admin/planos", icon: CreditCard, label: "Planos" },
];

const AdminLayout = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/entrar?redirect=/admin", { replace: true }); return; }
    (async () => {
      const { data } = await supabase.rpc("is_vexor_admin", { _user_id: user.id });
      setIsAdmin(!!data);
    })();
  }, [loading, user, navigate]);

  if (loading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mb-4">Você não tem permissão de administrador Vexor.</p>
          <Button asChild variant="outline"><a href="/app">Voltar</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-card border-r border-border flex flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow"><Zap className="h-4 w-4 text-primary-foreground" /></div>
            <div>
              <div className="font-bold">Vexor</div>
              <div className="text-xs text-muted-foreground">Admin</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menu.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.end}
              className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary")}>
              <m.icon className="h-4 w-4" /> {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
export default AdminLayout;
