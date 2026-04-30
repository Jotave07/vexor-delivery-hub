import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Validando link...");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = useMemo(() => {
    const candidate = searchParams.get("next") || searchParams.get("redirect_to");
    if (!candidate || !candidate.startsWith("/")) return null;
    return candidate;
  }, [searchParams]);

  useEffect(() => {
    const confirm = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage("Nao foi possivel concluir o login.");
          toast.error(error.message);
          return;
        }

        toast.success("Acesso confirmado com sucesso.");
        navigate(next ?? "/app", { replace: true });
        return;
      }

      if (!tokenHash || !type) {
        setMessage("Link incompleto ou expirado.");
        toast.error("Este link nao e valido.");
        return;
      }

      const verifyType = type as "signup" | "invite" | "magiclink" | "recovery" | "email" | "email_change";
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: verifyType,
      });

      if (error) {
        setMessage("Nao foi possivel validar o link.");
        toast.error(error.message);
        return;
      }

      if (type === "recovery") {
        toast.success("Link validado. Defina sua nova senha.");
        navigate(next ?? "/redefinir-senha", { replace: true });
        return;
      }

      toast.success("E-mail confirmado com sucesso.");
      navigate(next ?? "/onboarding", { replace: true });
    };

    void confirm();
  }, [code, navigate, next, tokenHash, type]);

  return (
    <div className="auth-shell">
      <BrandMark to="/" className="mb-8" />
      <Card className="auth-card flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Validando acesso</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </Card>
    </div>
  );
};

export default AuthConfirm;
