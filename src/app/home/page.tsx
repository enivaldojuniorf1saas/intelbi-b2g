// src/app/home/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";

export default function HomePage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onLogout={handleLogout} />

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">
            IntelBI - Home
          </h1>
          <p className="text-slate-500 mt-2">
            Tela inicial em desenvolvimento (Ambiente Autenticado).
          </p>
        </div>
      </main>
    </div>
  );
}