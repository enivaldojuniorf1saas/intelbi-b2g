"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, TrendingUp, Target, Award, Filter, Inbox, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";

// Paleta de cores moderna para os 11 módulos (Produtos)
const CORES_MODULOS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", 
  "#06b6d4", "#f97316", "#6366f1", "#14b8a6", "#d946ef", "#84cc16"
];

const formatadorMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);

const formatadorEixoY = (val: number) => {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
  return `R$ ${val}`;
};

const formatadorMoedaCompacta = (valor: number) => {
  if (valor >= 1_000_000_000) return `R$ ${(valor / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Bi`;
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mi`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatadorMoeda(valor);
};

// Tooltip estilizado e responsivo
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  
  // Ordena os itens do maior para o menor valor no tooltip para facilitar a leitura
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-4 min-w-[200px] z-50">
      <p className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">{label}</p>
      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {sortedPayload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]" title={entry.name}>
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-black text-slate-900">
              {formatadorMoeda(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-slate-400 gap-2 py-10">
      <Inbox className="h-8 w-8 opacity-50" />
      <p className="text-sm font-medium">{mensagem}</p>
    </div>
  );
}

export default function CrescimentoPage() {
  const { isInterno, profile, authLoading } = useAuth();
  const [faturamentos, setFaturamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros Globais
  const anoAtual = new Date().getFullYear().toString();
  const [filtroAno, setFiltroAno] = useState<string>(anoAtual);

  const fetchFaturamentos = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("faturamentos").select("*");
      if (!isInterno && profile?.estado_atuacao) {
        query = query.eq("estado", profile.estado_atuacao.trim().toUpperCase());
      }
      const { data, error } = await query;
      if (error) throw error;
      setFaturamentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar dados de crescimento:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchFaturamentos();
  }, [authLoading, isInterno, profile]);

  // ==========================================
  // 🧠 PROCESSAMENTO DOS DADOS USANDO USEMEMO (PERFORMANCE)
  // ==========================================

  const { dadosFiltrados, faturamentoTotal, topLicenciado, topModulo } = useMemo(() => {
    const filtrados = faturamentos.filter(fat => {
      if (filtroAno !== "TODOS" && !fat.mes_referencia?.startsWith(filtroAno)) return false;
      return true;
    });

    const total = filtrados.reduce((acc, fat) => acc + Number(fat.valor || 0), 0);

    // Top Licenciado
    const licMap: Record<string, number> = {};
    const modMap: Record<string, number> = {};
    
    filtrados.forEach(fat => {
      const lic = fat.licenciado || "NÃO INFORMADO";
      const mod = fat.modulo || "OUTRO";
      const val = Number(fat.valor || 0);
      
      licMap[lic] = (licMap[lic] || 0) + val;
      modMap[mod] = (modMap[mod] || 0) + val;
    });

    const topLic = Object.entries(licMap).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    const topMod = Object.entries(modMap).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

    return { 
      dadosFiltrados: filtrados, 
      faturamentoTotal: total,
      topLicenciado: { name: topLic[0], valor: topLic[1] },
      topModulo: { name: topMod[0], valor: topMod[1] }
    };
  }, [faturamentos, filtroAno]);

  // 1️⃣ GRÁFICO 1: Crescimento Mensal por MÓDULO (Produto)
  const chartDataModulos = useMemo(() => {
    const meses = Array.from(new Set(dadosFiltrados.map(f => f.mes_referencia).filter(Boolean))).sort();
    
    return meses.map(mes => {
      const [ano, mesNum] = mes.split("-");
      const nomeMes = new Date(Number(ano), Number(mesNum) - 1).toLocaleString("pt-BR", { month: "short" });
      
      const registroMes: any = { 
        label: `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano.slice(2)}`,
        sortKey: mes
      };
      
      // Agrupa os valores de todos os módulos naquele mês
      const faturamentosDoMes = dadosFiltrados.filter(f => f.mes_referencia === mes);
      faturamentosDoMes.forEach(fat => {
        const mod = fat.modulo || "OUTRO";
        registroMes[mod] = (registroMes[mod] || 0) + Number(fat.valor || 0);
      });
      
      return registroMes;
    });
  }, [dadosFiltrados]);

  // Pega a lista de todos os módulos únicos para criar as Linhas do Gráfico 1
  const modulosUnicos = useMemo(() => {
    return Array.from(new Set(dadosFiltrados.map(f => f.modulo).filter(Boolean)));
  }, [dadosFiltrados]);

  // 2️⃣ GRÁFICO 2: Comparativo Mensal por LICENCIADO (Top 5)
  const chartDataLicenciados = useMemo(() => {
    if (!isInterno) return []; 
    
    const licMap: Record<string, number> = {};
    dadosFiltrados.forEach(f => {
      const nome = f.licenciado || "NÃO INFORMADO";
      licMap[nome] = (licMap[nome] || 0) + Number(f.valor || 0);
    });
    
    const top5Nomes = Object.entries(licMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(item => item[0]);

    const meses = Array.from(new Set(dadosFiltrados.map(f => f.mes_referencia).filter(Boolean))).sort();
    
    return meses.map(mes => {
      const [ano, mesNum] = mes.split("-");
      const nomeMes = new Date(Number(ano), Number(mesNum) - 1).toLocaleString("pt-BR", { month: "short" });
      
      const registroMes: any = { 
        label: `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano.slice(2)}`,
        sortKey: mes
      };
      
      top5Nomes.forEach(licNome => {
        const fatLicenciado = dadosFiltrados
          .filter(f => f.mes_referencia === mes && (f.licenciado || "NÃO INFORMADO") === licNome)
          .reduce((acc, f) => acc + Number(f.valor || 0), 0);
        
        registroMes[licNome] = fatLicenciado;
      });
      
      return registroMes;
    });
  }, [dadosFiltrados, isInterno]);

  const licenciadosUnicos = useMemo(() => {
    if (chartDataLicenciados.length === 0) return [];
    const chaves = Object.keys(chartDataLicenciados[0]).filter(k => k !== 'label' && k !== 'sortKey');
    return chaves;
  }, [chartDataLicenciados]);

  // ==========================================
  // 🎨 RENDERIZAÇÃO
  // ==========================================

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Renderizando gráficos analíticos...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 bg-[#f8fafc] min-h-screen pb-16">

      {/* CABEÇALHO & FILTROS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <TrendingUp className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inteligência de Crescimento</h1>
            <p className="text-slate-500 mt-1">Comparativos de performance por produto e por licenciado.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select 
            value={filtroAno} 
            onChange={(e) => setFiltroAno(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none w-full sm:w-[100px]"
          >
            <option value="TODOS">Todo o Período</option>
            <option value="2024">Ano 2024</option>
            <option value="2025">Ano 2025</option>
            <option value="2026">Ano 2026</option>
            <option value="2027">Ano 2027</option>
          </select>
        </div>
      </div>

      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-xl shrink-0"><DollarSign className="h-7 w-7 text-emerald-600" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Faturamento Total do Filtro</p>
            <h3 className="text-2xl font-black text-emerald-700 truncate" title={formatadorMoeda(faturamentoTotal)}>
              {formatadorMoedaCompacta(faturamentoTotal)}
            </h3>
          </div>
        </div>

        {isInterno && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-purple-100 p-4 rounded-xl shrink-0"><Award className="h-7 w-7 text-purple-600" /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Licenciado Destaque</p>
              <h3 className="text-base font-bold text-slate-800 truncate">{topLicenciado.name}</h3>
              <p className="text-xs text-purple-600 font-bold mt-0.5">{formatadorMoedaCompacta(Number(topLicenciado.valor))}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-xl shrink-0"><Target className="h-7 w-7 text-orange-600" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Produto Destaque (Módulo)</p>
            <h3 className="text-base font-bold text-slate-800 truncate">{topModulo.name}</h3>
            <p className="text-xs text-orange-600 font-bold mt-0.5">{formatadorMoedaCompacta(Number(topModulo.valor))}</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          ÁREA DE GRÁFICOS
          ========================================== */}
      
      <div className="space-y-6">
        
        {/* GRÁFICO 1: CRESCIMENTO POR PRODUTO (LINE CHART ESTILIZADO) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800 uppercase flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" /> Crescimento Mensal por Produto (Módulo)
            </h3>
            <p className="text-sm text-slate-500 mt-1">Acompanhe qual solução gera mais faturamento a cada mês.</p>
          </div>

          <div className="w-full h-[450px]">
            {chartDataModulos.length === 0 ? (
              <EmptyState mensagem="Sem dados no período" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataModulos} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis width={80} stroke="#94a3b8" tickFormatter={formatadorEixoY} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }}
                  />
                  
                  {/* ✨ MUDANÇA: Linhas estilizadas com pontos vazados */}
                  {modulosUnicos.map((modulo, index) => (
                    <Line 
                      key={modulo} 
                      type="monotone" 
                      dataKey={modulo} 
                      name={modulo}
                      stroke={CORES_MODULOS[index % CORES_MODULOS.length]} 
                      strokeWidth={2} 
                      dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }} 
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }} 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: COMPARATIVO POR LICENCIADO (BARRAS AGRUPADAS) */}
        {isInterno && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-base font-bold text-slate-800 uppercase flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" /> Comparativo Mensal: Top 5 Licenciados
              </h3>
              <p className="text-sm text-slate-500 mt-1">Disputa de receita entre as 5 maiores operações da rede.</p>
            </div>

            <div className="w-full h-[450px]">
              {chartDataLicenciados.length === 0 ? (
                <EmptyState mensagem="Sem dados no período" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataLicenciados} margin={{ top: 20, right: 10, left: 10, bottom: 0 }} barGap={2} barCategoryGap="20%">
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} dy={10} />
                    <YAxis width={80} stroke="#94a3b8" tickFormatter={formatadorEixoY} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                    
                    {licenciadosUnicos.map((licenciado, index) => (
                      <Bar 
                        key={licenciado} 
                        dataKey={licenciado} 
                        name={licenciado}
                        fill={CORES_MODULOS[index % CORES_MODULOS.length]} 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}