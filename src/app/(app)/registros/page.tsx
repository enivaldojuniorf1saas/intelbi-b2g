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
import { Loader2, Upload, Search, Filter, ExternalLink } from "lucide-react";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { CsvImporter } from "@/components/csv-importer";
import { RegistroDetalhesModal } from "@/components/registro-detalhes-modal";

export default function RegistrosPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registroSelecionado, setRegistroSelecionado] = useState<any | null>(null);

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("registros")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true }); // ✨ O SEGREDO DO PROFESSOR AQUI!

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
          <CsvImporter onSuccess={fetchRegistros} />
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

      {/* TABELA EXTENSA: Adicionamos relative ao container para o Sticky funcionar perfeito */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto relative">
        {/* Adicionado min-w-[1400px] para evitar que as colunas esmaguem os textos */}
        <Table className="w-full min-w-[1400px] table-fixed text-[11px] md:text-xs">
          
          {/* ✨ CABEÇALHO FIXO: sticky top-0, z-20 e bg sólido */}
          <TableHeader className="bg-slate-100 sticky top-0 z-20 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)]">
            <TableRow className="hover:bg-transparent">
              {/* Recálculo matemático perfeito das larguras */}
              <TableHead className="w-[3%] px-3 h-11 font-bold text-slate-700 uppercase">UF</TableHead>
              <TableHead className="w-[9%] px-3 h-11 font-bold text-slate-700 uppercase">Local</TableHead>
              <TableHead className="w-[9%] px-3 h-11 font-bold text-slate-700 uppercase">Decisor</TableHead>
              <TableHead className="w-[3%] px-3 h-11 font-bold text-slate-700 uppercase">Núm.</TableHead>
              <TableHead className="w-[4%] px-3 h-11 font-bold text-slate-700 uppercase">Ref.</TableHead>
              <TableHead className="w-[14%] px-3 h-11 font-bold text-slate-700 uppercase">Objeto</TableHead>
              <TableHead className="w-[7%] px-3 h-11 font-bold text-slate-700 uppercase text-right">Valor (R$)</TableHead>
              <TableHead className="w-[6%] px-3 h-11 font-bold text-slate-700 uppercase text-center">Vigência</TableHead>
              <TableHead className="w-[14%] px-3 h-11 font-bold text-slate-700 uppercase">Fornecedor</TableHead>
              <TableHead className="w-[4%] px-3 h-11 font-bold text-slate-700 uppercase text-center">Taxa</TableHead>
              <TableHead className="w-[7%] px-3 h-11 font-bold text-slate-700 uppercase">Região</TableHead>
              <TableHead className="w-[5%] px-3 h-11 font-bold text-slate-700 uppercase text-right">Habit.</TableHead>
              <TableHead className="w-[4%] px-3 h-11 font-bold text-slate-700 uppercase text-right">Dist.</TableHead>
              <TableHead className="w-[6%] px-3 h-11 font-bold text-slate-700 uppercase">Qualif.</TableHead>
              <TableHead className="w-[5%] px-3 h-11 font-bold text-slate-700 uppercase text-center">Data</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={15} className="h-64 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                </TableCell>
              </TableRow>
            ) : registros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="h-64 text-center text-slate-500 font-medium">
                  Nenhum registro. Comece importando seu CSV.
                </TableCell>
              </TableRow>
            ) : (
              registros.map((registro) => (
                <TableRow 
                  key={registro.id} 
                  className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-blue-50/60 transition-colors"
                >
                  <TableCell className="px-3 py-3 truncate font-bold text-slate-800" title={registro.estado}>{registro.estado}</TableCell>
                  
                  <TableCell className="px-3 py-3 truncate font-medium text-slate-700" title={registro.local}>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(registro.local + ', ' + registro.estado)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 w-fit"
                    >
                      {registro.local}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </TableCell>

                  <TableCell className="px-3 py-3 truncate text-slate-600" title={registro.decisor}>{registro.decisor || '-'}</TableCell>
                  <TableCell className="px-3 py-3 truncate text-slate-500" title={registro.numero}>{registro.numero || '-'}</TableCell>
                  <TableCell className="px-3 py-3 truncate text-slate-500" title={registro.referencia}>{registro.referencia || '-'}</TableCell>
                  
                  <TableCell 
                    className="px-3 py-3 truncate text-blue-600 font-semibold hover:underline cursor-pointer" 
                    title={registro.objeto}
                    onClick={() => setRegistroSelecionado(registro)}
                  >                    
                    {registro.objeto || '-'}
                  </TableCell>
                  
                  <TableCell className="px-3 py-3 truncate text-right font-bold text-emerald-700">
                    {registro.valor ? `R$ ${Number(registro.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </TableCell>
                  <TableCell className="px-3 py-3 truncate text-center text-slate-600">
                    {registro.vigencia ? new Date(registro.vigencia).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="px-3 py-3 truncate text-slate-700 font-medium" title={registro.fornecedor}>{registro.fornecedor || '-'}</TableCell>
                  <TableCell className="px-3 py-3 truncate text-center font-bold">
                    {registro.taxa ? (
                      <span className={Number(registro.taxa) < 0 ? "text-red-600" : "text-blue-600"}>
                        {Number(registro.taxa).toFixed(2)}%
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-3 py-3 truncate text-slate-600" title={registro.regiao}>{registro.regiao || '-'}</TableCell>
                  <TableCell className="px-3 py-3 truncate text-right text-slate-600">
                    {registro.habitantes ? Number(registro.habitantes).toLocaleString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="px-3 py-3 truncate text-right text-slate-600">
                    {registro.distancia_km ? `${registro.distancia_km} KM` : '-'}
                  </TableCell>
                  <TableCell className="px-3 py-3 truncate text-slate-700 font-medium" title={registro.qualificacao}>{registro.qualificacao || '-'}</TableCell>
                  <TableCell className="px-3 py-3 truncate text-center text-slate-600">
                    {registro.data_evento ? new Date(registro.data_evento).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RegistroDetalhesModal 
        registro={registroSelecionado}
        isOpen={!!registroSelecionado}
        onClose={() => setRegistroSelecionado(null)}
        onSuccess={() => {
          fetchRegistros(); 
        }}
      />
    </div>
  );
}