// src/app/home/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">IntelBI - Home</h1>
        <p className="text-slate-500">Tela inicial em desenvolvimento (Ambiente Autenticado).</p>
        
        {/* Adicionei um botão de Logout para facilitar seus testes de ir e voltar */}
        <Button 
          onClick={handleLogout}
          className="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
        >
          Sair do Sistema
        </Button>
      </div>
    </div>
  );
}