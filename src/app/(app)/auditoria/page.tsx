"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, ShieldAlert, History, UserCheck, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock de dados para renderizar a UI enquanto a tabela real de logs não é criada no Supabase
const MOCK_LOGS = [
  { id: 1, usuario: "Carlos Parceiro", estado: "SP", acao: "Acessou o Dashboard", data: "2026-08-03T09:15:00Z", criticidade: "baixa" },
  { id: 2, usuario: "Carlos Parceiro", estado: "SP", acao: "Visualizou registro: Prefeitura de Campinas", data: "2026-08-03T09:18:00Z", criticidade: "baixa" },
  { id: 3, usuario: "Ana Silva", estado: "MG", acao: "Tentativa de acesso negada (Fora da UF)", data: "2026-08-02T14:30:00Z", criticidade: "alta" },
  { id: 4, usuario: "João Santos", estado: "RJ", acao: "Filtrou Mapa Geo por 'Curto Prazo'", data: "2026-08-01T10:05:00Z", criticidade: "baixa" },
];

export default function AuditoriaPage() {
  const { isInterno, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Simulação de carregamento da tabela de auditoria
    const fetchAuditoria = async () => {
      setTimeout(() => {
        setLogs(MOCK_LOGS);
        setIsLoading(false);
      }, 800);
    };

    if (!authLoading && isInterno) {
      fetchAuditoria();
    } else if (!authLoading && !isInterno) {
      setIsLoading(false);
    }
  }, [authLoading, isInterno]);

  // Bloqueio de Segurança: Apenas Internos acessam esta tela
  if (!authLoading && !isInterno) {
    return (
      <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          Esta página é de uso exclusivo da auditoria interna do IntelBI. Seu perfil não tem permissão para visualizar logs de sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2.5 rounded-xl">
            <History className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Auditoria de Externos</h1>
            <p className="text-sm text-slate-500">Rastreamento de movimentações e acessos de parceiros.</p>
          </div>
        </div>
      </div>

      {/* Tabela de Auditoria */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table className="w-full min-w-[800px]">
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[20%] font-bold text-slate-700">Data / Hora</TableHead>
                <TableHead className="w-[25%] font-bold text-slate-700">Usuário Externo</TableHead>
                <TableHead className="w-[45%] font-bold text-slate-700">Ação / Movimentação</TableHead>
                <TableHead className="w-[10%] font-bold text-slate-700 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-slate-500">
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-sm font-medium text-slate-600">
                      {new Date(log.data).toLocaleString("pt-BR")}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-slate-800">{log.usuario}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                          {log.estado}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-sm text-slate-700">
                      {log.acao}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {log.criticidade === "alta" ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                          <AlertTriangle className="h-3 w-3" /> Alerta
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                          Normal
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
    </div>
  );
}