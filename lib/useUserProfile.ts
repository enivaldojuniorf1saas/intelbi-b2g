"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUserProfile() {
  const [profile, setProfile] = useState<{
    perfil: "interno" | "externo" | null;
    nome: string | null;
    estado_atuacao: string | null;
  }>({ perfil: null, nome: null, estado_atuacao: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("licenciados")
        .select("perfil, nome, estado_atuacao")
        .eq("id", userData.user.id)
        .single();

      if (!error && data) {
        setProfile({
          perfil: data.perfil as "interno" | "externo",
          nome: data.nome,
          estado_atuacao: data.estado_atuacao,
        });
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  return { ...profile, loading };
}