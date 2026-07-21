"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; // <- AQUI! Coloque dois blocos de pontinhos
import { Loader2 } from "lucide-react";

// ✨ 1. Ajustado o tipo para bater com o padrão que criamos no banco de dados
type UserProfile = {
  id: string;
  nome: string;
  email: string;
  perfil: "Interno" | "Comum"; 
  estado_atuacao: string;
};

// O que a nossa "bolha" vai guardar e partilhar
type AuthContextType = {
  user: any;
  profile: UserProfile | null;
  isLoading: boolean;
  isInterno: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isInterno: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadSession = async () => {
      // 1. Vê se alguém fez login no cofre
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Se não houver ninguém, expulsa para o login
        router.push("/login");
        return;
      }

      setUser(session.user);

      // ✨ 2. Alterado de "licenciados" para "usuarios"
      const { data: perfilData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (perfilData && !error) {
        setProfile(perfilData);
      } else {
        console.error("Ficha de perfil não encontrada no banco.", error);
      }

      setIsLoading(false);
    };

    loadSession();
  }, [router]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isLoading, 
      // ✨ 3. Validando com o "I" maiúsculo idêntico ao gravado no Supabase
      isInterno: profile?.perfil === "Interno" 
    }}>
      {isLoading ? (
        // Um ecrã de carregamento elegante enquanto validamos a segurança
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-blue-600">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">A validar credenciais de acesso...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usarmos nos outros ficheiros
export const useAuth = () => useContext(AuthContext);