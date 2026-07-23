"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Map as MapIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

// ✨ IMPORTAÇÃO DINÂMICA: Desliga o carregamento no Servidor para evitar o erro "window is not defined"
const MapaDinamico = dynamic(() => import("@/components/ui/mapa-geo"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando satélites...</p>
    </div>
  ),
});

export default function MapaPage() {
  const { profile, isInterno } = useAuth();
  const [registros, setRegistros] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMapData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🛡️ Regra RBAC: Parceiro vê apenas os pinos dele!
      let query = supabase.from("registros").select("id, local, estado, lat, lng, valor, qualificacao, fornecedor, habitantes");
      if (!isInterno) {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      if (data) setRegistros(data);
    }

    if (profile) {
      fetchMapData();
    }
  }, [profile, isInterno]);

  return (
    // ✨ A MÁGICA DO TAMANHO ESTÁ AQUI: h-screen tira a barra de rolagem, flex-col organiza, e o flex-1 vaza o mapa.
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      
      {/* Título Flutuante sobre o mapa (opcional, dá um ar muito moderno) */}
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-blue-600" />
          Inteligência Geo
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          {registros.filter(r => r.lat).length} oportunidades mapeadas no território
        </p>
      </div>

      {/* O container que ocupa 100% do espaço restante */}
      <div className="flex-1 w-full relative">
        <MapaDinamico registros={registros} />
      </div>

    </div>
  );
}