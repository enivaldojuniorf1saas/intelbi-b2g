"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 1. IMPORTAÇÃO DO LOCAL CORRETO
import { Loader2, Search, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  // 2. DECLARAÇÃO DA CONSTANTE NO TOPO DO COMPONENTE (Certo!)
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

     console.log("DEBUG →", { email, password }); // linha temporária

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log("Login realizado com sucesso!", data);
      
      // 3. APENAS O DIRECIONAMENTO FICA AQUI DENTRO
      router.push("/home");
    } catch (error: any) {
      console.error("Erro no login:", error.message);
      setErrorMessage("Credenciais inválidas. Verifique seu e-mail e senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Inteligencia de Mercado
          </h1>
          <p className="text-slate-500 text-sm">
            Insira suas credenciais para acessar a plataforma
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Login de Acesso
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-blue-50 border-blue-100 focus-visible:ring-blue-500"
              placeholder="nome@empresa.com.br"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Senha de Acesso
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-blue-50 border-blue-100 focus-visible:ring-blue-500"
              placeholder="••••••••••••"
              disabled={isLoading}
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {errorMessage}
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white h-12 rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            disabled={isLoading}
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
  );
}