"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Map as MapIcon, Filter, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

// ✨ COORDENADAS PARA O FLYTO (Foco Automático)
const CAPITAIS_COORD: Record<string, { lat: number; lng: number }> = {
  AC: { lat: -9.974, lng: -67.807 }, AL: { lat: -9.665, lng: -35.735 },
  AP: { lat: 0.034, lng: -51.066 }, AM: { lat: -3.101, lng: -60.025 },
  BA: { lat: -12.971, lng: -38.510 }, CE: { lat: -3.717, lng: -38.543 },
  DF: { lat: -15.779, lng: -47.929 }, ES: { lat: -20.315, lng: -40.312 },
  GO: { lat: -16.679, lng: -49.253 }, MA: { lat: -2.538, lng: -44.282 },
  MT: { lat: -15.596, lng: -56.096 }, MS: { lat: -20.442, lng: -54.646 },
  MG: { lat: -19.920, lng: -43.937 }, PA: { lat: -1.455, lng: -48.502 },
  PB: { lat: -7.115, lng: -34.863 }, PR: { lat: -25.428, lng: -49.273 },
  PE: { lat: -8.057, lng: -34.882 }, PI: { lat: -5.089, lng: -42.801 },
  RJ: { lat: -22.906, lng: -43.172 }, RN: { lat: -5.794, lng: -35.211 },
  RS: { lat: -30.027, lng: -51.228 }, RO: { lat: -8.761, lng: -63.903 },
  RR: { lat: 2.819, lng: -60.673 }, SC: { lat: -27.596, lng: -48.549 },
  SP: { lat: -23.548, lng: -46.636 }, SE: { lat: -10.947, lng: -37.073 },
  TO: { lat: -10.212, lng: -48.360 }
};

// Sub-regiões (Como a Aurotech atua apenas no CE_SUL)
const TERRITORIOS_ESPECIAIS: Record<string, { estado: string, mesorregioes: string[] }> = {
  "CE_SUL": {
    estado: "CE",
    mesorregioes: ["Sul Cearense", "Centro-Sul Cearense"] 
  }
};

const MapaDinamico = dynamic(() => import("@/components/ui/mapa-geo"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando satélites e renderizando dados...</p>
    </div>
  ),
});

