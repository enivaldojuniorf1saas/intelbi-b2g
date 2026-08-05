"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

// Mesma validação do modal de criação
const publicacaoSchema = z.object({
  data_publicacao: z.string().min(1, "Data de publicação é obrigatória"),
  cliente: z.string().min(3, "Mínimo de 3 caracteres"),
  numero: z.string().optional(),
  objeto: z.string().min(3, "Mínimo de 3 caracteres"),
  abertura: z.string().min(1, "Data de abertura é obrigatória"),
  valor: z.number().min(0, "Valor inválido").optional(),
});

type PublicacaoInput = z.infer<typeof publicacaoSchema>;

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

// As Props recebem a publicação que será editada e os controles de abrir/fechar
interface EditarPublicacaoModalProps {
  publicacao: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditarPublicacaoModal({ publicacao, isOpen, onClose, onSuccess }: EditarPublicacaoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para o Box de Feedback (Sucesso/Erro)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const form = useForm<PublicacaoInput>({
    resolver: zodResolver(publicacaoSchema),
    defaultValues: {
      data_publicacao: "",
      cliente: "",
      numero: "",
      objeto: "",
      abertura: "",
      valor: undefined,
    },
  });

  // Preenche o formulário automaticamente quando o modal abre e recebe os dados
  useEffect(() => {
    if (publicacao && isOpen) {
      form.reset({
        data_publicacao: publicacao.data_publicacao || "",
        cliente: publicacao.cliente || "",
        numero: publicacao.numero || "",
        objeto: publicacao.objeto || "",
        abertura: publicacao.abertura || "",
        valor: publicacao.valor !== null ? Number(publicacao.valor) : undefined,
      });
      setFeedback({ type: null, message: '' }); // Limpa feedbacks antigos
    }
  }, [publicacao, isOpen, form]);

  const onSubmit = async (data: PublicacaoInput) => {
    if (!publicacao) return;
    
    setIsSubmitting(true);
    setFeedback({ type: null, message: '' });

    try {
      // Faz o UPDATE no banco, filtrando pelo ID do registro atual
      const { error } = await supabase
        .from("publicacoes")
        .update(data)
        .eq("id", publicacao.id);

      if (error) throw error;

      // Mostra a mensagem de sucesso
      setFeedback({ type: 'success', message: 'A publicação foi atualizada com sucesso!' });

      // Aguarda 2 segundos para o usuário ver o feedback antes de fechar
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao atualizar publicação:", error);
      setFeedback({ type: 'error', message: error.message || "Erro inesperado ao salvar as alterações." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se não houver publicação selecionada, não renderiza nada
  if (!publicacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="p-6 sm:p-8 shadow-2xl rounded-xl"
        style={{ maxWidth: '800px', width: '95vw' }}
      >
        <DialogHeader className="mb-5">
          <DialogTitle className="text-xl font-bold text-slate-900">Editar Publicação</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Altere os dados da publicação abaixo.
          </DialogDescription>
        </DialogHeader>

        {/* BOX DE FEEDBACK */}
        {feedback.type && (
          <div className={`p-4 mb-6 rounded-xl flex items-start gap-3 border transition-all duration-300 ${
            feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {feedback.type === 'error' ? (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
            )}
            <div>
              <h4 className="text-sm font-bold">
                {feedback.type === 'error' ? 'Atenção Necessária' : 'Operação Concluída'}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">{feedback.message}</p>
            </div>
            <button type="button" onClick={() => setFeedback({ type: null, message: '' })} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField control={form.control} name="data_publicacao" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-700">Data da Publicação</FormLabel>
                  <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                </FormItem>
              )}/>

              <FormField control={form.control} name="abertura" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-700">Data de Abertura</FormLabel>
                  <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                </FormItem>
              )}/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              <FormField control={form.control} name="cliente" render={({ field }) => (
                <FormItem className="sm:col-span-9">
                  <FormLabel className="text-xs font-bold text-slate-700">Cliente / Órgão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PREFEITURA DE TAQUARITINGA..." className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                </FormItem>
              )}/>

              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel className="text-xs font-bold text-slate-700">Número</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PE 0001/2025" className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                </FormItem>
              )}/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              <FormField control={form.control} name="objeto" render={({ field }) => (
                <FormItem className="sm:col-span-8">
                  <FormLabel className="text-xs font-bold text-slate-700">Objeto (Edital)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: ALIMENTAÇÃO" className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                </FormItem>
              )}/>

              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem className="sm:col-span-4">
                  <FormLabel className="text-xs font-bold text-slate-700">Valor Estimado (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      className="border-slate-300 h-10 bg-white"
                      value={formatCurrency(field.value)}
                      onChange={(e) => {
                        const digitos = e.target.value.replace(/\D/g, "");
                        if (!digitos) { field.onChange(undefined); return; }
                        field.onChange(parseInt(digitos, 10) / 100);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}/>
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={onClose} className="mr-2 text-slate-500 font-semibold" disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px] font-bold">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Atualizar Publicação"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}