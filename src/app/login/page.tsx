"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 👇 COLE O LINK DA SUA IMAGEM AQUI 👇
const IMAGEM_LOGIN = "https://i.postimg.cc/Y0CjxzJD/Gemini-Generated-Image-od2lrnod2lrnod2l.png"; 

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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

  return (
    <div className="min-h-screen flex w-full bg-white">

      <div className="hidden lg:block w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Degradê para escurecer a imagem nas bordas e dar destaque ao texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent z-10" />
        
        <img 
          src={IMAGEM_LOGIN} 
          alt="Painel de Inteligência" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105"
        />
        
        {/* Título Inspiracional sobre a Imagem */}
        <div className="absolute bottom-16 left-16 right-16 z-20 text-white">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">
            Transformando dados <br/> em decisões estratégicas.
          </h2>
          <p className="text-slate-300 text-lg font-medium">
            Explore oportunidades reais e escale sua operação comercial.
          </p>
        </div>
      </div>
      
      {/* LADO ESQUERDO: Formulário de Login */}
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
                placeholder="nome@empresa.com.br"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Senha de Acesso
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-base"
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
              className="w-full bg-blue-600 text-white h-12 rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-sm cursor-pointer mt-4"
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

      {/* LADO DIREITO: Imagem com Overlay Premium */}
      

    </div>
  );
}