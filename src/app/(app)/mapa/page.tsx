"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Map as MapIcon, MapPin } from "lucide-react";

export default function MapaPage() {
  const { profile, isInterno, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registrosComCoordenadas, setRegistrosComCoordenadas] = useState<any[]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);

  // Carrega o componente do mapa manualmente, apenas no client
  const [MapaComponente, setMapaComponente] = useState<ComponentType<{ registros: any[] }> | null>(null);

  useEffect(() => {
    import("@/components/mapa-cliente").then((mod) => {
      setMapaComponente(() => mod.default);
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const carregarDadosDoMapa = async () => {
      setLoading(true);

      let query = supabase.from("registros").select("*").not("vigencia", "is", null).not("lat", "is", null);

      if (!isInterno && profile?.estado_atuacao) {
        query = query.eq("estado", profile.estado_atuacao);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar dados pro mapa:", error);
        setLoading(false);
        return;
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const marcadores: any[] = [];

      data?.forEach((reg) => {
        const dataVigencia = new Date(reg.vigencia);
        const diferencaTempo = dataVigencia.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

        let labelFiltro = "";
        if (diasRestantes >= 0 && diasRestantes <= 30) labelFiltro = "0-30";
        else if (diasRestantes >= 31 && diasRestantes <= 60) labelFiltro = "31-60";
        else if (diasRestantes >= 61 && diasRestantes <= 90) labelFiltro = "61-90";
        else if (diasRestantes >= 91 && diasRestantes <= 120) labelFiltro = "91-120";

        if (labelFiltro !== "") {
          marcadores.push({
            ...reg,
            diasRestantes,
            labelFiltro,
          });
        }
      });

      setRegistrosComCoordenadas(marcadores);
      setLoading(false);
    };

    carregarDadosDoMapa();
  }, [authLoading, isInterno, profile]);

  const marcadoresExibidos = filtroAtivo
    ? registrosComCoordenadas.filter((reg) => reg.labelFiltro === filtroAtivo)
    : registrosComCoordenadas;

  const BotoesFiltro = [
    { id: "0-30", label: "0-30 Dias", bgInfo: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100", active: "bg-red-600 text-white border-red-600", dot: "bg-red-500" },
    { id: "31-60", label: "31-60 Dias", bgInfo: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100", active: "bg-orange-500 text-white border-orange-500", dot: "bg-orange-400" },
    { id: "61-90", label: "61-90 Dias", bgInfo: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100", active: "bg-amber-500 text-white border-amber-500", dot: "bg-amber-400" },
    { id: "91-120", label: "91-120 Dias", bgInfo: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100", active: "bg-blue-600 text-white border-blue-600", dot: "bg-blue-400" },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 sm:p-8 lg:p-12 xl:pl-16 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between max-w-[1800px] mx-auto gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapIcon className="w-8 h-8 text-blue-600" /> Inteligência Geoespacial
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Mapeamento de oportunidades baseado em prazos de vencimento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Filtros:</span>
          {BotoesFiltro.map((btn) => {
            const isActive = filtroAtivo === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setFiltroAtivo(isActive ? null : btn.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2
                  ${isActive ? btn.active : btn.bgInfo}
                `}
              >
                <div className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : btn.dot}`} />
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto bg-white p-2 sm:p-3 lg:p-4 rounded-2xl border border-slate-200 shadow-sm h-[65vh] min-h-[500px] relative">
        <div className="absolute top-6 right-6 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold">
              {marcadoresExibidos.length} {marcadoresExibidos.length === 1 ? "Contrato" : "Contratos"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Visíveis no mapa</p>
        </div>

        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : !MapaComponente ? (
          <div className="w-full h-[600px] flex flex-col items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <span className="text-slate-500 font-medium text-sm">Carregando cartografia...</span>
          </div>
        ) : (
          <MapaComponente registros={marcadoresExibidos} />
        )}
      </div>
    </div>
  );
}