import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/redefinir-senha",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Verifique seu e-mail");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">Vexor<span className="text-primary"> Delivery</span></span>
      </Link>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mb-6">Enviaremos um link para redefinir sua senha.</p>
        {sent ? (
          <p className="text-sm text-success">Pronto! Confira sua caixa de entrada.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar link
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/entrar" className="text-primary hover:underline">Voltar para login</Link>
        </p>
      </Card>
    </div>
  );
};

export default ForgotPassword;
