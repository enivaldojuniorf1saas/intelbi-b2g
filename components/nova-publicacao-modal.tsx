"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// ✨ Funções de limpeza e busca
const normalize = (text: string) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const higienizarObjeto = (text: string) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
};

const publicacaoSchema = z.object({
  data_publicacao: z.string().min(1, "Data de publicação é obrigatória"),
  estado: z.string().min(2, "UF é obrigatória"), 
  cliente: z.string().min(3, "Mínimo de 3 caracteres"),
  numero: z.string().optional(),
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

  // ✨ NOVOS ESTADOS PARA O CAMPO 'OBJETO'
  const [objetosDisponiveis, setObjetosDisponiveis] = useState<string[]>([]);
  const [showObjetoDropdown, setShowObjetoDropdown] = useState(false);

  const form = useForm<PublicacaoInput>({
    resolver: zodResolver(publicacaoSchema),
    defaultValues: {
      data_publicacao: "",
      estado: "", 
      cliente: "",
      numero: "", 
      objeto: "",
      abertura: "",
      valor: undefined,
    },
  });

  // ✨ NOVO EFEITO: Busca objetos já cadastrados na tabela 'publicacoes'
  useEffect(() => {
    async function fetchObjetos() {
      if (!isOpen) return; // Só busca se o modal estiver aberto para economizar requisições
      try {
        const { data } = await supabase.from("publicacoes").select("objeto");
        if (data) {
          const uniqueObjetos = Array.from(
            new Set(data.map(r => higienizarObjeto(r.objeto)).filter(Boolean))
          ).sort();
          setObjetosDisponiveis(uniqueObjetos);
        }
      } catch (error) {
        console.error("Erro ao carregar objetos:", error);
      }
    }
    fetchObjetos();
  }, [isOpen]);

  const onSubmit = async (data: PublicacaoInput) => {
    setIsSubmitting(true);
    try {
      // ✨ SANITIZAÇÃO ANTES DE SALVAR NO BANCO
      if (data.objeto) {
        data.objeto = higienizarObjeto(data.objeto);
      }

      const { error } = await supabase.from("publicacoes").insert([data]);
      if (error) throw error;

      form.reset();
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar publicação:", error);
      alert("Erro ao salvar o registro. Verifique se as colunas 'numero' e 'estado' existem no Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition">
          <Plus className="mr-2 h-4 w-4" /> Nova Publicação
        </button>
      } />
      
      <DialogContent 
        className="p-6 sm:p-8 shadow-2xl rounded-xl"
        style={{ maxWidth: '800px', width: '95vw' }}
      >
        <DialogHeader className="mb-5">
          <DialogTitle className="text-xl font-bold text-slate-900">Cadastrar Oportunidade</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Preencha os dados da nova publicação mapeada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              <FormField control={form.control} name="data_publicacao" render={({ field }) => (
                <FormItem className="sm:col-span-4">
                  <FormLabel className="text-xs font-bold text-slate-700">Data da Publicação</FormLabel>
                  <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                </FormItem>
              )}/>

              <FormField control={form.control} name="abertura" render={({ field }) => (
                <FormItem className="sm:col-span-4">
                  <FormLabel className="text-xs font-bold text-slate-700">Data de Abertura</FormLabel>
                  <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                </FormItem>
              )}/>

              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem className="sm:col-span-4">
                  <FormLabel className="text-xs font-bold text-slate-700">Estado (UF)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="border-slate-300 h-10 bg-white"><SelectValue placeholder="Selecione UF" /></SelectTrigger></FormControl>
                    <SelectContent>{ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}</SelectContent>
                  </Select>
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
              
              {/* ✨ NOVO COMPONENTE DE OBJETO INTELIGENTE */}
              <FormField control={form.control} name="objeto" render={({ field }) => {
                const termoBusca = normalize(field.value || "");
                const objetosFiltrados = objetosDisponiveis.filter(obj => normalize(obj).includes(termoBusca));

                return (
                  <FormItem className="sm:col-span-8 relative">
                    <FormLabel className="text-xs font-bold text-slate-700">Objeto (Edital)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: ALIMENTAÇÃO" 
                        className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" 
                        autoComplete="off"
                        {...field} 
                        value={field.value || ""}
                        onFocus={() => setShowObjetoDropdown(true)}
                        onBlur={() => setShowObjetoDropdown(false)}
                        onChange={e => field.onChange(e.target.value.toUpperCase())} 
                      />
                    </FormControl>

                    {/* Caixa de Sugestões Suspensa */}
                    {showObjetoDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[200px] overflow-y-auto">
                        {objetosFiltrados.length > 0 ? (
                          objetosFiltrados.map((obj, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border-b border-slate-50 last:border-0"
                              onMouseDown={(e) => {
                                // Evita que o onBlur feche o menu antes de setar o valor
                                e.preventDefault(); 
                                field.onChange(obj);
                                setShowObjetoDropdown(false);
                              }}
                            >
                              {obj}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-slate-500 bg-slate-50 italic">
                            Nenhum objeto existente encontrado. <br/>
                            <strong className="text-blue-600">"{field.value}"</strong> será cadastrado como um <strong>novo objeto</strong> ao salvar.
                          </div>
                        )}
                      </div>
                    )}
                  </FormItem>
                );
              }}/>

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
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="mr-2 text-slate-500 font-semibold">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px] font-bold">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Publicação"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}