"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { 
  Loader2, Search, FileText, LayoutList, Pencil, Trash2, 
  AlertTriangle, DownloadCloud, CalendarDays, X, Eye, 
  Database, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Lock, Unlock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

import { NovaPublicacaoModal } from "@/components/nova-publicacao-modal";
import { EditarPublicacaoModal } from "@/components/editar-publicacao-modal"; 
import { cn } from "@/lib/utils";


// Função para normalizar texto no filtro de fornecedor
const normalize = (text: string) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export default function PublicadosPage() {
  const router = useRouter(); 
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  const [publicacoes, setPublicacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [licencaAtiva, setLicencaAtiva] = useState<{nome: string, estado: string} | null>(null);

  // ✨ ESTADOS DOS FILTROS
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroMesAno, setFiltroMesAno] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroObjeto, setFiltroObjeto] = useState("TODOS");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  
  const [filtroFornecedor, setFiltroFornecedor] = useState("TODOS");
  const [fornecedorBuscaTexto, setFornecedorBuscaTexto] = useState("");
  const [mostrarDropdownFornecedor, setMostrarDropdownFornecedor] = useState(false);
  const fornecedorRef = useRef<HTMLDivElement>(null);

  // ✨ ESTADOS DOS MODAIS
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [publicacaoParaEditar, setPublicacaoParaEditar] = useState<any>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [publicacaoParaDeletar, setPublicacaoParaDeletar] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [publicacaoParaVisualizar, setPublicacaoParaVisualizar] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      const temAcesso = isInterno || profile?.modulos_ativos?.includes("publicados") || profile?.modulos_ativos?.includes("ALL");
      
      if (!temAcesso) {
        router.replace("/home"); 
      }
    }
  }, [authLoading, isInterno, profile, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("@aurotech:last_visit_publicados", new Date().toISOString());
      window.dispatchEvent(new Event("publicados_visited"));
    }
  }, []);

  useEffect(() => {
    if (profile?.licencas && profile.licencas.length > 0 && !licencaAtiva) {
      setLicencaAtiva(profile.licencas[0]);
    }
  }, [profile]);

  const fetchPublicacoes = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("publicacoes").select("*"); 

      if (!isInterno && licencaAtiva) {
        query = query.eq("estado", licencaAtiva.estado.trim().toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setPublicacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar publicações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (isInterno || licencaAtiva)) {
      fetchPublicacoes();
    }
  }, [authLoading, isInterno, licencaAtiva]);

  // ✨ CONTROLE DO CLIQUE FORA DO DROPDOWN DO FORNECEDOR
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

  // ✨ LÓGICA DE FILTRAGEM EM CASCATA
  const publicacoesBaseFiltros = (() => {
    if (filtroEstado === "TODOS") return publicacoes;
    return publicacoes.filter(p => p.estado === filtroEstado);
  })();

  const estadosUnicos = Array.from(new Set(publicacoes.map(p => p.estado).filter(Boolean))).sort();
  const objetosUnicos = Array.from(new Set(publicacoesBaseFiltros.map(p => p.objeto).filter(Boolean))).sort();
  const statusUnicos = Array.from(new Set(publicacoesBaseFiltros.map(p => p.status_fase).filter(Boolean))).sort();
  const fornecedoresUnicos = Array.from(new Set(publicacoesBaseFiltros.map(p => p.fornecedor).filter(Boolean))).sort();

  const fornecedoresFiltrados = fornecedoresUnicos.filter(f => 
    normalize(f).includes(normalize(fornecedorBuscaTexto))
  );

  const publicacoesFiltradas = publicacoes.filter((pub) => {
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      const matchBusca = (
        (pub.cliente && pub.cliente.toLowerCase().includes(termo)) ||
        (pub.objeto && pub.objeto.toLowerCase().includes(termo)) ||
        (pub.numero && pub.numero.toLowerCase().includes(termo)) ||
        (pub.estado && pub.estado.toLowerCase().includes(termo))
      );
      if (!matchBusca) return false;
    }
    
    if (filtroMesAno) {
      if (!pub.abertura) return false;
      if (!pub.abertura.startsWith(filtroMesAno)) return false;
    }

    if (filtroEstado !== "TODOS" && pub.estado !== filtroEstado) return false;
    if (filtroObjeto !== "TODOS" && pub.objeto !== filtroObjeto) return false;
    if (filtroStatus !== "TODOS" && pub.status_fase !== filtroStatus) return false;
    if (filtroFornecedor !== "TODOS" && pub.fornecedor !== filtroFornecedor) return false;

    return true;
  });

  const dataHojeParaSort = new Date();
  dataHojeParaSort.setHours(0, 0, 0, 0);
  const hojeTime = dataHojeParaSort.getTime();

  const publicacoesOrdenadas = [...publicacoesFiltradas].sort((a, b) => {
    const classificarAbertura = (abertura: string) => {
      if (!abertura) return { peso: 2, time: 0 }; 
      const time = new Date(`${abertura}T00:00:00`).getTime();
      const peso = time >= hojeTime ? 1 : 2; 
      return { peso, time };
    };

    const dataA = classificarAbertura(a.abertura);
    const dataB = classificarAbertura(b.abertura);

    if (dataA.peso !== dataB.peso) return dataA.peso - dataB.peso;
    if (dataA.peso === 1) return dataA.time - dataB.time;
    return dataB.time - dataA.time; 
  });

  const temFiltroAtivo = searchTerm !== "" || filtroMesAno !== "" || filtroEstado !== "TODOS" || filtroObjeto !== "TODOS" || filtroStatus !== "TODOS" || filtroFornecedor !== "TODOS";

  const limparFiltros = () => {
    setSearchTerm("");
    setFiltroMesAno("");
    setFiltroEstado("TODOS");
    setFiltroObjeto("TODOS");
    setFiltroStatus("TODOS");
    setFiltroFornecedor("TODOS");
    setFornecedorBuscaTexto("");
  };

  const handleAbrirDelete = (publicacao: any) => {
    setPublicacaoParaDeletar(publicacao);
    setIsDeleteModalOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!publicacaoParaDeletar) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("publicacoes").delete().eq("id", publicacaoParaDeletar.id);
      if (error) throw error;
      
      setPublicacoes((prev) => prev.filter((pub) => pub.id !== publicacaoParaDeletar.id));
      setIsDeleteModalOpen(false);
      setPublicacaoParaDeletar(null);
    } catch (error) {
      console.error("Erro ao excluir publicação:", error);
      alert("Erro ao excluir a publicação. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAbrirEdicao = (publicacao: any) => {
    setPublicacaoParaEditar(publicacao);
    setIsEditModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 flex flex-col gap-4 overflow-hidden">
      
      {/* CABEÇALHO LIMPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200">
            <LayoutList className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Publicações e Editais
            </h1>
            
            {isInterno ? (
              <p className="text-sm text-slate-500 mt-1">Mapeamento de novas oportunidades e aberturas.</p>
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
        </div>

        <div className="flex gap-3 items-center w-full sm:w-auto justify-end">
          {isInterno && <NovaPublicacaoModal onSuccess={fetchPublicacoes} />}
        </div>
      </div>

      {/* ✨ ÁREA DE FILTROS RESPONSIVA + BADGE ISOLADA */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
        
        {/* Esquerda: Agrupamento dos Filtros */}
        <div className="flex flex-wrap items-center gap-2 flex-1">

          {/* 1. Estados */}
          {isInterno && (
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setFiltroObjeto("TODOS");
                setFiltroStatus("TODOS");
                setFiltroFornecedor("TODOS");
                setFornecedorBuscaTexto("");
              }}
              className="h-9 w-full sm:w-[130px] lg:w-auto truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="TODOS">Estados</option>
              {estadosUnicos.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          )}

          {/* 2. Busca */}
          <div className="relative w-full sm:w-[200px] lg:w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por Lead" 
              className="pl-9 h-9 border-slate-200 w-full text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 3. Objeto */}
          <select
            value={filtroObjeto}
            onChange={(e) => setFiltroObjeto(e.target.value)}
            className="h-9 w-full sm:w-[130px] lg:w-auto truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Objetos</option>
            {objetosUnicos.map((obj) => (
              <option key={obj} value={obj}>{obj}</option>
            ))}
          </select>

          {/* 4. Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-9 w-full sm:w-[130px] lg:w-auto truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Status</option>
            {statusUnicos.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* 5. Fornecedores */}
          <div className="relative w-full sm:w-[180px] lg:w-auto" ref={fornecedorRef}>
            <div className="relative">
              <Input
                autoComplete="off" // ✨ CORREÇÃO: Bloqueia o dropdown nativo do navegador
                placeholder="Fornecedores"
                className="h-9 w-full min-w-[140px] pr-8 text-xs border-slate-200 bg-white truncate cursor-text"
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
              <div className="absolute top-full mt-1 z-50 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl max-h-[250px] overflow-y-auto">
                <div
                  className="px-3 py-2 text-xs cursor-pointer text-slate-600 hover:bg-slate-100 font-semibold sticky top-0 bg-white border-b border-slate-100"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFiltroFornecedor("TODOS");
                    setFornecedorBuscaTexto("");
                    setMostrarDropdownFornecedor(false);
                  }}
                >
                 Todos Fornecedores
                </div>
                
                {fornecedoresFiltrados.length > 0 ? (
                  fornecedoresFiltrados.map((forn) => (
                    <div
                      key={forn}
                      className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border-b border-slate-50 last:border-0 truncate"
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
                  <div className="px-3 py-4 text-xs text-slate-500 text-center italic">
                    Nenhum fornecedor com "{fornecedorBuscaTexto}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Mês/Ano */}
          <div className="relative w-full sm:w-[140px] lg:w-auto">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input 
              type="month"
              value={filtroMesAno}
              onChange={(e) => setFiltroMesAno(e.target.value)}
              className="h-9 w-full min-w-[130px] border-slate-200 bg-white pl-9 pr-3 py-1 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer"
              title="Filtrar por mês/ano de abertura"
            />
          </div>

          {temFiltroAtivo && (
            <Button 
              variant="ghost" 
              onClick={limparFiltros}
              className="h-9 text-slate-500 hover:text-red-600 px-2 shrink-0"
            >
              <X className="mr-1 h-4 w-4" /> Limpar
            </Button>
          )}
        </div>

        {/* Badge Isolada no Canto Direito */}
        <div className="flex shrink-0 mt-2 md:mt-0 pt-0.5 ml-auto">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Database className="w-4 h-4 text-emerald-500" />
            {publicacoesFiltradas.length === publicacoes.length 
              ? `${publicacoes.length} Publicações` 
              : `${publicacoesFiltradas.length} de ${publicacoes.length} Publicações`}
          </span>
        </div>

      </div>

      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto relative custom-scrollbar">
        <Table className="w-full min-w-[1300px] text-[11px] md:text-xs">
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">UF</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-emerald-700 text-center align-middle uppercase border-b-2 border-emerald-500 bg-emerald-50/50">Abertura</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">LEAD</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Objeto</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Valor (R$)</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Tx Adm.</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Tx Cred.</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Rede Cred.</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Capac. Técnica</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">POC</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Status</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Edital</TableHead>
              <TableHead className="px-1.5 py-2 font-bold text-slate-700 text-center align-middle uppercase">Ações</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} className="h-64 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                </TableCell>
              </TableRow>
            ) : publicacoesOrdenadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 mb-2 mx-auto" />
                    <p className="font-medium">Nenhuma publicação encontrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              publicacoesOrdenadas.map((pub) => {
                const dataAbertura = pub.abertura ? new Date(`${pub.abertura}T00:00:00`).getTime() : 0;
                const isAberturaProxima = dataAbertura > 0 && dataAbertura >= hojeTime && dataAbertura <= (hojeTime + 5 * 24 * 60 * 60 * 1000); 
                
                return (
                  <TableRow key={pub.id} className="hover:bg-emerald-50/40 transition-colors border-b border-slate-100 text-center group">

                    <TableCell className="px-1.5 py-2 text-center align-middle whitespace-nowrap">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {pub.estado || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="px-1.5 py-2 text-center align-middle whitespace-nowrap">
                      <div className="flex justify-center">
                        <div className={cn(
                          "inline-flex items-center justify-center font-bold px-2 py-1 rounded-md border transition-colors",
                          isAberturaProxima ? "bg-rose-50 border-rose-200 text-rose-700 ring-1 ring-rose-500 animate-pulse" : "bg-slate-100 border-slate-200 text-slate-700"
                        )}>
                          {pub.abertura ? new Date(`${pub.abertura}T00:00:00`).toLocaleDateString("pt-BR") : "-"}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-1.5 py-2 text-center align-middle">
                      <div className="font-bold text-slate-800 line-clamp-3 leading-tight break-words whitespace-normal mx-auto" title={pub.cliente}>
                        {pub.cliente || "-"}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-1.5 py-2 text-center align-middle">
                      <div className="font-semibold text-emerald-600 line-clamp-3 leading-tight break-words whitespace-normal mx-auto" title={pub.objeto}>
                        {pub.objeto || "-"}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-1.5 py-2 text-center font-bold text-emerald-700 whitespace-nowrap align-middle">
                      {pub.valor ? `R$ ${Number(pub.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </TableCell>
                    
                    <TableCell className="px-1.5 py-2 text-center font-bold align-middle whitespace-nowrap">
                      {pub.taxa_administracao !== null && pub.taxa_administracao !== undefined ? (
                        <span className={Number(pub.taxa_administracao) < 0 ? "text-rose-600" : "text-slate-700"}>
                          {Number(pub.taxa_administracao).toFixed(2)}%
                        </span>
                      ) : "-"}
                    </TableCell>
                    
                    <TableCell className="px-1.5 py-2 text-center font-bold align-middle whitespace-nowrap">
                      {pub.taxa_credenciamento !== null && pub.taxa_credenciamento !== undefined ? (
                        <span className={Number(pub.taxa_credenciamento) < 0 ? "text-rose-600" : "text-slate-700"}>
                          {Number(pub.taxa_credenciamento).toFixed(2)}%
                        </span>
                      ) : "-"}
                    </TableCell>

                    <TableCell className="px-1.5 py-2 text-center align-middle">
                      <div className="text-slate-600 font-medium line-clamp-3 leading-tight break-words whitespace-normal mx-auto" title={pub.qtd_rede_cred}>
                        {pub.qtd_rede_cred || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="px-1.5 py-2 text-center align-middle">
                      <div className="text-slate-600 font-medium line-clamp-3 leading-tight break-words whitespace-normal mx-auto" title={pub.capacidade_tecnica}>
                        {pub.capacidade_tecnica || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="px-1.5 py-2 text-center align-middle whitespace-nowrap">
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {pub.poc ? pub.poc.toUpperCase() : "-"}
                      </span>
                    </TableCell>

                    <TableCell className="px-1.5 py-2 align-middle text-center">
                      <div className="flex justify-center w-full mx-auto">
                        <span 
                          className="inline-flex items-center justify-center font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 leading-snug text-[10px] text-center w-full max-w-full break-words whitespace-normal" 
                          title={pub.status_fase}
                        >
                          {pub.status_fase || "-"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-1.5 py-2 text-center align-middle">
                      <div className="flex justify-center">
                        {pub.arquivo_url ? (
                          <a 
                            href={pub.arquivo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-200 transition-colors"
                            title="Baixar Edital Original (PDF)"
                          >
                            <DownloadCloud className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-1.5 py-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        
                        <button 
                          onClick={() => setPublicacaoParaVisualizar(pub)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {isInterno && (
                          <>
                            <button 
                              onClick={() => handleAbrirEdicao(pub)}
                              className="p-1.5 text-blue-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar Publicação"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            
                            <button 
                              onClick={() => handleAbrirDelete(pub)}
                              className="p-1.5 text-red-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Excluir Publicação"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EditarPublicacaoModal 
        publicacao={publicacaoParaEditar}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTimeout(() => setPublicacaoParaEditar(null), 200); 
        }}
        onSuccess={fetchPublicacoes}
      />

      {/* ✨ MODAL DE VISUALIZAÇÃO APENAS LEITURA (PADRONIZADO) */}
      <Dialog open={!!publicacaoParaVisualizar} onOpenChange={(open) => !open && setPublicacaoParaVisualizar(null)}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-slate-50">
          
          <DialogHeader className="p-5 pb-3 bg-white border-b border-slate-200 shrink-0">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center justify-between">
              <span>{publicacaoParaVisualizar?.cliente || "Publicação"} - {publicacaoParaVisualizar?.estado || "UF"}</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-2 rounded-md border flex items-center gap-1"><Lock className="w-3 h-3"/> Somente Leitura</span>
            </DialogTitle>
            <p className="text-blue-600 font-semibold text-xs truncate mt-0.5" title={publicacaoParaVisualizar?.objeto}>
              {publicacaoParaVisualizar?.objeto || "Sem objeto definido"}
            </p>
          </DialogHeader>
          
          {publicacaoParaVisualizar && (
            <div className="p-5 bg-slate-50/50 overflow-y-auto max-h-[75vh] custom-scrollbar">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    Dados da Publicação / Lead
                  </h3>
                  
                  <div className="space-y-1 pb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Lead</label>
                    <Input title={publicacaoParaVisualizar.cliente} disabled value={publicacaoParaVisualizar.cliente || ""} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2 w-full" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Estado (UF)</label>
                      <Input disabled value={publicacaoParaVisualizar.estado || ""} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Número</label>
                      <Input disabled value={publicacaoParaVisualizar.numero || "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Data de Abertura</label>
                      <Input disabled value={publicacaoParaVisualizar.abertura ? new Date(`${publicacaoParaVisualizar.abertura}T00:00:00`).toLocaleDateString("pt-BR") : "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Fornecedor Atual</label>
                      <Input title={publicacaoParaVisualizar.fornecedor} disabled value={publicacaoParaVisualizar.fornecedor || "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Estimado</label>
                      <Input disabled value={publicacaoParaVisualizar.valor ? `R$ ${Number(publicacaoParaVisualizar.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"} className="bg-slate-50/50 text-emerald-700 font-bold text-xs disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Status / Fase</label>
                      <Input disabled value={publicacaoParaVisualizar.status_fase || "-"} className="bg-slate-50/50 text-indigo-700 font-bold text-xs disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Objeto Completo</label>
                    <Textarea disabled value={publicacaoParaVisualizar.objeto || ""} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 resize-none min-h-[60px] border-slate-200 p-2.5" />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    Análise Técnica e Financeira
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Qualificação Econômica</label>
                      <div className="text-xs font-semibold text-slate-700 bg-slate-50/50 p-2.5 rounded-md border border-slate-200 h-9 flex items-center">
                        {publicacaoParaVisualizar.qualificacao_economica || "-"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Garantia Contratual</label>
                      <div className="text-xs font-semibold text-emerald-700 bg-emerald-50/40 p-2.5 rounded-md border border-emerald-200 h-9 flex items-center">
                        {publicacaoParaVisualizar.garantia_tipo === "R$" && publicacaoParaVisualizar.garantia_valor
                          ? `R$ ${Number(publicacaoParaVisualizar.garantia_valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : publicacaoParaVisualizar.garantia_tipo === "%" && publicacaoParaVisualizar.garantia_valor
                          ? `${Number(publicacaoParaVisualizar.garantia_valor).toFixed(2)}% do valor global`
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Taxa Adm. (%)</label>
                      <Input disabled value={publicacaoParaVisualizar.taxa_administracao !== null ? `${Number(publicacaoParaVisualizar.taxa_administracao).toFixed(2)}%` : "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Taxa Cred. (%)</label>
                      <Input disabled value={publicacaoParaVisualizar.taxa_credenciamento !== null ? `${Number(publicacaoParaVisualizar.taxa_credenciamento).toFixed(2)}%` : "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">POC</label>
                      <Input disabled value={publicacaoParaVisualizar.poc ? publicacaoParaVisualizar.poc.toUpperCase() : "-"} className="bg-slate-50/50 text-slate-700 font-bold text-xs disabled:bg-slate-100/80 disabled:opacity-100 h-9 border-slate-200 px-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rede Credenciada Exigida</label>
                      <Textarea disabled value={publicacaoParaVisualizar.qtd_rede_cred || "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 resize-none min-h-[60px] border-slate-200 p-2.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Capacidade Técnica</label>
                      <Textarea disabled value={publicacaoParaVisualizar.capacidade_tecnica || "-"} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-100 resize-none min-h-[60px] border-slate-200 p-2.5" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
          
          <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
            <Button variant="outline" onClick={() => setPublicacaoParaVisualizar(null)} className="font-semibold text-slate-600 shadow-sm hover:bg-slate-100 w-full sm:w-auto">
              Fechar Visualização
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && !isDeleting && setIsDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-md p-6 shadow-2xl rounded-2xl border-0">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-red-100 p-3 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Confirmar Exclusão</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm text-slate-500 pt-3 leading-relaxed">
              Tem certeza que deseja excluir a publicação do cliente <strong className="text-slate-800">{publicacaoParaDeletar?.cliente}</strong> {publicacaoParaDeletar?.numero && <span>(<strong>{publicacaoParaDeletar?.numero}</strong>)</span>}?
              <br/><br/>
              Esta ação <strong className="text-red-600 font-bold">não pode ser desfeita</strong> e os dados serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)} 
              disabled={isDeleting}
              className="border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmarExclusao} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-[120px]"
            >
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : "Sim, Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}