"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/home");
    } catch (error: any) {
      console.error("Erro no login:", error.message);
      setErrorMessage("Credenciais inválidas. Verifique seu e-mail e senha.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMessage("Por favor, preencha o seu e-mail acima antes de clicar em 'Esqueci minha senha'.");
      return;
    }

    setIsResetting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // O redirectTo é para onde o Supabase manda o usuário após clicar no link do e-mail
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      setSuccessMessage("Link de recuperação enviado! Verifique sua caixa de entrada (e o Spam).");
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error.message);
      setErrorMessage("Não foi possível enviar o link. Verifique se o e-mail está correto.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">

      <div className="hidden lg:block w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent z-10" />

        <Image
          src="/login-bg.webp"
          alt="Painel de Inteligência"
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-90 transition-transform duration-1000 hover:scale-105"
        />

        <div className="absolute bottom-16 left-16 right-16 z-20 text-white">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">
            Transformando dados <br/> em decisões estratégicas.
          </h2>
          <p className="text-slate-300 text-lg font-medium">
            Explore oportunidades reais e escale sua operação comercial.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-left mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Inteligência de Mercado
            </h1>
            <p className="text-slate-500">
              Insira suas credenciais para acessar a plataforma B2G.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Login de Acesso
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-base"
                placeholder="Digite o seu E-mail"
                disabled={isLoading || isResetting}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Senha de Acesso
                </Label>
                
                
              </div>

              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-base"
                placeholder="••••••••••••"
                disabled={isLoading || isResetting}
              />
            </div>
            <div> 
              {/* ✨ BOTÃO ESQUECI A SENHA AQUI */}
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isLoading || isResetting}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                >
                  {isResetting ? "Enviando..." : "Esqueci minha senha"}
                </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">
                {successMessage}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 text-white h-12 rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-sm cursor-pointer mt-4"
              disabled={isLoading || isResetting}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </form>
        </div>
      </div>

    </div>
  );
}