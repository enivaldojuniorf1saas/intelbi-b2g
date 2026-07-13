"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, BarChart3, PieChart } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

// Paleta de cores moderna e expansiva para o gráfico de pizza
const CORES_PIZZA = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#ec4899"];

export default function DashboardPage() {
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  const [dadosObjetoQtd, setDadosObjetoQtd] = useState<any[]>([]);
  const [dadosObjetoValor, setDadosObjetoValor] = useState<any[]>([]);
  const [dadosFornecedor, setDadosFornecedor] = useState<any[]>([]);
  const [dadosQualificacao, setDadosQualificacao] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;

    const carregarEProcessarDados = async () => {
      setLoading(true);

      let query = supabase.from("registros").select("*");
      
      if (!isInterno && profile?.estado_atuacao) {
        query = query.eq("estado", profile.estado_atuacao);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar dados para o dashboard:", error);
        setLoading(false);
        return;
      }

      const mapObjQtd: Record<string, number> = {};
      const mapObjValor: Record<string, number> = {};
      const mapForn: Record<string, number> = {};
      const mapQuali: Record<string, number> = {};

      data?.forEach((reg) => {
        // Objeto
        const objeto = reg.objeto ? reg.objeto.trim() : "Não Informado";
        mapObjQtd[objeto] = (mapObjQtd[objeto] || 0) + 1;
        mapObjValor[objeto] = (mapObjValor[objeto] || 0) + Number(reg.valor || 0);

        // Fornecedor
        const fornecedor = reg.fornecedor ? reg.fornecedor.trim() : "Não Informado";
        mapForn[fornecedor] = (mapForn[fornecedor] || 0) + 1;

        // Qualificação
        const qualificacao = reg.qualificacao ? reg.qualificacao.trim() : "Sem Classificação";
        mapQuali[qualificacao] = (mapQuali[qualificacao] || 0) + 1;
      });

      // Formatando para o Recharts (Top 7) - Aumentamos um pouco a string pois agora temos mais espaço
      const formatObjetoQtd = Object.entries(mapObjQtd)
        .map(([name, value]) => ({ name: name.length > 25 ? name.substring(0, 25) + "..." : name, value, fullName: name }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

      const formatObjetoValor = Object.entries(mapObjValor)
        .map(([name, value]) => ({ name: name.length > 25 ? name.substring(0, 25) + "..." : name, value, fullName: name }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

      const formatFornecedor = Object.entries(mapForn)
        .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 20) + "..." : name, value, fullName: name }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

      const formatQualificacao = Object.entries(mapQuali)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setDadosObjetoQtd(formatObjetoQtd);
      setDadosObjetoValor(formatObjetoValor);
      setDadosFornecedor(formatFornecedor);
      setDadosQualificacao(formatQualificacao);
      setLoading(false);
    };

    carregarEProcessarDados();
  }, [authLoading, isInterno, profile]);

  const formatadorMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    // ✨ Container Expandido: w-full e padding inteligente baseado no dispositivo
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* Cabeçalho */}
      <div className="w-full max-w-[1800px] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard Analítico</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">
          {isInterno 
            ? "Métricas globais de objetos, fornecedores e qualificações."
            : `Métricas exclusivas para a região de ${profile?.estado_atuacao}.`}
        </p>
      </div>

      {/* ✨ Grid de Gráficos: Responsivo e com bastante respiro (gap) */}
      <div className="w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        {/* GRÁFICO 1: Qtd por Objeto */}
        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Top Objetos (Quantidade)</h2>
          </div>
          {/* Altura adaptável por dispositivo */}
          <div className="w-full h-[300px] sm:h-[350px] xl:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* Ajustamos o YAxis width para usar o novo espaço lateral */}
              <BarChart data={dadosObjetoQtd} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Qtd de Contratos" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Valor por Objeto */}
        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Top Objetos (Volume Financeiro)</h2>
          </div>
          <div className="w-full h-[300px] sm:h-[350px] xl:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosObjetoValor} margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  formatter={(value: number) => [formatadorMoeda(value), "Volume Total"]}
                  labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Qtd por Fornecedor */}
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

        {/* GRÁFICO 4: Qtd por Qualificação */}
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
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }) => percent > 0.03 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                  labelLine={false}
                >
                  {dadosQualificacao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                  ))}
                </Pie>
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