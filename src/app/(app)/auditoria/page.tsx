"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Loader2, Search, Clock, User, Activity, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AuditoriaPage() {
  const { isInterno } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    setLoading(true);
    try {
      // Puxa os últimos 200 registros de auditoria, ordenando do mais novo pro mais antigo
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao buscar auditoria:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtro inteligente em tempo real
  const logsFiltrados = logs.filter(log => {
    const termo = busca.toLowerCase();
    return (
      (log.acao && log.acao.toLowerCase().includes(termo)) ||
      (log.usuario_email && log.usuario_email.toLowerCase().includes(termo)) ||
      (log.detalhes && log.detalhes.toLowerCase().includes(termo))
    );
  });

  // Proteção da Rota: Apenas Gestão (Perfil Interno) pode acessar essa tela
  if (!isInterno) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium flex items-center justify-center h-screen flex-col">
        <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl text-slate-700">Acesso Negado</h2>
        <p className="text-sm">Área restrita à Gestão de Segurança e Administradores.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl border border-indigo-200">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Auditoria de Sistema</h1>
            <p className="text-sm text-slate-500">Rastreamento de ações, atualizações e acessos na plataforma.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por e-mail, ação ou detalhe..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-11 bg-white border-slate-300 w-full"
            />
          </div>
          <Button 
            onClick={carregarLogs} 
            disabled={loading}
            variant="outline"
            className="h-11 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            title="Atualizar Logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ÁREA DA TABELA */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin mb-3 text-indigo-500" />
              <p className="font-medium">Buscando rastros do sistema...</p>
            </div>
          ) : logsFiltrados.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-48 font-bold text-slate-700">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> DATA / HORA</div>
                  </TableHead>
                  <TableHead className="w-56 font-bold text-slate-700">
                    <div className="flex items-center gap-2"><User className="h-4 w-4" /> USUÁRIO</div>
                  </TableHead>
                  <TableHead className="w-32 font-bold text-slate-700">
                    <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> AÇÃO</div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">DETALHES DA MUDANÇA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsFiltrados.map((log) => (
                  <TableRow key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                    
                    <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </TableCell>
                    
                    <TableCell className="text-xs font-semibold text-slate-800 truncate max-w-[200px]" title={log.usuario_email}>
                      {log.usuario_email || "Sistema"}
                    </TableCell>
                    
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                        ${log.acao === 'EDIÇÃO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          log.acao === 'IMPORTAÇÃO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          'bg-indigo-50 text-indigo-700 border-indigo-200'}
                      `}>
                        {log.acao}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-xs text-slate-600 leading-relaxed">
                      {log.detalhes}
                    </TableCell>
                    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShieldCheck className="h-12 w-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">Nenhum registro encontrado.</p>
              {busca && <p className="text-sm mt-1">Tente usar outros termos na sua busca.</p>}
            </div>
          )}

        </div>
        
        {/* RODAPÉ DA TABELA */}
        {!loading && logsFiltrados.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-3 shrink-0 text-xs font-medium text-slate-500 flex justify-between items-center">
            <span>Exibindo {logsFiltrados.length} log(s)</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Ambiente Monitorado</span>
          </div>
        )}
      </div>
    </div>
  );
}