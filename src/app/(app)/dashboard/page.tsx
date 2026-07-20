"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Activity, BarChart3, PieChart } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const CORES_PIZZA = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#ec4899"];

export default function DashboardPage() {
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  const [dadosObjetoMisto, setDadosObjetoMisto] = useState<any[]>([]);
  const [dadosFornecedor, setDadosFornecedor] = useState<any[]>([]);
  const [dadosQualificacao, setDadosQualificacao] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;

    const carregarEProcessarDados = async () => {
      setLoading(true);

      let query = supabase
        .from("registros")
        .select("*")
        .limit(10000) 
        .order("created_at", { ascending: false });
      
      if (!isInterno && profile?.estado_atuacao) {
        query = query.eq("estado", profile.estado_atuacao);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar dados para o dashboard:", error);
        setLoading(false);
        return;
      }

      const mapObj: Record<string, { qtd: number; valor: number }> = {};
      const mapForn: Record<string, number> = {};
      const mapQuali: Record<string, number> = {};

      data?.forEach((reg) => {
        const objeto = reg.objeto ? reg.objeto.trim() : "Não Informado";
        if (!mapObj[objeto]) mapObj[objeto] = { qtd: 0, valor: 0 };
        mapObj[objeto].qtd += 1;
        mapObj[objeto].valor += Number(reg.valor || 0);

        const fornecedor = reg.fornecedor ? reg.fornecedor.trim() : "Não Informado";
        mapForn[fornecedor] = (mapForn[fornecedor] || 0) + 1;

        const qualificacao = reg.qualificacao ? reg.qualificacao.trim() : "Sem Classificação";
        mapQuali[qualificacao] = (mapQuali[qualificacao] || 0) + 1;
      });

      const formatObjetoMisto = Object.entries(mapObj)
        .map(([name, metrics]) => ({
          name: name.length > 20 ? name.substring(0, 20) + "..." : name,
          fullName: name,
          qtd: metrics.qtd,
          valor: metrics.valor
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10); 

      const formatFornecedor = Object.entries(mapForn)
        .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 20) + "..." : name, value, fullName: name }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

      const formatQualificacao = Object.entries(mapQuali)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setDadosObjetoMisto(formatObjetoMisto);
      setDadosFornecedor(formatFornecedor);
      setDadosQualificacao(formatQualificacao);
      setLoading(false);
    };

    carregarEProcessarDados();
  }, [authLoading, isInterno, profile]);

  const formatadorMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  };

  const formatadorMoedaCompacto = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    // ✨ Aqui está o ajuste de margem/padding para descolar os itens da sidebar e organizar o visual
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 sm:p-8 lg:p-12 xl:pl-16 space-y-6 lg:space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="w-full max-w-[1800px] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard Analítico</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">
          {isInterno 
            ? "Métricas globais de objetos, fornecedores e qualificações."
            : `Métricas exclusivas para a região de ${profile?.estado_atuacao}.`}
        </p>
      </div>

      <div className="w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col w-full lg:col-span-2">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Correlação: Volume Financeiro x Quantidade de Contratos</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Análise por Objeto</p>
            </div>
          </div>
          <div className="w-full h-[350px] sm:h-[400px] xl:h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosObjetoMisto} margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={12} />
                
                <YAxis yAxisId="left" tickFormatter={formatadorMoedaCompacto} tick={{ fontSize: 11, fill: '#10b981', fontWeight: 600 }} axisLine={false} tickLine={false} />
                
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#3b82f6', fontWeight: 600 }} axisLine={false} tickLine={false} />
                
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                  formatter={(value: number, name: string) => [
                    name === "Volume Financeiro" ? formatadorMoeda(value) : value, 
                    name
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                
                <Line yAxisId="left" type="monotone" dataKey="valor" name="Volume Financeiro" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                <Line yAxisId="right" type="monotone" dataKey="qtd" name="Quantidade (Qtd)" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Top Fornecedores (Quantidade)</h2>
          </div>
          <div className="w-full h-[300px] sm:h-[350px] xl:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosFornecedor} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} name="Qtd de Contratos" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Qtd por Qualificação */}
        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <PieChart className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Distribuição por Qualificação</h2>
          </div>
          <div className="w-full h-[300px] sm:h-[350px] xl:h-[420px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={dadosQualificacao}
                  cx="50%"
                  cy="45%" /* Subimos um pouquinho para dar espaço à legenda embaixo */
                  innerRadius="45%"
                  outerRadius="65%" /* ✨ Reduzido de 80% para 65% para os textos não cortarem */
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  /* ✨ Linha guia reativada com um tom de cinza elegante */
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  /* Ajuste de tamanho e cor da fonte direto no Pie */
                  fontSize={11}
                  fontWeight={500}
                  fill="#475569"
                  label={({ name, percent }) => percent > 0.03 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                >
                  {dadosQualificacao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                  ))}
                </Pie>
                
                {/* ✨ NOVA LEGENDA: Organiza as informações sem poluir o gráfico */}
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#475569' }} 
                />

                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value, "Registros"]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}