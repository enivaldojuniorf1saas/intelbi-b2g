"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

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
import { Loader2, Search, ExternalLink, X, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { CsvImporter } from "@/components/csv-importer";
import { RegistroDetalhesModal } from "@/components/registro-detalhes-modal";

const ITENS_POR_PAGINA = 20;

export default function RegistrosPage() {
  const { isInterno, profile, isLoading: authLoading } = useAuth();

  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registroSelecionado, setRegistroSelecionado] = useState<any | null>(null);
  
  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroObjeto, setFiltroObjeto] = useState("TODOS");

  // Estado da Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  const fetchRegistros = async () => {
    try {
      let query = supabase
        .from("registros")
        .select("*")
        .limit(10000) 
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });

      if (!isInterno && profile?.estado_atuacao) {
        query = query.eq("estado", profile.estado_atuacao);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error("Erro ao buscar registros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRegistros();
    }
  }, [authLoading, isInterno, profile]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, filtroEstado, filtroObjeto]);

  const estadosUnicos = Array.from(new Set(registros.map(r => r.estado).filter(Boolean))).sort();
  const objetosUnicos = Array.from(new Set(registros.map(r => r.objeto).filter(Boolean))).sort();

  const registrosFiltrados = registros.filter((reg) => {
    const matchBusca = searchTerm === "" || 
                       (reg.local && reg.local.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (reg.objeto && reg.objeto.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchEstado = filtroEstado === "TODOS" || reg.estado === filtroEstado;
    const matchObjeto = filtroObjeto === "TODOS" || reg.objeto === filtroObjeto;

    return matchBusca && matchEstado && matchObjeto;
  });

  // ✨ A MÁGICA DA ORDENAÇÃO: Empurra os vazios para o final
  const registrosOrdenados = [...registrosFiltrados].sort((a, b) => {
    const aTemConteudo = (a.local && a.local.trim() !== '') || (a.objeto && a.objeto.trim() !== '');
    const bTemConteudo = (b.local && b.local.trim() !== '') || (b.objeto && b.objeto.trim() !== '');

    if (aTemConteudo && !bTemConteudo) return -1; // 'a' sobe
    if (!aTemConteudo && bTemConteudo) return 1;  // 'b' sobe
    return 0; // Se ambos tem (ou ambos não tem), mantém a ordem original do banco
  });

  // 👇 Agora a matemática da paginação usa os 'registrosOrdenados'
  const totalPaginas = Math.ceil(registrosOrdenados.length / ITENS_POR_PAGINA);
  const indexInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indexFinal = indexInicial + ITENS_POR_PAGINA;
  
  // E o corte dos 20 por página também usa o array ordenado
  const registrosPaginados = registrosOrdenados.slice(indexInicial, indexFinal);

  const limparFiltros = () => {
    setSearchTerm("");
    setFiltroEstado("TODOS");
    setFiltroObjeto("TODOS");
    setPaginaAtual(1);
  };

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 flex flex-col gap-4 overflow-hidden">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de Inteligência</h1>
          <p className="text-sm text-slate-500">
            {isInterno 
              ? "Visualização estendida de registros B2G (Nacional)."
              : `Sua carteira de registros B2G (${profile?.estado_atuacao}).`}
          </p>
        </div>
        
        <div className="flex gap-3">
          {isInterno && (
            <>
              <CsvImporter onSuccess={fetchRegistros} />
              <NovoRegistroModal onSuccess={fetchRegistros} />
            </>
          )}
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between shrink-0 shadow-sm gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-[250px] lg:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por município ou objeto..." 
              className="pl-9 h-9 border-slate-200" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isInterno && (
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="TODOS">Todos os Estados</option>
              {estadosUnicos.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          )}

          <select
            value={filtroObjeto}
            onChange={(e) => setFiltroObjeto(e.target.value)}
            className="h-9 max-w-[250px] truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Objetos</option>
            {objetosUnicos.map((obj) => (
              <option key={obj} value={obj}>{obj}</option>
            ))}
          </select>

          {(searchTerm !== "" || filtroEstado !== "TODOS" || filtroObjeto !== "TODOS") && (
            <Button 
              variant="ghost" 
              onClick={limparFiltros}
              className="h-9 text-slate-500 hover:text-red-600 px-3"
            >
              <X className="mr-2 h-4 w-4" /> Limpar
            </Button>
          )}
        </div>

        {/* ✨ NOVO BADGE DE QUANTIDADE TOTAL */}
        <div className="flex items-center shrink-0">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            {registrosFiltrados.length === registros.length 
              ? `${registros.length} Registros no Total` 
              : `${registrosFiltrados.length} de ${registros.length} Registros`}
          </span>
        </div>
      </div>

      {/* TABELA EXTENSA */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto relative">
        <Table className="w-full min-w-[1400px] table-fixed text-[11px] md:text-xs">
          <TableHeader className="bg-slate-100 sticky top-0 z-20 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[3%] px-3 h-11 font-bold text-slate-700 uppercase">UF</TableHead>
              <TableHead className="w-[9%] px-3 h-11 font-bold text-slate-700 uppercase">Local</TableHead>
              <TableHead className="w-[9%] px-3 h-11 font-bold text-slate-700 uppercase">Nome I</TableHead>
              <TableHead className="w-[3%] px-3 h-11 font-bold text-slate-700 uppercase">Núm.</TableHead>
              <TableHead className="w-[4%] px-3 h-11 font-bold text-slate-700 uppercase">Nome II.</TableHead>
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
            ) : registrosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="h-64 text-center text-slate-500 font-medium">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              registrosPaginados.map((registro) => (
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

      {/* CONTROLES DE PAGINAÇÃO */}
      {!isLoading && registrosFiltrados.length > 0 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0">
          <div className="text-sm text-slate-500 font-medium">
            Mostrando <span className="text-slate-900">{indexInicial + 1}</span> a <span className="text-slate-900">{Math.min(indexFinal, registrosFiltrados.length)}</span> de <span className="text-slate-900">{registrosFiltrados.length}</span> registros
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="text-slate-600"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="text-sm font-medium text-slate-600 px-4">
              Página {paginaAtual} de {totalPaginas}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas || totalPaginas === 0}
              className="text-slate-600"
            >
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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