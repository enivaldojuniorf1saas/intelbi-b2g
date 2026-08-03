"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Search, FileText, LayoutList } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// O modal que acabamos de criar
import { NovaPublicacaoModal } from "@/components/nova-publicacao-modal";

export default function PublicadosPage() {
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  const [publicacoes, setPublicacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPublicacoes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("publicacoes")
        .select("*")
        .order("abertura", { ascending: true }); // Ordena pelas aberturas mais próximas

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
  }, [authLoading]);

  // Filtro de busca (Cliente ou Objeto)
  const filtrados = publicacoes.filter((pub) => {
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      (pub.cliente && pub.cliente.toLowerCase().includes(termo)) ||
      (pub.objeto && pub.objeto.toLowerCase().includes(termo))
    );
  });

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200">
            <LayoutList className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Publicações e Editais</h1>
            <p className="text-sm text-slate-500">Mapeamento de novas oportunidades e aberturas.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente ou objeto..." 
              className="pl-9 bg-white border-slate-200 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Botão de Modal apenas para a equipe interna */}
          {isInterno && <NovaPublicacaoModal onSuccess={fetchPublicacoes} />}
        </div>
      </div>

      {/* Tabela de Oportunidades */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table className="w-full min-w-[1000px]">
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[12%] py-4 font-bold text-slate-700 text-center">DATA DA PUBLICAÇÃO</TableHead>
                <TableHead className="w-[38%] py-4 font-bold text-slate-700">CLIENTE</TableHead>
                <TableHead className="w-[20%] py-4 font-bold text-slate-700">OBJETO</TableHead>
                <TableHead className="w-[15%] py-4 font-bold text-slate-700 text-center">ABERTURA</TableHead>
                <TableHead className="w-[15%] py-4 font-bold text-slate-700 text-right pr-6">VALOR</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FileText className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhuma publicação encontrada.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((pub) => (
                  <TableRow key={pub.id} className="hover:bg-emerald-50/40 transition-colors border-b border-slate-100">
                    
                    <TableCell className="text-center font-medium text-slate-600">
                      {pub.data_publicacao ? new Date(`${pub.data_publicacao}T00:00:00`).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-bold text-slate-800 line-clamp-2 leading-tight" title={pub.cliente}>
                        {pub.cliente}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm font-semibold text-blue-600 line-clamp-2 bg-blue-50/50 inline-block px-2 py-1 rounded" title={pub.objeto}>
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

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Rodapé da tabela */}
        {!isLoading && filtrados.length > 0 && (
          <div className="bg-slate-50 p-3 border-t border-slate-200 text-sm text-slate-500 font-medium shrink-0 flex justify-between items-center">
            <span>Mostrando <strong className="text-slate-800">{filtrados.length}</strong> publicações mapeadas.</span>
          </div>
        )}
      </div>

    </div>
  );
}