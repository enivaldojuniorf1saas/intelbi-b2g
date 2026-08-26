"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import { Loader2 } from "lucide-react";

// ✨ 1. Atualizado para o nosso NOVO formato SaaS Modular
type UserProfile = {
  id: string;
  nome: string;
  email: string;
  perfil: string; 
  licencas: { nome: string; estado: string }[]; 
  modulos_ativos: string[]; // ✨ NOVA COLUNA INJETADA AQUI
};

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // ✨ 2. Buscar na tabela "usuarios" (que é a dona do ID de acesso)
      const { data: perfilData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (perfilData && !error) {
        // ✨ 3. VACINA ANTI-ERRO: Limpa espaços, joga pra minúsculo e anexa o array de licenças e Módulos Ativos
        const perfilBlindado = {
          ...perfilData,
          perfil: perfilData.perfil ? perfilData.perfil.toLowerCase().trim() : "comum",
          licencas: perfilData.licencas || [],
          modulos_ativos: perfilData.modulos_ativos || [] // ✨ GARANTIA DE DADO LIMPO PRO SAAS
        };
        setProfile(perfilBlindado);
      } else {
        console.error("Ficha de perfil não encontrada no banco.", error);
      }

      setIsLoading(false);
    };

    loadSession();
  }, [router]);

  // ✨ 4. Validação blindada da nova variável
  const isInterno = profile?.perfil === "interno";

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isLoading, 
      isInterno 
    }}>
      {isLoading ? (
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

export const useAuth = () => useContext(AuthContext);