"use client";

import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { 
  Loader2, DollarSign, FileText, ChevronDown, ChevronRight, LayoutGrid, 
  Filter, Pencil, Trash2, AlertTriangle, 
  // ✨ NOVOS ÍCONES IMPORTADOS AQUI
  Fuel, Wrench, Flame, ShoppingCart, Utensils, Building, 
  Theater, BookOpen, Bus, MapPin, Activity, PackageOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import { NovoFaturamentoModal } from "@/components/novo-faturamento-modal";
import { EditarFaturamentoModal } from "@/components/editar-faturamento-modal";

const ESTADOS_BR = [
  "BA", "CE", "DF", "GO", "MA", "MG", 
  "PE", "PI", "RN", "SP"
];

// ✨ NOVO: Função inteligente que retorna o Ícone e a Cor baseada no Módulo
const getModuloEstilo = (modulo: string) => {
  const frota = ["ABASTECIMENTO", "MANUTENÇÃO", "TELEMETRIA"];
  const beneficios = ["ALIMENTAÇÃO", "REFEIÇÃO", "GÁS", "EDUCAÇÃO", "CULTURA", "SAÚDE"];
  
  let corBase, bgAtivo, textoAtivo;

  // Mantém o padrão de cores por Categoria
  if (frota.includes(modulo)) {
    corBase = "text-blue-500"; bgAtivo = "bg-blue-50/50 border-blue-100"; textoAtivo = "text-blue-700";
  } else if (beneficios.includes(modulo)) {
    corBase = "text-emerald-500"; bgAtivo = "bg-emerald-50/50 border-emerald-100"; textoAtivo = "text-emerald-700";
  } else {
    corBase = "text-purple-500"; bgAtivo = "bg-purple-50/50 border-purple-100"; textoAtivo = "text-purple-700";
  }

  // ✨ Define o ícone específico de cada produto
  let icone = PackageOpen; // Padrão
  switch (modulo) {
    case "ABASTECIMENTO": icone = Fuel; break;
    case "MANUTENÇÃO": icone = Wrench; break;
    case "GÁS": icone = Flame; break;
    case "ALIMENTAÇÃO": icone = ShoppingCart; break;
    case "REFEIÇÃO": icone = Utensils; break;
    case "PATRIMÔNIO": icone = Building; break;
    case "CULTURA": icone = Theater; break;
    case "EDUCAÇÃO": icone = BookOpen; break;
    case "TRANSPORTE": icone = Bus; break;
    case "TELEMETRIA": icone = MapPin; break;
    case "SAÚDE": icone = Activity; break;
  }

  return { icone, corBase, bgAtivo, textoAtivo };
};

export default function FaturamentoPage() {
  const { isInterno, authLoading } = useAuth();
  const [faturamentos, setFaturamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filtroMes, setFiltroMes] = useState("");
  const [filtroUF, setFiltroUF] = useState("TODOS");
  const [filtroLicenciado, setFiltroLicenciado] = useState("");

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [grupoParaEditar, setGrupoParaEditar] = useState<any>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [grupoParaDeletar, setGrupoParaDeletar] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFaturamentos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("faturamentos")
        .select("*")
        .order("mes_referencia", { ascending: false })
        .order("estado", { ascending: true })
        .order("modulo", { ascending: true }); 

      if (error) throw error;
      setFaturamentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar faturamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchFaturamentos();
    }
  }, [authLoading]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const filtrados = faturamentos.filter((fat) => {
    let match = true;
    if (filtroMes && fat.mes_referencia !== filtroMes) match = false;
    if (filtroUF !== "TODOS" && fat.estado !== filtroUF) match = false;
    if (filtroLicenciado && !fat.licenciado?.toLowerCase().includes(filtroLicenciado.toLowerCase())) match = false;
    return match;
  });

  const agrupados = Object.values(
    filtrados.reduce((acc: Record<string, any>, fat: any) => {
      const key = `${fat.mes_referencia}_${fat.estado}_${fat.licenciado}`;
      
      if (!acc[key]) {
        acc[key] = {
          id: key,
          mes_referencia: fat.mes_referencia,
          estado: fat.estado,
          licenciado: fat.licenciado,
          valorTotal: 0,
          modulosAtivos: 0,
          totalModulos: 0,
          detalhes: []
        };
      }
      
      const valorNum = Number(fat.valor || 0);
      acc[key].valorTotal += valorNum;
      acc[key].totalModulos++;
      if (valorNum > 0) acc[key].modulosAtivos++;
      
      acc[key].detalhes.push(fat);
      return acc;
    }, {})
  );

  const confirmarExclusao = async () => {
    if (!grupoParaDeletar) return;
    setIsDeleting(true);
    try {
      const idsParaDeletar = grupoParaDeletar.detalhes.map((det: any) => det.id);
      const { error } = await supabase.from("faturamentos").delete().in("id", idsParaDeletar);
      if (error) throw error;
      
      setFaturamentos((prev) => prev.filter((fat) => !idsParaDeletar.includes(fat.id)));
      setIsDeleteModalOpen(false);
      setGrupoParaDeletar(null);
    } catch (error) {
      console.error("Erro ao excluir faturamento:", error);
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Faturamento da Rede
            </h1>
            <p className="text-sm text-slate-500">Gestão global de receita e performance de licenciados.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <Input 
              type="month" 
              lang="pt-BR"
              value={filtroMes} 
              onChange={(e) => setFiltroMes(e.target.value)} 
              className="border-none h-8 shadow-none focus-visible:ring-0 w-full sm:w-[130px] p-0" 
              title="Filtrar por Mês"
            />
          </div>

          <Select value={filtroUF} onValueChange={setFiltroUF}>
            <SelectTrigger className="bg-white border-slate-200 h-11 w-full sm:w-[120px]">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas UFs</SelectItem>
              {ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input 
            placeholder="Buscar licenciado..." 
            value={filtroLicenciado}
            onChange={(e) => setFiltroLicenciado(e.target.value)}
            className="bg-white border-slate-200 h-11 w-full sm:w-[220px]"
          />
          
          <NovoFaturamentoModal onSuccess={fetchFaturamentos} />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table className="w-full min-w-[1000px]">
            <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[10%] py-4 font-bold text-slate-700 text-center">MÊS REF.</TableHead>
                <TableHead className="w-[8%] py-4 font-bold text-slate-700 text-center">UF</TableHead>
                <TableHead className="w-[28%] py-4 font-bold text-slate-700">LICENCIADO</TableHead>
                <TableHead className="w-[12%] py-4 font-bold text-slate-700 text-center">MÓDULOS ATIVOS</TableHead>
                <TableHead className="w-[20%] py-4 font-bold text-slate-700 text-right pr-6">FATURAMENTO TOTAL</TableHead>
                <TableHead className="w-[12%] py-4 font-bold text-slate-700 text-center">AÇÕES</TableHead>
                <TableHead className="w-[10%] py-4 font-bold text-slate-700 text-center">DETALHES</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : agrupados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FileText className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhum faturamento encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                agrupados.map((grupo: any) => {
                  const isExpanded = expandedRows.has(grupo.id);

                  return (
                    <Fragment key={grupo.id}>
                      <TableRow 
                        onClick={() => toggleRow(grupo.id)}
                        className={`cursor-pointer transition-all duration-200 group relative ${isExpanded ? 'bg-blue-50/50 border-b-transparent shadow-sm z-10' : 'hover:bg-blue-50/50 hover:shadow-sm border-b-slate-100 hover:z-10'}`}
                      >
                        <TableCell className="text-center font-bold text-slate-700">
                          {grupo.mes_referencia ? grupo.mes_referencia.split('-').reverse().join('/') : "-"}
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100">
                            {grupo.estado}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-800 uppercase text-sm">
                            {grupo.licenciado || "NÃO INFORMADO"}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                            <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs font-bold text-slate-700">{grupo.modulosAtivos} / {grupo.totalModulos}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-black text-blue-700 pr-6 text-base tracking-tight">
                          R$ {grupo.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => { setGrupoParaEditar(grupo); setIsEditModalOpen(true); }}
                              className="p-2 text-blue-700 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              title="Editar Faturamentos"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => { setGrupoParaDeletar(grupo); setIsDeleteModalOpen(true); }}
                              className="p-2 text-red-700 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Excluir Lançamento Completo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <button className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          </button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-slate-50/80 border-b border-slate-200">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-5 mx-4 my-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalhamento por Módulo</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {grupo.detalhes.map((det: any) => {
                                  const isActive = Number(det.valor) > 0;
                                  // ✨ Usando a função para pegar o ícone dinâmico!
                                  const EstiloModulo = getModuloEstilo(det.modulo);
                                  const Icone = EstiloModulo.icone;
                                  
                                  return (
                                    <div key={det.id} className={`flex flex-col justify-center p-3 rounded-lg border ${isActive ? EstiloModulo.bgAtivo : 'bg-slate-50/50 border-slate-100'}`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{det.modulo}</span>
                                        {/* ✨ Ícone renderizado à direita do texto */}
                                        <Icone className={`h-3.5 w-3.5 ${isActive ? EstiloModulo.corBase : 'text-slate-300'}`} />
                                      </div>
                                      <span className={`text-sm font-black ${isActive ? EstiloModulo.textoAtivo : 'text-slate-400'}`}>
                                        R$ {Number(det.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EditarFaturamentoModal 
        grupo={grupoParaEditar}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTimeout(() => setGrupoParaEditar(null), 200); 
        }}
        onSuccess={fetchFaturamentos}
      />

      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && !isDeleting && setIsDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-md p-6 shadow-2xl rounded-2xl border-0">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-red-100 p-3 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Excluir Lançamentos</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm text-slate-500 pt-3 leading-relaxed">
              Tem certeza que deseja excluir toda a matriz de faturamento de <strong className="text-slate-800">{grupoParaDeletar?.licenciado}</strong> referente a <strong className="text-slate-800">{grupoParaDeletar?.mes_referencia?.split('-').reverse().join('/')}</strong>?
              <br/><br/>
              Esta ação removerá os 11 módulos de uma vez e <strong className="text-red-600 font-bold">não pode ser desfeita</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="border-slate-200 text-slate-600 font-semibold">
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmarExclusao} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-[120px]">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : "Sim, Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}