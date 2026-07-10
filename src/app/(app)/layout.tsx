"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    // min-h-screen e flex garantem que a Sidebar e o Main fiquem lado a lado na tela toda
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">
      <Sidebar onLogout={handleLogout} />
      
      {/* Removemos o p-8 e o max-w-4xl. O main agora apenas preenche o resto da tela flex-1 */}
      <main className="flex-1 flex flex-col h-screen">
        {children}
      </main>
    </div>
  );
}