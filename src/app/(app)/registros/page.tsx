"use client";

import { useEffect, useState, useRef } from "react";
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
import { Loader2, Search, ExternalLink, X, ChevronLeft, ChevronRight, Database, Clock, ChevronDown, CalendarDays } from "lucide-react";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { CsvImporter } from "@/components/csv-importer";
import { RegistroDetalhesModal } from "@/components/registro-detalhes-modal";

const TERRITORIOS_ESPECIAIS: Record<string, { estado: string, mesorregioes: string[] }> = {
  "CE_SUL": {
    estado: "CE",
    mesorregioes: ["Sul Cearense", "Centro-Sul Cearense"] 
  }
};

const ITENS_POR_PAGINA = 20;

const calcularAlerta = (dataIso?: string) => {
  if (!dataIso) return null;
  const dataVencimento = new Date(`${dataIso}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); 
  
  const diffTime = dataVencimento.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return { texto: "Vencido", badge: "bg-red-500 text-white border-slate-300" };
  if (diffDias <= 30) return { texto: `${diffDias} dias`, badge: "bg-red-50 text-red-700 border-red-200" };
  if (diffDias <= 60) return { texto: `${diffDias} dias`, badge: "bg-orange-50 text-orange-700 border-orange-200" };
  if (diffDias <= 90) return { texto: `${diffDias} dias`, badge: "bg-yellow-50 text-yellow-700 border-yellow-300" };
  if (diffDias <= 120) return { texto: `${diffDias} dias`, badge: "bg-blue-50 text-blue-700 border-blue-200" };
  
  return { texto: `${diffDias} dias`, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
};

const formatarInteiro = (num: any) => {
  if (num === null || num === undefined || num === '') return null;
  const parsed = parseInt(String(num), 10);
  return isNaN(parsed) ? null : String(parsed);
};

const normalize = (text: string) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export default function RegistrosPage() {
  const { isInterno, profile, isLoading: authLoading } = useAuth();

  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registroSelecionado, setRegistroSelecionado] = useState<any | null>(null);
  
  const [licencaAtiva, setLicencaAtiva] = useState<{nome: string, estado: string} | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroObjeto, setFiltroObjeto] = useState("TODOS");
  const [filtroNumero, setFiltroNumero] = useState("TODOS");
  const [filtroRegiao, setFiltroRegiao] = useState("TODOS");
  const [filtroQualificacao, setFiltroQualificacao] = useState("TODOS");
  const [filtroPrazo, setFiltroPrazo] = useState("TODOS"); 
  const [filtroMesAno, setFiltroMesAno] = useState(""); 

  const [filtroFornecedor, setFiltroFornecedor] = useState("TODOS");
  const [fornecedorBuscaTexto, setFornecedorBuscaTexto] = useState("");
  const [mostrarDropdownFornecedor, setMostrarDropdownFornecedor] = useState(false);
  const fornecedorRef = useRef<HTMLDivElement>(null);

  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    if (profile?.licencas && profile.licencas.length > 0 && !licencaAtiva) {
      setLicencaAtiva(profile.licencas[0]);
    }
  }, [profile]);

  const fetchRegistros = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("registros")
        .select("*")
        .limit(10000) 
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });

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

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error("Erro ao buscar registros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (isInterno || licencaAtiva)) {
      fetchRegistros();
    }
  }, [authLoading, isInterno, licencaAtiva]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, filtroEstado, filtroObjeto, filtroNumero, filtroFornecedor, filtroRegiao, filtroQualificacao, filtroPrazo, filtroMesAno]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fornecedorRef.current && !fornecedorRef.current.contains(event.target as Node)) {
        setMostrarDropdownFornecedor(false);
        if (filtroFornecedor === "TODOS") {
          setFornecedorBuscaTexto("");
        } else {
          setFornecedorBuscaTexto(filtroFornecedor);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filtroFornecedor]);


  const registrosBaseFiltros = filtroEstado === "TODOS" 
    ? registros 
    : registros.filter(r => r.estado === filtroEstado);

  const estadosUnicos = Array.from(new Set(registros.map(r => r.estado).filter(Boolean))).sort();
  const objetosUnicos = Array.from(new Set(registrosBaseFiltros.map(r => r.objeto).filter(Boolean))).sort();
  const fornecedoresUnicos = Array.from(new Set(registrosBaseFiltros.map(r => r.fornecedor).filter(Boolean))).sort();
  const regioesUnicas = Array.from(new Set(registrosBaseFiltros.map(r => r.regiao).filter(Boolean))).sort();
  const qualificacoesUnicas = Array.from(new Set(registrosBaseFiltros.map(r => r.qualificacao?.toUpperCase()).filter(Boolean))).sort();
  const numerosUnicos = Array.from(new Set(registrosBaseFiltros.map(r => formatarInteiro(r.numero)).filter(Boolean)))
                             .sort((a, b) => Number(a) - Number(b));

  const fornecedoresFiltrados = fornecedoresUnicos.filter(f => 
    normalize(f).includes(normalize(fornecedorBuscaTexto))
  );

  const registrosFiltrados = registros.filter((reg) => {
    const matchBusca = searchTerm === "" || 
                       (reg.local && typeof reg.local === "string" && reg.local.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (reg.objeto && typeof reg.objeto === "string" && reg.objeto.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (reg.orgao && typeof reg.orgao === "string" && reg.orgao.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchEstado = filtroEstado === "TODOS" || reg.estado === filtroEstado;
    const matchObjeto = filtroObjeto === "TODOS" || reg.objeto === filtroObjeto;
    const matchNumero = filtroNumero === "TODOS" || formatarInteiro(reg.numero) === filtroNumero;
    const matchFornecedor = filtroFornecedor === "TODOS" || reg.fornecedor === filtroFornecedor;
    const matchRegiao = filtroRegiao === "TODOS" || reg.regiao === filtroRegiao;
    const matchQualificacao = filtroQualificacao === "TODOS" || reg.qualificacao?.toUpperCase() === filtroQualificacao;

    const matchMesAno = (() => {
      if (!filtroMesAno) return true;
      if (!reg.vigencia) return false;
      return reg.vigencia.startsWith(filtroMesAno);
    })();

    const matchPrazo = (() => {
      if (filtroPrazo === "TODOS") return true;
      if (!reg.vigencia) return false; 

      const dataVencimento = new Date(`${reg.vigencia}T00:00:00`);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const diffDias = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (filtroPrazo === "VENCIDOS") return diffDias < 0;
      if (filtroPrazo === "30") return diffDias >= 0 && diffDias <= 30;
      if (filtroPrazo === "60") return diffDias > 30 && diffDias <= 60;
      if (filtroPrazo === "90") return diffDias > 60 && diffDias <= 90;
      if (filtroPrazo === "120") return diffDias > 90 && diffDias <= 120;
      if (filtroPrazo === "LONGO") return diffDias > 120;
      
      return true;
    })();

    return matchBusca && matchEstado && matchObjeto && matchNumero && matchFornecedor && matchRegiao && matchQualificacao && matchPrazo && matchMesAno;
  });

  const dataHojeParaSort = new Date();
  dataHojeParaSort.setHours(0, 0, 0, 0);
  const hojeTime = dataHojeParaSort.getTime();

  const registrosOrdenados = [...registrosFiltrados].sort((a, b) => {
    const classificarData = (vigencia: string) => {
      if (!vigencia) return { categoria: 3, time: 0 }; 
      const time = new Date(`${vigencia}T00:00:00`).getTime();
      const categoria = time < hojeTime ? 2 : 1; 
      return { categoria, time };
    };

    const dataA = classificarData(a.vigencia);
    const dataB = classificarData(b.vigencia);

    if (dataA.categoria !== dataB.categoria) {
      return dataA.categoria - dataB.categoria;
    }

    if (dataA.categoria !== 3) {
      if (dataA.time !== dataB.time) {
        return dataA.time - dataB.time;
      }
    }

    const aTemConteudo = (typeof a.local === 'string' && a.local.trim() !== '') || 
                         (typeof a.objeto === 'string' && a.objeto.trim() !== '');
    const bTemConteudo = (typeof b.local === 'string' && b.local.trim() !== '') || 
                         (typeof b.objeto === 'string' && b.objeto.trim() !== '');

    if (aTemConteudo && !bTemConteudo) return -1;
    if (!aTemConteudo && bTemConteudo) return 1; 
    return 0; 
  });

  const totalPaginas = Math.ceil(registrosOrdenados.length / ITENS_POR_PAGINA);
  const indexInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indexFinal = indexInicial + ITENS_POR_PAGINA;
  
  const registrosPaginados = registrosOrdenados.slice(indexInicial, indexFinal);

  const limparFiltros = () => {
    setSearchTerm("");
    setFiltroEstado("TODOS");
    setFiltroObjeto("TODOS");
    setFiltroNumero("TODOS");
    setFiltroRegiao("TODOS");
    setFiltroQualificacao("TODOS");
    setFiltroPrazo("TODOS"); 
    setFiltroFornecedor("TODOS");
    setFornecedorBuscaTexto("");
    setFiltroMesAno("");
    setPaginaAtual(1);
  };

  const temFiltroAtivo = searchTerm !== "" || 
                         filtroEstado !== "TODOS" || 
                         filtroObjeto !== "TODOS" ||
                         filtroNumero !== "TODOS" ||
                         filtroFornecedor !== "TODOS" ||
                         filtroRegiao !== "TODOS" ||
                         filtroQualificacao !== "TODOS" ||
                         filtroPrazo !== "TODOS" ||
                         filtroMesAno !== "";

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 flex flex-col gap-4 overflow-hidden">
      
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cenário Mercadológico</h1>
          
          {isInterno ? (
            <p className="text-sm text-slate-500">Visualização estendida de registros B2G (Nacional).</p>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-slate-500">Sua carteira B2G ativa:</p>
              
              {profile?.licencas && profile.licencas.length > 1 ? (
                <select
                  value={licencaAtiva?.estado || ""}
                  onChange={(e) => {
                    const novaLicenca = profile.licencas.find((l: any) => l.estado === e.target.value);
                    if (novaLicenca) setLicencaAtiva(novaLicenca);
                  }}
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 py-0 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                >
                  {profile.licencas.map((lic: any, idx: number) => (
                    <option key={idx} value={lic.estado}>
                      🏢 {lic.nome} ({lic.estado})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-blue-700 px-1">
                  🏢 {licencaAtiva?.nome} ({licencaAtiva?.estado})
                </span>
              )}
            </div>
          )}
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

      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-start justify-between shrink-0 shadow-sm gap-4">
        
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-[250px] lg:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por município ou órgão..." 
              className="pl-9 h-9 border-slate-200 w-full" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={filtroPrazo}
              onChange={(e) => setFiltroPrazo(e.target.value)}
              className="h-9 w-full sm:max-w-[200px] truncate rounded-md border border-slate-200 bg-white pl-8 pr-3 py-1 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value="TODOS">Prazos e Alertas</option>
              <option value="VENCIDOS">Já Vencidos</option>
              <option value="30">Até 30 dias (Urgente)</option>
              <option value="60">Até 60 dias</option>
              <option value="90">Até 90 dias</option>
              <option value="120">Até 120 dias</option>
              <option value="LONGO">Longo Prazo ({">"} 120 dias)</option>
            </select>
          </div>

          <div className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input 
              type="month"
              value={filtroMesAno}
              onChange={(e) => setFiltroMesAno(e.target.value)}
              className="h-9 w-full sm:max-w-[160px] border-slate-200 bg-white pl-8 pr-3 py-1 text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
              title="Filtrar vigência por mês/ano"
            />
          </div>

          {isInterno && (
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setFiltroObjeto("TODOS");
                setFiltroRegiao("TODOS");
                setFiltroQualificacao("TODOS");
                setFiltroNumero("TODOS");
                setFiltroPrazo("TODOS"); 
                setFiltroFornecedor("TODOS");
                setFornecedorBuscaTexto("");
                setFiltroMesAno("");
              }}
              className="h-9 max-w-[200px] truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
            className="h-9 max-w-[200px] truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Objetos</option>
            {objetosUnicos.map((obj) => (
              <option key={obj} value={obj}>{obj}</option>
            ))}
          </select>

          <div className="relative" ref={fornecedorRef}>
            <div className="relative">
              <Input
                placeholder="Todos Fornecedores"
                className="h-9 w-full sm:w-[220px] pr-8 text-sm border-slate-200 bg-white truncate cursor-text"
                value={fornecedorBuscaTexto}
                onChange={(e) => {
                  setFornecedorBuscaTexto(e.target.value);
                  setMostrarDropdownFornecedor(true);
                  if (e.target.value === "") {
                    setFiltroFornecedor("TODOS");
                  }
                }}
                onFocus={() => setMostrarDropdownFornecedor(true)}
              />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              
              {filtroFornecedor !== "TODOS" && (
                <button 
                  onClick={() => {
                    setFiltroFornecedor("TODOS");
                    setFornecedorBuscaTexto("");
                  }}
                  className="absolute right-7 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600 flex items-center justify-center bg-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {mostrarDropdownFornecedor && (
              <div className="absolute top-full mt-1 z-50 w-full min-w-[250px] bg-white border border-slate-200 rounded-lg shadow-xl max-h-[250px] overflow-y-auto">
                <div
                  className="px-3 py-2 text-sm cursor-pointer text-slate-600 hover:bg-slate-100 font-semibold sticky top-0 bg-white border-b border-slate-100"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFiltroFornecedor("TODOS");
                    setFornecedorBuscaTexto("");
                    setMostrarDropdownFornecedor(false);
                  }}
                >
                  Todos os Fornecedores
                </div>
                
                {fornecedoresFiltrados.length > 0 ? (
                  fornecedoresFiltrados.map((forn) => (
                    <div
                      key={forn}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border-b border-slate-50 last:border-0 truncate"
                      title={forn}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFiltroFornecedor(forn);
                        setFornecedorBuscaTexto(forn);
                        setMostrarDropdownFornecedor(false);
                      }}
                    >
                      {forn}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-slate-500 text-center italic">
                    Nenhum fornecedor encontrado com "{fornecedorBuscaTexto}"
                  </div>
                )}
              </div>
            )}
          </div>

          <select
            value={filtroRegiao}
            onChange={(e) => setFiltroRegiao(e.target.value)}
            className="h-9 max-w-[200px] truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Todas as Regiões</option>
            {regioesUnicas.map((reg) => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>

          <select
            value={filtroQualificacao}
            onChange={(e) => setFiltroQualificacao(e.target.value)}
            className="h-9 max-w-[200px] truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Qualificações</option>
            {qualificacoesUnicas.map((qual) => (
              <option key={qual} value={qual}>{qual}</option>
            ))}
          </select>
          
          <select
            value={filtroNumero}
            onChange={(e) => setFiltroNumero(e.target.value)}
            className="h-9 max-w-[150px] truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS"> Número</option>
            {numerosUnicos.map((num) => (
              <option key={String(num)} value={String(num)}>{num}</option>
            ))}
          </select>

          {temFiltroAtivo && (
            <Button 
              variant="ghost" 
              onClick={limparFiltros}
              className="h-9 text-slate-500 hover:text-red-600 px-3 shrink-0"
            >
              <X className="mr-2 h-4 w-4" /> Limpar
            </Button>
          )}
        </div>

        <div className="flex items-center shrink-0 mt-2 md:mt-0">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            {registrosFiltrados.length === registros.length 
              ? `${registros.length} Registros` 
              : `${registrosFiltrados.length} de ${registros.length} Registros`}
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto relative custom-scrollbar">
        {/* ✨ MÁGICA 1: "table-fixed" adicionado aqui embaixo e largura ajustada para garantir os limites */}
        <Table className="w-full min-w-[1400px] table-fixed text-[11px] md:text-xs">
          <TableHeader className="bg-slate-100 sticky top-0 z-20 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[2%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">UF</TableHead>
              <TableHead className="w-[8%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Local</TableHead>
              <TableHead className="w-[6%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Órgão</TableHead>
              <TableHead className="w-[9%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Nome I</TableHead>
              <TableHead className="w-[3%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Núm.</TableHead>
              <TableHead className="w-[8%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Nome II</TableHead>
              <TableHead className="w-[10%] px-2 py-3 font-bold text-slate-700 uppercase align-middle">Objeto</TableHead>
              <TableHead className="w-[8%] px-2 py-3 font-bold text-slate-700 uppercase text-right align-middle">Valor (R$)</TableHead>
              <TableHead className="w-[6%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Alerta</TableHead>
              <TableHead className="w-[6%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Vigência</TableHead>
              <TableHead className="w-[12%] px-2 py-3 font-bold text-slate-700 uppercase align-middle">Fornecedor</TableHead>
              <TableHead className="w-[3%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Taxa</TableHead>
              <TableHead className="w-[7%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Região</TableHead>
              <TableHead className="w-[4%] px-2 py-3 font-bold text-slate-700 uppercase text-right align-middle">Habit.</TableHead>
              <TableHead className="w-[5%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Qualif.</TableHead>
              <TableHead className="w-[3%] px-2 py-3 font-bold text-slate-700 uppercase text-center align-middle">Data</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={16} className="h-64 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                </TableCell>
              </TableRow>
            ) : registrosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="h-64 text-center text-slate-500 font-medium">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              registrosPaginados.map((registro) => {
                const infoAlerta = calcularAlerta(registro.vigencia);

                return (
                  <TableRow 
                    key={registro.id} 
                    className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-blue-50/60 transition-colors"
                  >
                    <TableCell className="px-2 py-3 font-bold text-slate-800 text-center align-middle whitespace-nowrap">{registro.estado}</TableCell>
                    
                    <TableCell className="px-2 py-3 font-medium text-slate-700 text-center align-middle">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((registro.local || '') + ', ' + (registro.estado || ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 justify-center leading-tight break-words whitespace-normal"
                      >
                        {registro.local || '-'}
                        {registro.local && <ExternalLink className="h-3 w-3 shrink-0" />}
                      </a>
                    </TableCell>

                    <TableCell className="px-2 py-3 text-center align-middle">
                      <div className="text-slate-600 leading-tight line-clamp-3 break-words whitespace-normal" title={registro.orgao}>
                        {registro.orgao || '-'}
                      </div>
                    </TableCell>
                    
                    {/* ✨ MÁGICA 2: "break-words whitespace-normal" adicionados nas colunas pedidas */}
                    <TableCell className="px-2 py-3 align-middle text-center">
                      <div className="text-slate-600 leading-tight line-clamp-3 break-words whitespace-normal" title={registro.decisor}>
                        {registro.decisor || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-3 text-slate-500 text-center align-middle">{formatarInteiro(registro.numero) || '-'}</TableCell>
                    
                    {/* ✨ Nome II adaptado */}
                    <TableCell className="px-2 py-3 align-middle text-center">
                      <div className="text-slate-500 leading-tight line-clamp-3 break-words whitespace-normal" title={registro.referencia}>
                        {registro.referencia || '-'}
                      </div>
                    </TableCell>
                    
                    {/* ✨ Objeto adaptado */}
                    <TableCell 
                      className="px-2 py-3 align-middle cursor-pointer" 
                      onClick={() => setRegistroSelecionado(registro)}
                    >                    
                      <div className="text-blue-600 font-semibold hover:underline leading-snug line-clamp-3 break-words whitespace-normal" title={registro.objeto}>
                        {registro.objeto || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-3 text-right font-bold text-emerald-700 align-middle whitespace-nowrap">
                      {registro.valor ? `R$ ${Number(registro.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </TableCell>

                    <TableCell className="px-2 py-3 text-center align-middle whitespace-nowrap">
                      {infoAlerta ? (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${infoAlerta.badge}`}>
                          {infoAlerta.texto}
                        </span>
                      ) : '-'}
                    </TableCell>

                    <TableCell className="px-2 py-3 text-center text-slate-600 align-middle whitespace-nowrap">
                      {registro.vigencia ? new Date(`${registro.vigencia}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                    </TableCell>
                    
                    {/* ✨ Fornecedor adaptado (removi o max-w-[200px] limitador que forçava a sobreposição) */}
                    <TableCell className="px-2 py-3 align-middle">
                      <div className="text-slate-700 font-medium leading-tight line-clamp-3 break-words whitespace-normal" title={registro.fornecedor}>
                        {registro.fornecedor || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-3 text-center font-bold align-middle whitespace-nowrap">
                      {registro.taxa ? (
                        <span className={Number(registro.taxa) < 0 ? "text-red-600" : "text-blue-600"}>
                          {Number(registro.taxa).toFixed(2)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    
                    <TableCell className="px-2 py-3 text-slate-600 text-center align-middle whitespace-nowrap">{registro.regiao || '-'}</TableCell>
                    
                    <TableCell className="px-2 py-3 text-right text-slate-600 align-middle whitespace-nowrap">
                      {registro.habitantes ? Number(registro.habitantes).toLocaleString('pt-BR') : '-'}
                    </TableCell>
                    
                    <TableCell className="px-2 py-3 text-slate-700 font-medium text-center align-middle whitespace-nowrap">
                      {registro.qualificacao ? registro.qualificacao.toUpperCase() : '-'}
                    </TableCell>
                    
                    <TableCell className="px-2 py-3 text-center text-slate-600 align-middle whitespace-nowrap">
                      {registro.data_evento ? new Date(`${registro.data_evento}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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