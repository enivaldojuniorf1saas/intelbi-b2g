"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

// Validação do Formulário
const publicacaoSchema = z.object({
  data_publicacao: z.string().min(1, "Data de publicação é obrigatória"),
  cliente: z.string().min(3, "Mínimo de 3 caracteres"),
  objeto: z.string().min(3, "Mínimo de 3 caracteres"),
  abertura: z.string().min(1, "Data de abertura é obrigatória"),
  valor: z.number().min(0, "Valor inválido").optional(),
});

type PublicacaoInput = z.infer<typeof publicacaoSchema>;

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function NovaPublicacaoModal({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PublicacaoInput>({
    resolver: zodResolver(publicacaoSchema),
    defaultValues: {
      data_publicacao: "",
      cliente: "",
      objeto: "",
      abertura: "",
      valor: undefined,
    },
  });

  const onSubmit = async (data: PublicacaoInput) => {
    setIsSubmitting(true);
    try {
      // Insere na nova tabela 'publicacoes'
      const { error } = await supabase.from("publicacoes").insert([data]);
      if (error) throw error;

      form.reset();
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar publicação:", error);
      alert("Erro ao salvar o registro. Verifique se a tabela 'publicacoes' foi criada no Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Publicação
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[700px] p-6 shadow-2xl rounded-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-slate-900">Cadastrar Oportunidade</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Preencha os dados da nova publicação mapeada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
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

            <FormField control={form.control} name="cliente" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-slate-700">Cliente / Órgão</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: PREFEITURA DE TAQUARITINGA..." className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
              </FormItem>
            )}/>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="objeto" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs font-bold text-slate-700">Objeto (Edital)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PE 0001/2025 ALIMENTAÇÃO" className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                </FormItem>
              )}/>

              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem>
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
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="mr-2 text-slate-500">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] font-bold">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Publicação"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}