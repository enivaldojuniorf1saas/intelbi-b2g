"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Target, AlertCircle, Clock, Wallet, Inbox } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Cell, LabelList, ReferenceLine,
} from "recharts";

// =====================================================================
// 🎨 TOKENS DE DESIGN — mantém a paleta original, adiciona escala de urgência
// =====================================================================

// "Já Vencidos" foi removido do dashboard: contratos vencidos não fazem
// mais parte do pipeline ativo, então nem entram nas contas abaixo.
const CORES_VENCIMENTO: Record<string, string> = {
  "Curto Prazo (Jun - Ago/26)": "#f59e0b",
  "Médio Prazo (Set - Nov/26)": "#eab308",
  "Janela Alvo (Dez/26 - Mai/27)": "#3b82f6",
  "Longo Prazo (> Mai/27)": "#10b981",
};

const ORDEM_VENCIMENTO = Object.keys(CORES_VENCIMENTO);

const formatadorMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);

const formatadorEixoY = (val: number) => {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
  return `R$ ${val}`;
};

// Formatador compacto para os números grandes dos cards de KPI (evita
// que valores na casa do bilhão estourem a largura do card). O valor
// exato continua disponível via atributo `title` (tooltip nativo no hover).
const formatadorMoedaCompacta = (valor: number) => {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000_000) return `R$ ${(valor / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Bi`;
  if (abs >= 1_000_000) return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mi`;
  if (abs >= 1_000) return `R$ ${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatadorMoeda(valor);
};

