"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Clock, User, CalendarDays, Lock, Unlock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const QUALIFICACOES = [
  "Transacionando", "Disputando", "Tramitando", 
  "Quente", "Morna", "Fria", "Agendada"
];

interface RegistroDetalhesModalProps {
  registro: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistroDetalhesModal({ registro, isOpen, onClose, onSuccess }: RegistroDetalhesModalProps) {
  const { isInterno, user } = useAuth(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);

  const [qualificacao, setQualificacao] = useState("");
  const [diaVisita, setDiaVisita] = useState("");
  const [numero, setNumero] = useState("");

  const [decisor, setDecisor] = useState(""); 
  const [referencia, setReferencia] = useState(""); 
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState(""); 
  const [vigencia, setVigencia] = useState("");
  const [habitantes, setHabitantes] = useState("");
  const [taxa, setTaxa] = useState(""); 
  const [objeto, setObjeto] = useState("");

  const isExterno = !isInterno;

  useEffect(() => {
    if (registro && isOpen) {
      const timer = setTimeout(() => {
        // Garante que é sempre um array válido
        setNotas(Array.isArray(registro.historico_notas) ? registro.historico_notas : []);
        setQualificacao(registro.qualificacao || "");
        setDiaVisita(registro.dia_visita || "");
        
        setDecisor(registro.decisor || "");
        setReferencia(registro.referencia || "");
        setFornecedor(registro.fornecedor || "");
        
        const numLimpo = registro.numero !== null && registro.numero !== undefined 
          ? String(registro.numero).replace(/\.0+$/, "") 
          : "";
        setNumero(numLimpo);
        
        setValor(
          registro.valor !== null && registro.valor !== undefined 
            ? Number(registro.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) 
            : ""
        );

        setVigencia(registro.vigencia || "");
        setHabitantes(registro.habitantes !== null && registro.habitantes !== undefined ? String(registro.habitantes) : "");
        setTaxa(registro.taxa !== null && registro.taxa !== undefined ? String(registro.taxa) : "");
        setObjeto(registro.objeto || "");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [registro, isOpen]);

  const handleSalvarAlteracoes = async () => {
    if (!registro) return;
    
    if (isExterno && (!diaVisita || diaVisita.trim() === "")) {
      alert("⚠️ Ação Requerida\n\nVocê precisa preencher a 'Data' da visita antes de salvar as alterações.");
      return;
    }

    setIsSubmitting(true);

    try {
      const emailUsuario = user?.email || "Usuario Nao Identificado";

      const mudancas = [];
      const qualificacaoAntiga = registro.qualificacao || "Pendente";
      const qualificacaoNova = qualificacao || "Pendente";
      
      if (qualificacaoAntiga !== qualificacaoNova) {
        mudancas.push(`Qualificação de [${qualificacaoAntiga}] para [${qualificacaoNova}]`);
      }

      const tratarData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : "Não informada";
      const diaVisitaAntigo = tratarData(registro.dia_visita); 
      const diaVisitaNovo = tratarData(diaVisita);

      if (diaVisitaAntigo !== diaVisitaNovo) {
        mudancas.push(`Data de [${diaVisitaAntigo}] para [${diaVisitaNovo}]`);
      }

      const novasEntradas = [];

      if (mudancas.length > 0) {
        const systemNote = `[SISTEMA]: Registro atualizado. ${mudancas.join(" | ")}`;
        novasEntradas.push({
          id: crypto.randomUUID(),
          texto: systemNote,
          autor: emailUsuario,
          data: new Date().toISOString(),
        });
      }

      // ✨ FUNDAMENTAL: Garantir a estrutura JSON exata para o Supabase não rejeitar a alteração
      const historicoAtualizado = [...novasEntradas, ...notas];

      // Esse é o pacote base que TANTO o Interno quanto o Externo TÊM PERMISSÃO para editar
      const pacoteDeAtualizacao: any = {
        qualificacao: qualificacao,
        dia_visita: diaVisita || null,
        historico_notas: historicoAtualizado, // Sobrescreve o array JSONB
      };

      // Se for Interno, ele tem poder supremo para alterar os outros campos também
      if (isInterno) {
        pacoteDeAtualizacao.decisor = decisor;
        pacoteDeAtualizacao.numero = numero;
        pacoteDeAtualizacao.referencia = referencia;
        pacoteDeAtualizacao.fornecedor = fornecedor;
        pacoteDeAtualizacao.valor = valor ? Number(valor.replace(/\D/g, "")) / 100 : null;
        pacoteDeAtualizacao.vigencia = vigencia || null;
        pacoteDeAtualizacao.habitantes = habitantes ? Number(habitantes) : null;
        pacoteDeAtualizacao.taxa = taxa !== "" ? Number(taxa) : null;
        pacoteDeAtualizacao.objeto = objeto;
      }

      // ✨ Realiza a atualização exigindo retorno (select) para garantir que o RLS permitiu
      const { data, error: updateError } = await supabase
        .from("registros")
        .update(pacoteDeAtualizacao)
        .eq("id", registro.id)
        .select();

      if (updateError) {
        throw updateError;
      }
      
      // Se não retornar data, significa que a política de segurança bloqueou silenciosamente
      if (!data || data.length === 0) {
        throw new Error("Permissão negada. Você não tem autorização para alterar este registro.");
      }

      if (mudancas.length > 0) {
        const detalhesAuditoria = `Alterou o contrato de ${registro.local} (${registro.estado}). Alterações: ${mudancas.join("; ")}.`;
        
        const { error: auditError } = await supabase.from("auditoria").insert([{
          usuario_email: emailUsuario,
          acao: "EDIÇÃO",
          detalhes: detalhesAuditoria
        }]);

        if (auditError) {
          console.warn("Aviso na auditoria (o registro principal foi salvo):", auditError);
        }
      }

      setNotas(historicoAtualizado);
      onSuccess(); // Dispara o recarregamento na página pai (registros/page.tsx)
      onClose(); // Fecha o modal imediatamente para parecer mais rápido
      
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registro) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[1200px] !w-[95vw] max-h-[95vh] p-0 flex flex-col bg-slate-50 shadow-2xl overflow-hidden rounded-xl border-0">
        
        <button type="button" autoFocus className="sr-only"></button>

        <DialogHeader className="p-5 pb-3 bg-white border-b border-slate-200 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center justify-between">
            <span>{registro.local} - {registro.estado}</span>
            {isExterno ? (
               <span className="text-xs bg-slate-100 text-slate-500 px-3 py-2 rounded-md border flex items-center gap-1"><Lock className="w-3 h-3"/> Leitura Parcial</span>
            ) : (
               <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-2 rounded-md border border-emerald-200 flex items-center gap-1"><Unlock className="w-3 h-3"/> Modo Administrador</span>
            )}
          </DialogTitle>
          <p className="text-blue-600 font-semibold text-xs truncate mt-0.5" title={registro.objeto}>
            {registro.objeto || "Sem objeto definido"}
          </p>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
          
          <div className="h-full lg:col-span-3 border-r border-slate-200 bg-slate-50/50 p-5 overflow-y-auto custom-scrollbar">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  Dados do Município / Contrato 
                  {isExterno && <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">Somente Leitura</span>}
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome I</label>
                    <Input title={decisor} disabled={isExterno} value={decisor} onChange={(e) => setDecisor(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Número</label>
                    <Input title={numero} disabled={isExterno} value={numero} onChange={(e) => setNumero(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome II</label>
                    <Input title={referencia} disabled={isExterno} value={referencia} onChange={(e) => setReferencia(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fornecedor Atual</label>
                    <Input title={fornecedor} disabled={isExterno} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Estimado</label>
                    <Input 
                      type="text" 
                      disabled={isExterno} 
                      value={valor} 
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (!v) {
                          setValor("");
                          return;
                        }
                        const num = parseInt(v, 10) / 100;
                        setValor(num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
                      }} 
                      className="bg-slate-50/50 text-emerald-700 text-xs font-bold disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vigência</label>
                    <Input type={isExterno ? "text" : "date"} disabled={isExterno} value={isExterno ? (vigencia ? new Date(vigencia).toLocaleDateString('pt-BR') : "-") : vigencia.split('T')[0]} onChange={(e) => setVigencia(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Habitantes</label>
                    <Input type="number" disabled={isExterno} value={habitantes} onChange={(e) => setHabitantes(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Taxa (%)</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      disabled={isExterno} 
                      value={taxa} 
                      onChange={(e) => setTaxa(e.target.value)} 
                      className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-9 border-slate-200 px-2" 
                    />
                  </div>
                </div>
                
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Objeto Completo</label>
                  <Textarea disabled={isExterno} value={objeto} onChange={(e) => setObjeto(e.target.value)} className="bg-slate-50/50 text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 resize-none min-h-[60px] border-slate-200 p-2.5" />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  Gestão do Registro (Liberado)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">Qualificação</label>
                    <Select value={qualificacao} onValueChange={(value) => setQualificacao(value ?? "")}>
                      <SelectTrigger className="border-slate-300 bg-white h-10 text-sm">
                        <SelectValue placeholder="Selecione o status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALIFICACOES.map((q) => (
                          <SelectItem key={q} value={q} className="text-sm">{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-500" /> Data {isExterno && <span className="text-rose-500">*</span>}
                    </label>
                    <Input 
                      type="date" 
                      value={diaVisita} 
                      onChange={(e) => setDiaVisita(e.target.value)}
                      className={`border-slate-300 bg-white h-10 text-sm ${isExterno && (!diaVisita || diaVisita.trim() === "") ? 'ring-1 ring-rose-500 border-rose-500' : ''}`}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button 
                  onClick={handleSalvarAlteracoes} 
                  disabled={isSubmitting} 
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white h-11 font-bold text-sm shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando Alterações...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Guardar Registro</>
                  )}
                </Button>
              </div>

            </div>
          </div>

          <div className="flex flex-col h-full bg-white relative lg:col-span-2">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shadow-sm z-10">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Histórico de Interações
              </h3>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">{notas.length} notas</span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 pb-8">
                {notas.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm flex flex-col items-center">
                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                    Nenhum registro de interação.<br/>As atualizações aparecerão aqui.
                  </div>
                ) : (
                  notas.map((nota) => (
                    <div key={nota.id} className={`p-3.5 rounded-xl shadow-sm border text-xs ${nota.texto.startsWith('[SISTEMA]') ? 'bg-slate-50 border-slate-200 text-slate-500 italic' : 'bg-blue-50/40 border-blue-100 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{nota.texto}</p>
                      <Separator className="my-2 opacity-50" />
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <span className="flex items-center gap-1.5 truncate"><User className="h-3 w-3 shrink-0" /> {nota.autor}</span>
                        <span className="flex items-center gap-1.5 shrink-0"><Clock className="h-3 w-3" /> {new Date(nota.data).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}