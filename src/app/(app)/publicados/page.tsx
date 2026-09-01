"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Search, FileText, LayoutList, Pencil, Trash2, AlertTriangle, DownloadCloud, CalendarDays, X, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export default function PublicadosPage() {
  const router = useRouter(); 
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  const [publicacoes, setPublicacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [filtroMesAno, setFiltroMesAno] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [publicacaoParaEditar, setPublicacaoParaEditar] = useState<any>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [publicacaoParaDeletar, setPublicacaoParaDeletar] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✨ NOVO: Estado para abrir o modal de visualização apenas-leitura
  const [publicacaoParaVisualizar, setPublicacaoParaVisualizar] = useState<any>(null);

  const [licencaAtiva, setLicencaAtiva] = useState<{nome: string, estado: string} | null>(null);

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

  const dataHojeParaSort = new Date();
  dataHojeParaSort.setHours(0, 0, 0, 0);
  const hojeTime = dataHojeParaSort.getTime();

  const publicacoesOrdenadas = publicacoes
    .filter((pub) => {
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

      return true;
    })
    .sort((a, b) => {
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

  const temFiltroAtivo = searchTerm !== "" || filtroMesAno !== "";

  const limparFiltros = () => {
    setSearchTerm("");
    setFiltroMesAno("");
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
              <p className="text-sm text-slate-500">Mapeamento de novas oportunidades e aberturas.</p>
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

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-[250px] lg:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente, UF, número..." 
              className="pl-9 bg-white border-slate-200 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input 
              type="month"
              value={filtroMesAno}
              onChange={(e) => setFiltroMesAno(e.target.value)}
              className="h-9 w-full sm:max-w-[160px] border-slate-200 bg-white pl-8 pr-3 py-1 text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
              title="Filtrar por mês/ano de abertura"
            />
          </div>

          {temFiltroAtivo && (
            <Button 
              variant="ghost" 
              onClick={limparFiltros}
              className="h-9 text-slate-500 hover:text-red-600 px-3 shrink-0"
            >
              <X className="mr-2 h-4 w-4" /> Limpar
            </Button>
          )}
          
          {isInterno && <NovaPublicacaoModal onSuccess={fetchPublicacoes} />}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
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
                
                {/* ✨ AÇÕES: Agora a coluna de ações fica visível para todos (para abrigar o botão de Olho) */}
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

                      {/* ✨ AÇÕES C/ BOTÃO DE VISUALIZAR: Todos veem o olho, apenas Interno vê Lápis e Lixeira */}
                      <TableCell className="px-1.5 py-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          {/* Botão Visualizar (Todos) */}
                          <button 
                            onClick={() => setPublicacaoParaVisualizar(pub)}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            title="Visualizar Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Botões Administrativos */}
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
        
        {!isLoading && publicacoesOrdenadas.length > 0 && (
          <div className="bg-slate-50 p-2 border-t border-slate-200 text-xs text-slate-500 font-medium shrink-0 flex justify-between items-center">
            <span>Mostrando <strong className="text-slate-800">{publicacoesOrdenadas.length}</strong> publicações mapeadas ordenadas por urgência de abertura.</span>
          </div>
        )}
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

      {/* ✨ MODAL DE VISUALIZAÇÃO APENAS LEITURA */}
      <Dialog open={!!publicacaoParaVisualizar} onOpenChange={(open) => !open && setPublicacaoParaVisualizar(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-slate-50">
          <DialogHeader className="p-6 bg-white border-b border-slate-200">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-emerald-600" />
              Detalhes da Publicação
            </DialogTitle>
          </DialogHeader>
          
          {publicacaoParaVisualizar && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              
              {/* Bloco 1: Informações Principais */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1">Dados Básicos</h3>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cliente / Órgão</label>
                  <div className="text-sm font-bold text-slate-800 bg-white p-2.5 rounded-md border border-slate-200 mt-1">{publicacaoParaVisualizar.cliente || "-"}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Estado (UF)</label>
                    <div className="text-sm font-semibold text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">{publicacaoParaVisualizar.estado || "-"}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Data de Abertura</label>
                    <div className="text-sm font-semibold text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">
                      {publicacaoParaVisualizar.abertura ? new Date(`${publicacaoParaVisualizar.abertura}T00:00:00`).toLocaleDateString("pt-BR") : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Objeto</label>
                  <div className="text-sm text-slate-700 bg-white p-3 rounded-md border border-slate-200 mt-1 min-h-[80px] leading-relaxed">
                    {publicacaoParaVisualizar.objeto || "-"}
                  </div>
                </div>
              </div>

              {/* Bloco 2: Financeiro e Técnico */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1">Análise Técnica e Financeira</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Estimado</label>
                    <div className="text-sm font-bold text-emerald-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">
                      {publicacaoParaVisualizar.valor ? `R$ ${Number(publicacaoParaVisualizar.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Taxa Adm.</label>
                    <div className="text-sm font-semibold text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">
                      {publicacaoParaVisualizar.taxa_administracao !== null ? `${Number(publicacaoParaVisualizar.taxa_administracao).toFixed(2)}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Taxa Cred.</label>
                    <div className="text-sm font-semibold text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">
                      {publicacaoParaVisualizar.taxa_credenciamento !== null ? `${Number(publicacaoParaVisualizar.taxa_credenciamento).toFixed(2)}%` : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rede Credenciada Exigida</label>
                  <div className="text-sm text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">
                    {publicacaoParaVisualizar.qtd_rede_cred || "-"}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Capacidade Técnica</label>
                  <div className="text-sm text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 mt-1">
                    {publicacaoParaVisualizar.capacidade_tecnica || "-"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Status / Fase</label>
                    <div className="text-sm font-bold text-indigo-700 bg-indigo-50 p-2.5 rounded-md border border-indigo-100 mt-1 text-center">
                      {publicacaoParaVisualizar.status_fase || "-"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">POC</label>
                    <div className="text-sm font-bold text-slate-600 bg-slate-100 p-2.5 rounded-md border border-slate-200 mt-1 text-center">
                      {publicacaoParaVisualizar.poc ? publicacaoParaVisualizar.poc.toUpperCase() : "-"}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
          
          <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
            <Button variant="outline" onClick={() => setPublicacaoParaVisualizar(null)} className="font-semibold text-slate-600 shadow-sm hover:bg-slate-100">
              Fechar
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