// =====================================================================
// 🧩 TOOLTIP CUSTOMIZADO — substitui o tooltip padrão do Recharts para
// casar com o visual dos cards (branco, borda sutil, sombra, cantos 2xl)
// =====================================================================

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 min-w-[160px]">
      {label && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">{entry.name}</span>
          <span className="text-sm font-bold" style={{ color: entry.color || entry.payload?.fill }}>
            {entry.dataKey === "quantidade" ? `${entry.value} municípios` : formatadorMoeda(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-slate-400 gap-2 py-10">
      <Inbox className="h-6 w-6" />
      <p className="text-sm">{mensagem}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, isInterno } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [registros, setRegistros] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function fetchDashboardData() {
      try {
        setHasError(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase.from("registros").select("*");
        if (!isInterno) {
          query = query.eq("user_id", user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        setRegistros(data || []);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile) {
      fetchDashboardData();
    }
  }, [profile, isInterno]);

  // =====================================================================
  // 🧠 MÁQUINA DE CÁLCULO DE DADOS
  // =====================================================================

  // Remove contratos já vencidos (vigência anterior a Jun/26) de TODO o
  // dashboard — eles não representam pipeline ativo, então nem entram
  // no volume, no financeiro, nos gráficos ou nas médias.
  const registrosAtivos = registros.filter((r) => {
    if (!r.vigencia) return true;
    return r.vigencia.substring(0, 7) >= "2026-06";
  });

  const totalRegistros = registrosAtivos.length;
  const valorTotal = registrosAtivos.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const ticketMedio = totalRegistros > 0 ? valorTotal / totalRegistros : 0;

  // Cada faixa agora guarda quantidade E valor, para alimentar tanto o
  // gráfico de urgência quanto o card de KPI "vencendo em breve"
  const vencimentoMap: Record<string, { quantidade: number; valor: number }> = {};
  ORDEM_VENCIMENTO.forEach((key) => (vencimentoMap[key] = { quantidade: 0, valor: 0 }));

  registrosAtivos.forEach((curr) => {
    if (!curr.vigencia) return;
    const mesAno = curr.vigencia.substring(0, 7);
    const valor = curr.valor || 0;

    let faixa: string;
    if (mesAno <= "2026-08") faixa = "Curto Prazo (Jun - Ago/26)";
    else if (mesAno <= "2026-11") faixa = "Médio Prazo (Set - Nov/26)";
    else if (mesAno <= "2027-05") faixa = "Janela Alvo (Dez/26 - Mai/27)";
    else faixa = "Longo Prazo (> Mai/27)";

    vencimentoMap[faixa].quantidade++;
    vencimentoMap[faixa].valor += valor;
  });

  // Gráfico de urgência: barras horizontais ordenadas do mais crítico ao
  // menos crítico — muito mais fácil de ler e comparar do que um donut,
  // e reforça a metáfora de "termômetro" (linha decrescente de risco)
  const termometroData = ORDEM_VENCIMENTO
    .map((key) => ({
      name: key.replace(/\s*\(.*?\)/, ""), // rótulo curto no eixo
      nomeCompleto: key,
      quantidade: vencimentoMap[key].quantidade,
      fill: CORES_VENCIMENTO[key],
    }))
    .filter((item) => item.quantidade > 0);

  const vencendoEmBreve = vencimentoMap["Curto Prazo (Jun - Ago/26)"];

  const receitaEstadoMap = registrosAtivos.reduce((acc: Record<string, number>, curr) => {
    if (!curr.estado || !curr.valor) return acc;
    acc[curr.estado] = (acc[curr.estado] || 0) + curr.valor;
    return acc;
  }, {});
  const receitaEstadoData = Object.keys(receitaEstadoMap)
    .map((key) => ({ name: key, valor: receitaEstadoMap[key] }))
    .sort((a, b) => b.valor - a.valor);
  const estadoTopo = receitaEstadoData[0]?.name;

  const mesesJanela = [
    "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
    "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05",
  ];

  const vigenciaJanelaMap = registrosAtivos.reduce((acc: Record<string, number>, curr) => {
    if (!curr.vigencia || !curr.valor) return acc;
    const mesAno = curr.vigencia.substring(0, 7);
    if (mesesJanela.includes(mesAno)) {
      acc[mesAno] = (acc[mesAno] || 0) + curr.valor;
    }
    return acc;
  }, {});

  const vigenciaData = mesesJanela.map((mes) => {
    const [ano, mesNum] = mes.split("-");
    const nomeMes = new Date(Number(ano), Number(mesNum) - 1).toLocaleString("pt-BR", { month: "short" });
    return {
      dataOriginal: mes,
      label: `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano.slice(2)}`,
      valor: vigenciaJanelaMap[mes] || 0,
    };
  });

  const mediaJanela = vigenciaData.length
    ? vigenciaData.reduce((acc, curr) => acc + curr.valor, 0) / vigenciaData.length
    : 0;

  // =====================================================================
  // 🎨 RENDERIZAÇÃO
  // =====================================================================

  if (!isMounted || isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Analisando inteligência de dados...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen pb-16">

      {/* CABEÇALHO */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          {isInterno ? "Visão Executiva Global" : "Seu Painel de Negócios"}
        </h1>
        <p className="text-slate-500 mt-1">
          {isInterno
            ? "Métricas de toda a operação IntelBI consolidadas em tempo real."
            : `Métricas exclusivas da operação de ${profile?.nome || "sua conta"}.`}
        </p>
      </div>

      {hasError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          Não foi possível carregar os dados agora. Tente atualizar a página.
        </div>
      )}

      {totalRegistros === 0 && !hasError ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <EmptyState mensagem="Nenhum registro encontrado ainda. Assim que houver dados, seus indicadores aparecem aqui." />
        </div>
      ) : (
        <>
          {/* CARDS DE KPI — 4 indicadores: volume, pipeline, urgência e ticket médio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
              <div className="bg-blue-100 p-4 rounded-xl shrink-0"><Target className="h-7 w-7 text-blue-600" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume de Oportunidades</p>
                <h3 className="text-1xl font-bold text-slate-800 truncate">{totalRegistros} municípios</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
              <div className="bg-emerald-100 p-4 rounded-xl shrink-0"><TrendingUp className="h-7 w-7 text-emerald-600" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pipeline Financeiro</p>
                <h3 className="text-1xl font-bold text-emerald-700 truncate" title={formatadorMoeda(valorTotal)}>
                  {formatadorMoedaCompacta(valorTotal)}
                </h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
              <div className="bg-red-100 p-4 rounded-xl shrink-0"><AlertCircle className="h-7 w-7 text-red-600" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencendo até Ago/26</p>
                <h3 className="text-2xl font-bold text-red-700">{vencendoEmBreve.quantidade} municípios</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate" title={formatadorMoeda(vencendoEmBreve.valor)}>
                  {formatadorMoedaCompacta(vencendoEmBreve.valor)} em risco
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
              <div className="bg-purple-100 p-4 rounded-xl shrink-0"><Wallet className="h-7 w-7 text-purple-600" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket Médio</p>
                <h3 className="text-2xl font-bold text-slate-800 truncate" title={formatadorMoeda(ticketMedio)}>
                  {formatadorMoedaCompacta(ticketMedio)}
                </h3>
              </div>
            </div>
          </div>

          {/* ÁREA DOS GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* GRÁFICO 1: TERMÔMETRO DE VENCIMENTOS — barras horizontais em vez de pizza.
                Fica mais fácil comparar quantidades entre faixas e a ordem das barras
                (mais urgente no topo) reforça a leitura de "termômetro de risco". */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-slate-700 uppercase mb-2 flex items-center gap-2 shrink-0">
                <Clock className="h-4 w-4 text-orange-500" /> Urgência de Oportunidades (Prazos)
              </h3>
              <p className="text-xs text-slate-400 mb-4 shrink-0">Municípios por janela de vencimento, do mais urgente ao mais distante</p>

              <div className="flex-1 min-h-[300px] w-full">
                {termometroData.length === 0 ? (
                  <EmptyState mensagem="Sem dados suficientes" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={termometroData}
                      layout="vertical"
                      margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                      barCategoryGap={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={130}
                        tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                      />
                      <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} maxBarSize={28}>
                        {termometroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="quantidade"
                          position="right"
                          style={{ fill: "#334155", fontSize: 12, fontWeight: 700 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICO 2: RECEITA POR ESTADO — mantém barras verticais, agora com
                rótulo de valor sobre cada barra e destaque para o estado líder. */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-slate-700 uppercase mb-2 flex items-center gap-2 shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Distribuição de Receita por Estado
              </h3>
              <p className="text-xs text-slate-400 mb-6 shrink-0">
                Soma de valor estimado por UF{estadoTopo ? ` — líder: ${estadoTopo}` : ""}
              </p>

              <div className="flex-1 min-h-[300px] w-full">
                {receitaEstadoData.length === 0 ? (
                  <EmptyState mensagem="Sem dados suficientes" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={receitaEstadoData} margin={{ top: 24, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis tickFormatter={formatadorEixoY} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={60} />
                      <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {receitaEstadoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === estadoTopo ? "#059669" : "#a7f3d0"} />
                        ))}
                        <LabelList
                          dataKey="valor"
                          position="top"
                          formatter={formatadorEixoY}
                          style={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ÁREA DOS GRÁFICOS (Linha 2: Janela de Ação) — agora um gráfico de área
              com gradiente e linha de referência da média, para dar peso visual
              ao volume financeiro e mostrar de imediato os meses acima/abaixo da média. */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-purple-500" /> Janela de Ação (1 Ano de Foco)
                </h3>
                <p className="text-xs text-slate-400">Valores de contratos vencendo entre Junho/2026 e Maio/2027</p>
              </div>
              <div className="mt-4 md:mt-0 px-3 py-1 bg-purple-50 border border-purple-100 rounded-md text-xs font-semibold text-purple-700">
                Período: Jun/2026 a Mai/2027
              </div>
            </div>

            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vigenciaData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                  <YAxis tickFormatter={formatadorEixoY} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={70} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <ReferenceLine
                    y={mediaJanela}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ value: "Média", position: "insideTopLeft", fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="url(#colorValor)"
                    dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}