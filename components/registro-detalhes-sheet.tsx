"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Send, Clock, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { registroSchema, RegistroInput } from "@/lib/validations/registro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

interface RegistroDetalhesSheetProps {
  registro: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistroDetalhesSheet({ registro, isOpen, onClose, onSuccess }: RegistroDetalhesSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [notas, setNotas] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const form = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      estado: "", local: "", decisor: "", numero: "", referencia: "",
      objeto: "", valor: undefined, vigencia: "", fornecedor: "",
      taxa: undefined, regiao: "", habitantes: undefined, distancia_km: undefined,
      qualificacao: "", data_evento: "", alerta: ""
    },
  });

  // Preenche o formulário e as notas assim que um registro é selecionado
  useEffect(() => {
    if (registro) {
      form.reset({
        ...registro,
        // Converte valores nulos para strings vazias/undefined para o formulário não reclamar
        valor: registro.valor || undefined,
        taxa: registro.taxa || undefined,
        habitantes: registro.habitantes || undefined,
        distancia_km: registro.distancia_km || undefined,
      });
      // Carrega o histórico de notas (se existir, senão array vazio)
      setNotas(registro.historico_notas || []);
    }
  }, [registro, form]);

  // Busca quem é o usuário logado para assinar a nota
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
    };
    fetchUser();
  }, []);

  const onSubmitEdicao = async (data: RegistroInput) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("registros")
        .update(data)
        .eq("id", registro.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar o registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdicionarNota = async () => {
    if (!novaNota.trim() || !currentUser) return;

    const novaEntrada = {
      id: crypto.randomUUID(),
      texto: novaNota,
      autor: currentUser.email,
      data: new Date().toISOString(),
    };

    const historicoAtualizado = [novaEntrada, ...notas];

    try {
      const { error } = await supabase
        .from("registros")
        .update({ historico_notas: historicoAtualizado })
        .eq("id", registro.id);

      if (error) throw error;

      setNotas(historicoAtualizado);
      setNovaNota("");
      onSuccess(); // Para atualizar a lista por trás
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* max-w-[600px] deixa o painel com uma largura excelente para ler e escrever */}
      <SheetContent className="sm:max-w-[600px] w-[90vw] p-0 flex flex-col bg-slate-50">
        
        <SheetHeader className="p-6 pb-2 bg-white border-b border-slate-200">
          <SheetTitle className="text-xl font-bold text-slate-800">
            {registro?.local} - {registro?.estado}
          </SheetTitle>
          <SheetDescription className="text-blue-600 font-semibold truncate">
            {registro?.objeto || "Sem objeto definido"}
          </SheetDescription>
        </SheetHeader>

        {/* Usamos as TABS para separar Edição de Dados vs Histórico de Notas */}
        <Tabs defaultValue="notas" className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white px-6 pt-2 border-b border-slate-200">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100">
              <TabsTrigger value="notas">Histórico e Notas</TabsTrigger>
              <TabsTrigger value="editar">Editar Dados</TabsTrigger>
            </TabsList>
          </div>

          {/* ==========================================
              ABA 1: NOTAS E CRM
          ========================================== */}
          <TabsContent value="notas" className="flex-1 flex flex-col p-0 m-0 overflow-hidden">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {notas.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm">
                    Nenhuma nota registrada ainda. Comece o histórico!
                  </div>
                ) : (
                  notas.map((nota) => (
                    <div key={nota.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{nota.texto}</p>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {nota.autor}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(nota.data).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Caixa de Escrever Nova Nota (Fica grudada no fundo) */}
            <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <Textarea 
                placeholder="Adicione uma nota sobre este registro..."
                className="resize-none border-slate-300 focus-visible:ring-blue-500 min-h-[80px] text-sm"
                value={novaNota}
                onChange={(e) => setNovaNota(e.target.value)}
              />
              <div className="flex justify-end mt-3">
                <Button 
                  onClick={handleAdicionarNota} 
                  disabled={!novaNota.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" /> Registrar Nota
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ==========================================
              ABA 2: EDIÇÃO DO REGISTRO
          ========================================== */}
          <TabsContent value="editar" className="flex-1 overflow-auto p-6 m-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitEdicao)} className="space-y-5 pb-20">
                
                <FormField control={form.control} name="objeto" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Objeto</FormLabel>
                    <FormControl><Input className="bg-white text-sm h-10" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="valor" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Valor (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="bg-white text-sm h-10" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                      </FormControl>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="vigencia" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Vigência</FormLabel>
                      <FormControl><Input type="date" className="bg-white text-sm h-10" {...field} value={field.value || ""} /></FormControl>
                    </FormItem>
                  )}/>
                </div>

                <FormField control={form.control} name="fornecedor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Fornecedor</FormLabel>
                    <FormControl><Input className="bg-white text-sm h-10" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="qualificacao" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Qualificação</FormLabel>
                    <FormControl><Input className="bg-white text-sm h-10" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                {/* Coloquei apenas os campos principais para edição rápida, mas você pode adicionar os outros do modal aqui se quiser! */}

                <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 mt-4">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
                </Button>
              </form>
            </Form>
          </TabsContent>

        </Tabs>
      </SheetContent>
    </Sheet>
  );
}