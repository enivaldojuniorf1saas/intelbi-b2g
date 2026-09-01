"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Clock, CalendarDays, CalendarClock, Loader2, X, Filter, CalendarCheck } from "lucide-react"; 

const TERRITORIOS_ESPECIAIS: Record<string, { estado: string, mesorregioes: string[] }> = {
  "CE_SUL": {
    estado: "CE",
    mesorregioes: ["Sul Cearense", "Centro-Sul Cearense"] 
  }
};

export default function HomePage() {
  const { profile, isInterno, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [licencaAtiva, setLicencaAtiva] = useState<{nome: string, estado: string} | null>(null);

  const [registrosBrutos, setRegistrosBrutos] = useState<any[]>([]);
  
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null); 
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS"); 

  useEffect(() => {
    if (profile?.licencas && profile.licencas.length > 0 && !licencaAtiva) {
      setLicencaAtiva(profile.licencas[0]);
    }
  }, [profile]);

  useEffect(() => {
    if (authLoading || (!isInterno && !licencaAtiva)) return;

    const carregarDashboard = async () => {
      setLoading(true);

      let query = supabase.from("registros").select("*").not("vigencia", "is", null);
      
      if (!isInterno && licencaAtiva) {
        const regraTerritorio = TERRITORIOS_ESPECIAIS[licencaAtiva.estado];

        if (regraTerritorio) {
          query = query
            .eq("estado", regraTerritorio.estado)
            .in("regiao", regraTerritorio.mesorregioes);
        } else {
          query = query.eq("estado", licencaAtiva.estado);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar registros:", error);
        setLoading(false);
        return;
      }

      setRegistrosBrutos(data || []);
      setLoading(false);
    };

    carregarDashboard();
  }, [authLoading, isInterno, licencaAtiva]); 

  // =====================================================================
  // 🧠 CÉREBRO DA PÁGINA 
  // =====================================================================

  const estadosDisponiveis = Array.from(new Set(registrosBrutos.map(r => r.estado).filter(Boolean))).sort();

  const registrosPorUF = registrosBrutos.filter(reg => 
    filtroEstado === "TODOS" || reg.estado === filtroEstado
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // ✨ NOVO: Variável contadora para o card de Agendados
  let cAgendado = 0, c30 = 0, c60 = 0, c90 = 0, c120 = 0;
  const tabelaProcessada: any[] = [];

  registrosPorUF.forEach((reg) => {
    const dataVigencia = new Date(reg.vigencia);
    const diferencaTempo = dataVigencia.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

    let estiloPill = "";
    let label = "";

    // ✨ NOVO: Regra de Agendados tem prioridade máxima
    if (reg.qualificacao === "Agendada" || reg.qualificacao === "AGENDADA") {
      cAgendado++;
      estiloPill = "bg-blue-100 text-blue-700";
      label = "AGENDADOS";
    } 
    // Se não estiver agendado, cai nas regras de prazo normais
    else if (diasRestantes >= 0 && diasRestantes <= 30) {
      c30++;
      estiloPill = "bg-red-100/50 text-red-700"; 
      label = "0 - 30 DIAS";
    } else if (diasRestantes >= 31 && diasRestantes <= 60) {
      c60++;
      estiloPill = "bg-orange-100 text-orange-700"; 
      label = "31 - 60 DIAS";
    } else if (diasRestantes >= 61 && diasRestantes <= 90) {
      c90++;
      estiloPill = "bg-yellow-100 text-yellow-800"; 
      label = "61 - 90 DIAS";
    } else if (diasRestantes >= 91 && diasRestantes <= 120) {
      c120++;
      estiloPill = "bg-green-600 text-white"; 
      label = "91 - 120 DIAS";
    }

    if (label !== "") {
      tabelaProcessada.push({
        ...reg,
        diasRestantes,
        badgeClass: `${estiloPill} px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase inline-flex items-center justify-center whitespace-nowrap`,
        label
      });
    }
  });

  // Ordena a tabela para mostrar quem vence mais cedo no topo
  tabelaProcessada.sort((a, b) => {
    // Se um for agendado e o outro não, não interfere no prazo (mostra agendado primeiro)
    if (a.label === "AGENDADOS" && b.label !== "AGENDADOS") return -1;
    if (a.label !== "AGENDADOS" && b.label === "AGENDADOS") return 1;
    return a.diasRestantes - b.diasRestantes;
  });

  const registrosParaExibir = filtroAtivo 
    ? tabelaProcessada.filter(reg => reg.label === filtroAtivo)
    : tabelaProcessada;

  const getCardProps = (label: string, bgClass: string, ringClass: string) => {
    const isSelected = filtroAtivo === label;
    const isDimmed = filtroAtivo !== null && !isSelected;
    
    return {
      onClick: () => setFiltroAtivo(isSelected ? null : label),
      className: `${bgClass} rounded-xl p-4 shadow-sm flex flex-col justify-between h-[80px] text-white cursor-pointer transition-all duration-300 ease-out select-none
        ${isSelected ? `scale-105 shadow-md ring-2 ring-offset-2 ring-offset-[#f8fafc] ${ringClass}` : ''} 
        ${isDimmed ? 'opacity-40 grayscale-[30%]' : 'hover:scale-[102%] hover:shadow-md'}`,
    };
  };

  // =====================================================================
  // 🎨 RENDERIZAÇÃO DA INTERFACE
  // =====================================================================

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 sm:p-8 lg:p-12 xl:pl-16 space-y-6 lg:space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 max-w-[1800px] mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard de Vencimentos</h1>
          
          {isInterno ? (
            <p className="text-sm sm:text-base text-slate-500 mt-1">Visão geral dos indicadores de contratos.</p>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm sm:text-base text-slate-500">Visão geral da sua carteira ativa:</p>
              {profile?.licencas && profile.licencas.length > 1 ? (
                <select
                  value={licencaAtiva?.estado || ""}
                  onChange={(e) => {
                    const novaLicenca = profile.licencas.find((l: any) => l.estado === e.target.value);
                    if (novaLicenca) setLicencaAtiva(novaLicenca);
                  }}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 py-0 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                >
                  {profile.licencas.map((lic: any, idx: number) => (
                    <option key={idx} value={lic.estado}>
                      🏢 {lic.nome} ({lic.estado})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm sm:text-base font-semibold text-blue-700 px-1">
                  🏢 {licencaAtiva?.nome} ({licencaAtiva?.estado})
                </span>
              )}
            </div>
          )}
        </div>

        {isInterno && (
          <div className="flex items-center gap-2 bg-green-300 px-3 py-2.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto hover:border-slate-300 transition-colors mt-2 sm:mt-0">
            <Filter className="h-4 w-4 text-slate-400" />
            <select 
              value={filtroEstado} 
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none w-full sm:w-auto uppercase tracking-wide"
            >
              <option value="TODOS">TODOS OS ESTADOS</option>
              {estadosDisponiveis.map(uf => (
                <option key={uf as string} value={uf as string}>{uf}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ✨ ATUALIZADO: Grid agora tem 5 colunas no desktop para acomodar o card azul */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-[1800px] mx-auto">

        {/* Card 0-30 (Vermelho) */}
        <div {...getCardProps("0 - 30 DIAS", "bg-red-600", "ring-red-600")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">0 - 30 Dias</span>
            <div className="p-1.5 bg-white/20 rounded-md">
              <AlertCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold leading-none tracking-tight">
            {c30}
          </div>
        </div>

        {/* Card 31-60 (Laranja) */}
        <div {...getCardProps("31 - 60 DIAS", "bg-orange-500", "ring-orange-500")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">31 - 60 Dias</span>
            <div className="p-1.5 bg-white/20 rounded-md">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold leading-none tracking-tight">
            {c60}
          </div>
        </div>

        {/* Card 61-90 (Amarelo) */}
        <div {...getCardProps("61 - 90 DIAS", "bg-[#F59E0B]", "ring-[#F59E0B]")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">61 - 90 Dias</span>
            <div className="p-1.5 bg-white/20 rounded-md">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold leading-none tracking-tight">
            {c90}
          </div>
        </div>

        {/* Card 91-120 (Verde) */}
        <div {...getCardProps("91 - 120 DIAS", "bg-green-600", "ring-green-600")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">91 - 120 Dias</span>
            <div className="p-1.5 bg-white/20 rounded-md">
              <CalendarClock className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold leading-none tracking-tight">
            {c120}
          </div>
        </div>

        {/* ✨ NOVO: Card Agendados (Azul) */}
        <div {...getCardProps("AGENDADOS", "bg-blue-600", "ring-blue-600")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Agendados</span>
            <div className="p-1.5 bg-white/20 rounded-md">
              <CalendarCheck className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold leading-none tracking-tight">
            {cAgendado}
          </div>
        </div>

      </div>

      <div className="w-full max-w-[1800px] mx-auto space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {filtroAtivo 
              ? `Mostrando contratos: ${filtroAtivo}` 
              : filtroEstado !== "TODOS" 
                ? `Todos os Contratos na Janela (${filtroEstado})` 
                : "Todos os Contratos na Janela"}
          </h2>
          
          {filtroAtivo && (
            <button 
              onClick={() => setFiltroAtivo(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-200/50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              LIMPAR FILTRO
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="h-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-6">Município / Estado</TableHead>
                  <TableHead className="h-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-6">Objeto do Contrato</TableHead>
                  <TableHead className="h-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-6">Vigência</TableHead>
                  <TableHead className="h-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-6 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosParaExibir.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-14 text-sm text-slate-500">
                      Nenhum contrato encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosParaExibir.map((reg, index) => (
                    <TableRow 
                      key={reg.id} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100/50 border-0 transition-colors`}
                    >
                      <TableCell className="px-6 py-5">
                        <div className="font-bold text-[13px] text-slate-900">{reg.local}</div>
                        <div className="text-[11px] font-medium text-slate-500 mt-0.5">{reg.estado}</div>
                      </TableCell>
                      
                      <TableCell className="px-6 py-5">
                        <div className="max-w-[400px] truncate text-[13px] font-medium text-slate-600" title={reg.objeto}>
                          {reg.objeto || "Não especificado"}
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-6 py-5">
                        <div className="text-[13px] font-semibold text-slate-700">
                          {new Date(reg.vigencia).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {reg.label === "AGENDADOS" ? "Data marcada" : `Faltam ${reg.diasRestantes} dias`}
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-6 py-5 text-center">
                        <span className={reg.badgeClass}>
                          {reg.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}