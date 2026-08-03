"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Map as MapIcon, Filter, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const MapaDinamico = dynamic(() => import("@/components/ui/mapa-geo"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando satélites...</p>
    </div>
  ),
});

// Prazos alinhados com a regra de negócios do Dashboard
const FILTROS_VIGENCIA = [
  { id: "curto", label: "Curto Prazo (Até Ago/26)", color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200", borderHover: "hover:border-amber-300" },
  { id: "medio", label: "Médio Prazo (Set - Nov/26)", color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200", borderHover: "hover:border-yellow-300" },
  { id: "janela", label: "Janela Alvo (Dez/26 - Mai/27)", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", borderHover: "hover:border-blue-300" },
  { id: "longo", label: "Longo Prazo (> Mai/27)", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200", borderHover: "hover:border-emerald-300" },
  { id: "todos", label: "Mostrar Todos", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", borderHover: "hover:border-slate-300" },
];

export default function MapaPage() {
  const { profile, isInterno } = useAuth();
  const [registros, setRegistros] = useState<any[]>([]);
  
  // ✨ ESTADOS DE FILTRO
  const [filtroAtivo, setFiltroAtivo] = useState<string>(""); 
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS"); // Novo Filtro de UF

  useEffect(() => {
    async function fetchMapData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("registros").select("id, local, estado, lat, lng, valor, qualificacao, fornecedor, habitantes, vigencia");
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

  // ✨ DESCOBRE OS ESTADOS PARA O DROPDOWN (Estado Derivado)
  const estadosDisponiveis = Array.from(new Set(registros.map(r => r.estado).filter(Boolean))).sort();

  // ✨ LÓGICA DE FILTRAGEM DUPLA (UF + PRAZO)
  const registrosFiltrados = registros.filter((r) => {
    // 1. Regra de UF: Se não for TODOS, corta quem for diferente
    if (filtroEstado !== "TODOS" && r.estado !== filtroEstado) return false;

    // 2. Regra do Mapa Mudo: Se não houver prazo selecionado, esconde tudo
    if (!filtroAtivo) return false;

    // 3. Regras de Vigência (Prazo)
    if (filtroAtivo === "todos") return !r.vigencia || r.vigencia >= "2026-06";
    if (!r.vigencia || r.vigencia < "2026-06") return false;

    const mesAno = r.vigencia.substring(0, 7);

    if (filtroAtivo === "curto") return mesAno <= "2026-08";
    if (filtroAtivo === "medio") return mesAno >= "2026-09" && mesAno <= "2026-11";
    if (filtroAtivo === "janela") return mesAno >= "2026-12" && mesAno <= "2027-05";
    if (filtroAtivo === "longo") return mesAno > "2027-05";

    return false;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      
      {/* 🎛️ PAINEL FLUTUANTE DE FILTROS */}
      <div className="absolute top-6 left-6 right-6 z-10 flex flex-col xl:flex-row xl:items-start justify-between gap-4 pointer-events-none">
        
        {/* Título (Canto Esquerdo) */}
        <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-xl border border-slate-200 shadow-sm pointer-events-auto self-start shrink-0">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-blue-600" />
            Inteligência Geo
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {filtroAtivo ? `${registrosFiltrados.length} oportunidades neste recorte` : "Aguardando seleção de período..."}
          </p>
        </div>

        {/* Agrupamento dos Filtros (Canto Direito) */}
        <div className="flex flex-col lg:flex-row items-end lg:items-center gap-3 pointer-events-none">
          
          {/* ✨ NOVO: Filtro de UF */}
          <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm pointer-events-auto flex items-center gap-2 transition-all hover:border-slate-300">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer outline-none uppercase tracking-wide pr-2"
            >
              <option value="TODOS">Todos os Estados</option>
              {estadosDisponiveis.map(uf => (
                <option key={uf as string} value={uf as string}>{uf}</option>
              ))}
            </select>
          </div>

          {/* Botões de Filtro Prazos (Pills) */}
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-sm pointer-events-auto flex flex-wrap gap-2 justify-end">
            <div className="hidden lg:flex items-center gap-2 px-3 border-r border-slate-200 mr-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prazos:</span>
            </div>
            
            {FILTROS_VIGENCIA.map((filtro) => {
              const isSelected = filtroAtivo === filtro.id;
              return (
                <button
                  key={filtro.id}
                  onClick={() => setFiltroAtivo(isSelected ? "" : filtro.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    isSelected 
                      ? `${filtro.bg} ${filtro.color} ${filtro.border} ring-2 ring-offset-1 ring-blue-500/30` 
                      : `bg-white text-slate-500 border-slate-200 hover:bg-slate-50 ${filtro.borderHover}`
                  )}
                >
                  {filtro.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <div className="flex-1 w-full relative">
        <MapaDinamico registros={registrosFiltrados} />
      </div>

    </div>
  );
}