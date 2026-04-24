import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Onboarding from "./pages/auth/Onboarding";
import AppLayout from "./pages/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Categories from "./pages/app/Categories";
import Products from "./pages/app/Products";
import Coupons from "./pages/app/Coupons";
import Zones from "./pages/app/Zones";
import Settings from "./pages/app/Settings";
import { StubPage } from "./components/app/StubPage";
import PublicStore from "./pages/public/PublicStore";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/entrar" element={<Login />} />
              <Route path="/cadastrar" element={<Signup />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

              <Route path="/loja/:slug" element={<PublicStore />} />

              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="pedidos" element={<StubPage title="Pedidos" description="Gestão de pedidos em tempo real." />} />
                <Route path="cardapio" element={<Products />} />
                <Route path="categorias" element={<Categories />} />
                <Route path="clientes" element={<StubPage title="Clientes" description="Sua base de clientes." />} />
                <Route path="cupons" element={<Coupons />} />
                <Route path="entregas" element={<Zones />} />
                <Route path="relatorios" element={<StubPage title="Relatórios" description="Análises do seu delivery." />} />
                <Route path="configuracoes" element={<Settings />} />
                <Route path="assinatura" element={<StubPage title="Assinatura" description="Seu plano Vexor." />} />
                <Route path="usuarios" element={<StubPage title="Usuários" description="Equipe da loja." />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
