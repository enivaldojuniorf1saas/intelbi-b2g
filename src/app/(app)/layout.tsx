"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; 
import { Sidebar } from "../../../components/sidebar";
import { AuthProvider } from "@/contexts/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex bg-slate-50 overflow-hidden">
        <Sidebar onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}