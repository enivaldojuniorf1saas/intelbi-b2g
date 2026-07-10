"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Upload, Search, Filter } from "lucide-react";

// Importação do nosso Modal
import { NovoRegistroModal } from "@/components/novo-registro-modal";

export default function RegistrosPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("registros")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error("Erro ao buscar registros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 flex flex-col gap-4 overflow-hidden">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de Inteligência</h1>
          <p className="text-sm text-slate-500">Visualização estendida de registros B2G.</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
            <Upload className="mr-2 h-4 w-4" /> Carga em Massa (CSV)
          </Button>
          
          {/* AQUI ESTÁ A MÁGICA: O Botão antigo foi substituído pelo Componente do Modal! */}
          <NovoRegistroModal onSuccess={fetchRegistros} />
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por local ou objeto..." className="pl-9 h-9 border-slate-200" />
          </div>
          <Button variant="outline" className="h-9 text-slate-600 border-slate-200">
            <Filter className="mr-2 h-4 w-4 text-slate-400" /> Filtros Avançados
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">
            {registros.length} registros
          </span>
        </div>
      </div>

      {/* TABELA EXTENSA (FULL WIDTH COM ZEBRA STRIPING) */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto">
        <Table className="w-full table-fixed text-[11px] md:text-xs">
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <TableRow>
              <TableHead className="w-[3%] px-2 h-10 font-bold text-slate-600 uppercase">UF</TableHead>
              <TableHead className="w-[7%] px-2 h-10 font-bold text-slate-600 uppercase">Local</TableHead>
              <TableHead className="w-[7%] px-2 h-10 font-bold text-slate-600 uppercase">Decisor</TableHead>
              <TableHead className="w-[5%] px-2 h-10 font-bold text-slate-600 uppercase">Núm.</TableHead>
              <TableHead className="w-[5%] px-2 h-10 font-bold text-slate-600 uppercase">Ref.</TableHead>
              <TableHead className="w-[14%] px-2 h-10 font-bold text-slate-600 uppercase">Objeto</TableHead>
              <TableHead className="w-[7%] px-2 h-10 font-bold text-slate-600 uppercase text-right">Valor (R$)</TableHead>
              <TableHead className="w-[5%] px-2 h-10 font-bold text-slate-600 uppercase text-center">Vigência</TableHead>
              <TableHead className="w-[5%] px-2 h-10 font-bold text-slate-600 uppercase text-center">Alerta</TableHead>
              <TableHead className="w-[11%] px-2 h-10 font-bold text-slate-600 uppercase">Fornecedor</TableHead>
              <TableHead className="w-[4%] px-2 h-10 font-bold text-slate-600 uppercase text-center">Taxa</TableHead>
              <TableHead className="w-[6%] px-2 h-10 font-bold text-slate-600 uppercase">Região</TableHead>
              <TableHead className="w-[5%] px-2 h-10 font-bold text-slate-600 uppercase text-right">Habit.</TableHead>
              <TableHead className="w-[4%] px-2 h-10 font-bold text-slate-600 uppercase text-right">Dist.</TableHead>
              <TableHead className="w-[6%] px-2 h-10 font-bold text-slate-600 uppercase">Qualif.</TableHead>
              <TableHead className="w-[6%] px-2 h-10 font-bold text-slate-600 uppercase text-center">Data</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={16} className="h-64 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                </TableCell>
              </TableRow>
            ) : registros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="h-64 text-center text-slate-500 font-medium">
                  Nenhum registro. Comece importando seu CSV.
                </TableCell>
              </TableRow>
            ) : (
              registros.map((registro) => (
                <TableRow 
                  key={registro.id} 
                  className="border-b border-slate-100 even:bg-slate-50/80 hover:bg-blue-50/50 transition-colors"
                >
                  <TableCell className="px-2 py-3 truncate font-bold text-slate-800" title={registro.estado}>{registro.estado}</TableCell>
                  <TableCell className="px-2 py-3 truncate font-medium text-slate-700" title={registro.local}>{registro.local}</TableCell>
                  <TableCell className="px-2 py-3 truncate" title={registro.decisor}>{registro.decisor || '-'}</TableCell>
                  <TableCell className="px-2 py-3 truncate text-slate-500" title={registro.numero}>{registro.numero || '-'}</TableCell>
                  <TableCell className="px-2 py-3 truncate text-slate-500" title={registro.referencia}>{registro.referencia || '-'}</TableCell>
                  <TableCell className="px-2 py-3 truncate text-blue-600 font-medium hover:underline cursor-pointer" title={registro.objeto}>
                    {registro.objeto || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-right font-medium text-emerald-700">
                    {registro.valor ? `R$ ${Number(registro.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-center text-slate-600">
                    {registro.vigencia ? new Date(registro.vigencia).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-center">
                    {registro.alerta ? (
                      <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold" title={registro.alerta}>
                        {registro.alerta}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-slate-700" title={registro.fornecedor}>{registro.fornecedor || '-'}</TableCell>
                  <TableCell className="px-2 py-3 truncate text-center font-medium">
                    {registro.taxa ? (
                      <span className={Number(registro.taxa) < 0 ? "text-red-600" : "text-blue-600"}>
                        {Number(registro.taxa).toFixed(2)}%
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-slate-600" title={registro.regiao}>{registro.regiao || '-'}</TableCell>
                  <TableCell className="px-2 py-3 truncate text-right text-slate-600">
                    {registro.habitantes ? Number(registro.habitantes).toLocaleString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-right text-slate-600">
                    {registro.distancia_km ? `${registro.distancia_km} KM` : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-3 truncate text-slate-600" title={registro.qualificacao}>{registro.qualificacao || '-'}</TableCell>
                  <TableCell className="px-2 py-3 truncate text-center text-slate-600">
                    {registro.data_evento ? new Date(registro.data_evento).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}