const FILTROS_VIGENCIA = [
  { id: "curto", label: "Curto Prazo (Até Ago/26)", color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200", borderHover: "hover:border-amber-300" },
  { id: "medio", label: "Médio Prazo (Set - Nov/26)", color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200", borderHover: "hover:border-yellow-300" },
  { id: "janela", label: "Janela Alvo (Dez/26 - Mai/27)", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", borderHover: "hover:border-blue-300" },
  { id: "longo", label: "Longo Prazo (> Mai/27)", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200", borderHover: "hover:border-emerald-300" },
  { id: "todos", label: "Mostrar Todos", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", borderHover: "hover:border-slate-300" },
];

export default function MapaPage() {
  const { profile, isInterno, isLoading: authLoading } = useAuth();
  const [registros, setRegistros] = useState<any[]>([]);
  
  // ✨ MUDANÇA: O filtro não começa marcado. O usuário tem que clicar ativamente.
  const [filtroAtivo, setFiltroAtivo] = useState<string>(""); 
  
  // O Estado inicial é Brasil todo, ou o estado da primeira licença do usuário.
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [licencaAtiva, setLicencaAtiva] = useState<{nome: string, estado: string} | null>(null);

  // Efeito 1: Seta a licença inicial se for um usuário externo (Ex: Thiago Gadelha)
  useEffect(() => {
    if (profile) {
      if (!isInterno && profile.licencas && profile.licencas.length > 0) {
        setLicencaAtiva(profile.licencas[0]);
        // O Filtro Estado (Visual) reflete a licença. Usa o mapa de territórios para não dar pau no visual.
        const ufLimpa = TERRITORIOS_ESPECIAIS[profile.licencas[0].estado]?.estado || profile.licencas[0].estado;
        setFiltroEstado(ufLimpa.toUpperCase());
      } else if (isInterno) {
        setFiltroEstado("TODOS");
      }
    }
  }, [profile, isInterno]);

  // Efeito 2: Busca os dados no Supabase toda vez que muda a licença ou perfil
  useEffect(() => {
    async function fetchMapData() {
      // Monta a Query principal (Só baixa o que tem coordenada para não pesar)
      let query = supabase.from("registros").select("id, local, estado, regiao, lat, lng, valor, qualificacao, fornecedor, habitantes, vigencia, objeto").not("lat", "is", null);
      
      // ✨ REGRA: Licenciado baixa TODOS os dados das regiões atreladas à licença dele
      if (!isInterno && licencaAtiva) {
        const regraTerritorio = TERRITORIOS_ESPECIAIS[licencaAtiva.estado];
        if (regraTerritorio) {
          query = query.eq("estado", regraTerritorio.estado).in("regiao", regraTerritorio.mesorregioes);
        } else {
          query = query.eq("estado", licencaAtiva.estado);
        }
      }

      const { data } = await query;
      if (data) setRegistros(data);
    }

    if (!authLoading && (isInterno || licencaAtiva)) {
      fetchMapData();
    }
  }, [authLoading, profile, isInterno, licencaAtiva]);

  // Efeito 3: Se o Interno mudar o dropdown do Brasil, nós mudamos o foco
  const estadosDisponiveis = Array.from(new Set(registros.map(r => r.estado).filter(Boolean))).sort();

  // ✨ FILTRO DE VIGÊNCIA E ESTADO (Isso define as bolinhas no mapa)
  const registrosFiltrados = registros.filter((r) => {
    // 1. Filtrar pelo Estado da Tela (Se for interno e selecionou "SP" no menu dropdown)
    if (isInterno && filtroEstado !== "TODOS" && r.estado !== filtroEstado) return false;
    
    // 2. Se nenhum filtro de tempo foi clicado, NÃO exibe nada no mapa
    if (!filtroAtivo) return false;

    // 3. Regras de Vigência
    if (filtroAtivo === "todos") return !r.vigencia || r.vigencia >= "2026-06";
    
    // Pula qualquer registro sem data para os filtros de mês
    if (!r.vigencia || r.vigencia < "2026-06") return false;
    
    const mesAno = r.vigencia.substring(0, 7);
    if (filtroAtivo === "curto") return mesAno <= "2026-08";
    if (filtroAtivo === "medio") return mesAno >= "2026-09" && mesAno <= "2026-11";
    if (filtroAtivo === "janela") return mesAno >= "2026-12" && mesAno <= "2027-05";
    if (filtroAtivo === "longo") return mesAno > "2027-05";

    return false;
  });

  // ✨ FOCO AUTOMÁTICO DO MAPA
  const mapCenter = filtroEstado !== "TODOS" && CAPITAIS_COORD[filtroEstado]
    ? [CAPITAIS_COORD[filtroEstado].lat, CAPITAIS_COORD[filtroEstado].lng]
    : [-15.7801, -47.9292]; 
  
  const mapZoom = filtroEstado !== "TODOS" ? 6 : 4;

  if (authLoading) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      
      <div className="absolute top-6 left-6 right-6 z-10 flex flex-col xl:flex-row xl:items-start justify-between gap-4 pointer-events-none">
        
        <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-xl border border-slate-200 shadow-sm pointer-events-auto self-start shrink-0">
          
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-blue-600" />
            Inteligência Geo 
          </h1>

          {/* ✨ Subtítulo adaptado para o Dropdown Inteligente de Externos */}
          {!isInterno && profile?.licencas && profile.licencas.length > 1 ? (
             <div className="mt-1">
               <select
                  value={licencaAtiva?.estado || ""}
                  onChange={(e) => {
                    const novaLicenca = profile.licencas.find((l: any) => l.estado === e.target.value);
                    if (novaLicenca) {
                      setLicencaAtiva(novaLicenca);
                      const ufLimpa = TERRITORIOS_ESPECIAIS[novaLicenca.estado]?.estado || novaLicenca.estado;
                      setFiltroEstado(ufLimpa.toUpperCase());
                    }
                  }}
                  className="h-6 rounded-md border border-slate-200 bg-white px-2 py-0 text-[11px] font-bold text-blue-700 focus:outline-none cursor-pointer shadow-sm w-full max-w-[200px]"
                >
                  {profile.licencas.map((lic: any, idx: number) => (
                    <option key={idx} value={lic.estado}>🏢 {lic.nome} ({lic.estado})</option>
                  ))}
                </select>
             </div>
          ) : !isInterno ? (
             <p className="text-[11px] font-bold text-blue-700 mt-1 uppercase">🏢 {licencaAtiva?.nome} ({licencaAtiva?.estado})</p>
          ) : null}

          <p className="text-xs font-semibold text-slate-500 mt-1.5">
            {filtroAtivo ? `${registrosFiltrados.length} oportunidades neste recorte` : "Aguardando seleção de período..."}
          </p>

        </div>

        <div className="flex flex-col lg:flex-row items-end lg:items-center gap-3 pointer-events-none">
          
          {isInterno && (
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
          )}

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

      <div className="flex-1 w-full relative z-0">
        <MapaDinamico 
          registros={registrosFiltrados} 
          center={mapCenter as [number, number]} 
          zoom={mapZoom} 
        />
      </div>

    </div>
  );
}