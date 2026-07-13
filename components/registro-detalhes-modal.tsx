"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Clock, User, CalendarDays, MessageSquareText, Lock, Unlock } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [notas, setNotas] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 🛡️ Novo State para guardar a regra de negócio
  const [userProfile, setUserProfile] = useState<string>("externo"); // Bloqueado por padrão por segurança

  // States de Gestão (Editáveis por todos)
  const [qualificacao, setQualificacao] = useState("");
  const [diaVisita, setDiaVisita] = useState("");

  // States de Dados Fixos (Editáveis apenas pelo Interno)
  const [decisor, setDecisor] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [habitantes, setHabitantes] = useState("");
  const [taxa, setTaxa] = useState("");
  const [objeto, setObjeto] = useState("");

  useEffect(() => {
    if (registro) {
      setNotas(registro.historico_notas || []);
      setQualificacao(registro.qualificacao || "");
      setDiaVisita(registro.dia_visita || "");
      setNovaNota(""); 
      
      // Carregando os dados para os inputs (caso o interno queira editar)
      setDecisor(registro.decisor || "");
      setFornecedor(registro.fornecedor || "");
      setValor(registro.valor || "");
      setVigencia(registro.vigencia || "");
      setHabitantes(registro.habitantes || "");
      setTaxa(registro.taxa || "");
      setObjeto(registro.objeto || "");
    }
  }, [registro]);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        
        // 🔍 MÁGICA ACONTECENDO: Vai na tabela de licenciados ver quem é essa pessoa
        const { data: perfilData } = await supabase
          .from("licenciados")
          .select("perfil")
          .eq("id", user.id)
          .single();
          
        if (perfilData) {
          setUserProfile(perfilData.perfil); // Salva se é 'interno' ou 'externo'
        }
      }
    };
    fetchUserAndProfile();
  }, []);

  // 🚦 Variável de controle: É externo? (Se sim, bloqueia)
  const isExterno = userProfile !== "interno";

  const handleSalvarAlteracoes = async () => {
    setIsSubmitting(true);
    try {
      const novasEntradas = [];

      if (currentUser) {
        if (novaNota.trim()) {
          novasEntradas.push({
            id: crypto.randomUUID(),
            texto: novaNota.trim(),
            autor: currentUser.email,
            data: new Date().toISOString(),
          });
        }

        const systemNote = `[SISTEMA]: Registro atualizado. Qualificação: ${qualificacao || 'N/A'}. Visita: ${diaVisita ? new Date(diaVisita).toLocaleDateString('pt-BR') : 'N/A'}.`;
        novasEntradas.push({
          id: crypto.randomUUID(),
          texto: systemNote,
          autor: currentUser.email,
          data: new Date(Date.now() - 1000).toISOString(),
        });
      }

      const historicoAtualizado = [...novasEntradas, ...notas];

      // Prepara o pacote de dados básico que todo mundo pode salvar
      const pacoteDeAtualizacao: any = {
        qualificacao: qualificacao,
        dia_visita: diaVisita || null,
        historico_notas: historicoAtualizado
      };

      // Se o utilizador for 'interno', enviamos as alterações dos outros campos também!
      if (!isExterno) {
        pacoteDeAtualizacao.decisor = decisor;
        pacoteDeAtualizacao.fornecedor = fornecedor;
        pacoteDeAtualizacao.valor = valor ? Number(valor) : null;
        pacoteDeAtualizacao.vigencia = vigencia || null;
        pacoteDeAtualizacao.habitantes = habitantes ? Number(habitantes) : null;
        pacoteDeAtualizacao.taxa = taxa ? Number(taxa) : null;
        pacoteDeAtualizacao.objeto = objeto;
      }

      const { error } = await supabase
        .from("registros")
        .update(pacoteDeAtualizacao)
        .eq("id", registro.id);

      if (error) throw error;
      
      setNotas(historicoAtualizado);
      setNovaNota("");
      onSuccess(); // Recarrega a tabela por trás do modal
      onClose(); // Fecha o modal
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar o registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registro) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[1200px] !w-[95vw] max-h-[95vh] p-0 flex flex-col bg-slate-50 shadow-2xl overflow-hidden rounded-xl border-0">
        
        <DialogHeader className="p-5 pb-3 bg-white border-b border-slate-200 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center justify-between">
            <span>{registro.local} - {registro.estado}</span>
            {/* Etiqueta visual indicando o modo do modal */}
            {isExterno ? (
               <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md border flex items-center gap-1"><Lock className="w-3 h-3"/> Leitura Parcial</span>
            ) : (
               <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1"><Unlock className="w-3 h-3"/> Modo Administrador</span>
            )}
          </DialogTitle>
          <p className="text-blue-600 font-semibold text-xs truncate mt-0.5">
            {registro.objeto || "Sem objeto definido"}
          </p>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
          
          <div className="h-full lg:col-span-3 border-r border-slate-200 bg-slate-50/50 p-5 overflow-y-auto">
            <div className="space-y-4">
              
              {/* ÁREA DE GESTÃO (Sempre Editável) */}
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2 border-b border-blue-50 pb-2">
                  Gestão do Registro (Liberado)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">Qualificação</label>
                    <Select value={qualificacao} onValueChange={(value) => setQualificacao(value ?? "")}>
                      <SelectTrigger className="border-slate-300 bg-white h-9 text-sm">
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
                      <CalendarDays className="h-3.5 w-3.5 text-blue-500" /> Dia da Visita
                    </label>
                    <Input 
                      type="date" 
                      value={diaVisita} 
                      onChange={(e) => setDiaVisita(e.target.value)}
                      className="border-slate-300 bg-white h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <MessageSquareText className="h-3.5 w-3.5 text-blue-500" /> Adicionar Nota
                  </label>
                  <Textarea 
                    placeholder="Escreva o que foi conversado, alinhamentos ou próximos passos..."
                    className="resize-none border-slate-300 focus-visible:ring-blue-500 min-h-[60px] text-sm bg-slate-50/50"
                    value={novaNota}
                    onChange={(e) => setNovaNota(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleSalvarAlteracoes} 
                  disabled={isSubmitting} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 font-bold text-sm mt-1"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Guardar Registo</>
                  )}
                </Button>
              </div>

              {/* ÁREA DOS DADOS DO MUNICÍPIO (Dinâmica: Bloqueada ou Liberada) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  Dados do Município / Contrato 
                  {isExterno && <span className="text-[9px] bg-slate-200 px-2 py-0.5 rounded text-slate-600">Somente Leitura</span>}
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Decisor</label>
                    <Input disabled={isExterno} value={decisor} onChange={(e) => setDecisor(e.target.value)} className="bg-white text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-8 border-slate-200 px-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fornecedor Atual</label>
                    <Input disabled={isExterno} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="bg-white text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-8 border-slate-200 px-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Estimado</label>
                    <Input type="number" disabled={isExterno} value={valor} onChange={(e) => setValor(e.target.value)} className="bg-white text-emerald-700 text-xs font-bold disabled:bg-slate-100/80 disabled:opacity-80 h-8 border-slate-200 px-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vigência</label>
                    {/* Convertendo data para input type date se for interno, senão text */}
                    <Input type={isExterno ? "text" : "date"} disabled={isExterno} value={isExterno ? (vigencia ? new Date(vigencia).toLocaleDateString('pt-BR') : "-") : vigencia.split('T')[0]} onChange={(e) => setVigencia(e.target.value)} className="bg-white text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-8 border-slate-200 px-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Habitantes</label>
                    <Input type="number" disabled={isExterno} value={habitantes} onChange={(e) => setHabitantes(e.target.value)} className="bg-white text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-8 border-slate-200 px-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Taxa (%)</label>
                    <Input type="number" step="0.01" disabled={isExterno} value={taxa} onChange={(e) => setTaxa(e.target.value)} className="bg-white text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 h-8 border-slate-200 px-2" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Objeto Completo</label>
                  <Textarea disabled={isExterno} value={objeto} onChange={(e) => setObjeto(e.target.value)} className="bg-white text-slate-700 text-xs font-medium disabled:bg-slate-100/80 disabled:opacity-80 resize-none min-h-[50px] border-slate-200 p-2" />
                </div>
              </div>

            </div>
          </div>

          {/* COLUNA DIREITA: Histórico */}
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
                    Nenhum registro de interação.<br/>Utilize a área de gestão para iniciar o histórico.
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