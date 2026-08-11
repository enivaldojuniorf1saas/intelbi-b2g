"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Search, FileText, LayoutList, Pencil, Trash2, AlertTriangle, MapPin } from "lucide-react";
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

import { NovaPublicacaoModal } from "@/components/nova-publicacao-modal";
import { EditarPublicacaoModal } from "@/components/editar-publicacao-modal"; 

export default function PublicadosPage() {
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  const [publicacoes, setPublicacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [publicacaoParaEditar, setPublicacaoParaEditar] = useState<any>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [publicacaoParaDeletar, setPublicacaoParaDeletar] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPublicacoes = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("publicacoes").select("*").order("abertura", { ascending: true }); 

      // ✨ INTELIGÊNCIA: Licenciado só puxa as publicações do Estado dele!
      if (!isInterno && profile?.estado_atuacao) {
        query = query.eq("estado", profile.estado_atuacao.trim().toUpperCase());
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
    if (!authLoading) {
      fetchPublicacoes();
    }
  }, [authLoading, isInterno, profile]);

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

  const filtrados = publicacoes.filter((pub) => {
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      (pub.cliente && pub.cliente.toLowerCase().includes(termo)) ||
      (pub.objeto && pub.objeto.toLowerCase().includes(termo)) ||
      (pub.numero && pub.numero.toLowerCase().includes(termo)) ||
      (pub.estado && pub.estado.toLowerCase().includes(termo)) // ✨ Pesquisa por UF também
    );
  });

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200">
            <LayoutList className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Publicações e Editais {(!isInterno && profile?.estado_atuacao) && `- ${profile.estado_atuacao.toUpperCase()}`}
            </h1>
            <p className="text-sm text-slate-500">Mapeamento de novas oportunidades e aberturas.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente, UF, número..." 
              className="pl-9 bg-white border-slate-200 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isInterno && <NovaPublicacaoModal onSuccess={fetchPublicacoes} />}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table className="w-full min-w-[1200px]">
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[10%] py-4 font-bold text-slate-700 text-center">DATA</TableHead>
                {/* ✨ NOVA COLUNA UF */}
                <TableHead className="w-[6%] py-4 font-bold text-slate-700 text-center">UF</TableHead>
                <TableHead className="w-[22%] py-4 font-bold text-slate-700">CLIENTE</TableHead>
                <TableHead className="w-[12%] py-4 font-bold text-slate-700 text-center">NÚMERO</TableHead>
                <TableHead className="w-[18%] py-4 font-bold text-slate-700">OBJETO</TableHead>
                <TableHead className="w-[10%] py-4 font-bold text-slate-700 text-center">ABERTURA</TableHead>
                <TableHead className="w-[10%] py-4 font-bold text-slate-700 text-right pr-6">VALOR</TableHead>
                
                {isInterno && (
                  <TableHead className="w-[12%] py-4 font-bold text-slate-700 text-center">AÇÕES</TableHead>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isInterno ? 8 : 7} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isInterno ? 8 : 7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FileText className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhuma publicação encontrada.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((pub) => (
                  <TableRow key={pub.id} className="hover:bg-emerald-50/40 transition-colors border-b border-slate-100 group">
                    
                    <TableCell className="text-center font-medium text-slate-600">
                      {pub.data_publicacao ? new Date(`${pub.data_publicacao}T00:00:00`).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>

                    {/* ✨ CELULA DA UF */}
                    <TableCell className="text-center">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100">
                        {pub.estado || "-"}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-bold text-slate-800 line-clamp-2 leading-tight" title={pub.cliente}>
                        {pub.cliente}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200 block truncate" title={pub.numero}>
                        {pub.numero || "-"}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm font-semibold text-emerald-600 line-clamp-2 bg-emerald-50/50 inline-block px-2 py-1 rounded" title={pub.objeto}>
                        {pub.objeto}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs">
                        {pub.abertura ? new Date(`${pub.abertura}T00:00:00`).toLocaleDateString("pt-BR") : "-"}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-bold text-emerald-700 pr-6 whitespace-nowrap">
                      {pub.valor ? `R$ ${Number(pub.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </TableCell>

                    {isInterno && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          
                          <button 
                            onClick={() => handleAbrirEdicao(pub)}
                            className="p-2 text-blue-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar Publicação"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleAbrirDelete(pub)}
                            className="p-2 text-red-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir Publicação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                        </div>
                      </TableCell>
                    )}

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {!isLoading && filtrados.length > 0 && (
          <div className="bg-slate-50 p-3 border-t border-slate-200 text-sm text-slate-500 font-medium shrink-0 flex justify-between items-center">
            <span>Mostrando <strong className="text-slate-800">{filtrados.length}</strong> publicações mapeadas.</span>
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