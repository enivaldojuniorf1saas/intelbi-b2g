"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { registroSchema, RegistroInput } from "@/lib/validations/registro";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

interface NovoRegistroModalProps {
  onSuccess: () => void;
}

export function NovoRegistroModal({ onSuccess }: NovoRegistroModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      estado: "",
      local: "",
      decisor: "",
      numero: "",
      referencia: "",
      objeto: "",
      valor: undefined,
      vigencia: "",
      alerta: "",
      fornecedor: "",
      taxa: undefined,
      regiao: "",
      habitantes: undefined,
      distancia_km: undefined,
      qualificacao: "",
      data_evento: "",
    },
  });

  const onSubmit = async (data: RegistroInput) => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("registros").insert({
        ...data,
        user_id: userData.user.id,
      });

      if (error) throw error;

      form.reset();
      setIsOpen(false);
      onSuccess(); 
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Novo Registro
        </Button>
      </DialogTrigger>
      
      {/* 
        Largura generosa em telas grandes, mas com scroll interno de segurança
        (max-h-[85vh] + overflow-y-auto) para não estourar a viewport em telas
        menores ou quando o usuário aumenta a fonte do navegador.
      */}
      <DialogContent className="!max-w-[1200px] !w-[90vw] p-8 shadow-2xl rounded-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">Cadastrar Novo Registro</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Preenchimento rápido e otimizado. Use a tecla TAB para navegar entre os campos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* ==========================================
                SEÇÃO 1: DADOS BASE E DECISÃO
            ========================================== */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                1. Dados Base e Decisão
              </h3>
              {/* Mobile: 1 coluna. Tablet: 2. Desktop: volta ao grid de 12 para alinhar tudo numa linha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-4 gap-y-5">
                
                <FormField control={form.control} name="estado" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Estado (UF)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-300 h-9 text-sm bg-white"><SelectValue placeholder="UF" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="local" render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Local / Município</FormLabel>
                    <FormControl><Input placeholder="Ex: Goiânia" className="border-slate-300 h-9 text-sm bg-white" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="decisor" render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Decisor</FormLabel>
                    <FormControl><Input placeholder="Responsável" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Nº Coligação</FormLabel>
                    <FormControl><Input placeholder="Ex: 15" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="referencia" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Referência</FormLabel>
                    <FormControl><Input placeholder="Código" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* ==========================================
                SEÇÃO 2: OBJETO E EXECUÇÃO
            ========================================== */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                2. Objeto e Execução
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-4 gap-y-5">
                
                <FormField control={form.control} name="objeto" render={({ field }) => (
                  <FormItem className="lg:col-span-6 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Objeto do Registro</FormLabel>
                    <FormControl><Input placeholder="Descrição completa..." className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="fornecedor" render={({ field }) => (
                  <FormItem className="lg:col-span-6 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Fornecedor</FormLabel>
                    <FormControl><Input placeholder="Razão social da empresa" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem className="lg:col-span-4 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="vigencia" render={({ field }) => (
                  <FormItem className="lg:col-span-4 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Vigência</FormLabel>
                    <FormControl><Input type="date" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="alerta" render={({ field }) => (
                  <FormItem className="lg:col-span-4 space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-700">Alerta</FormLabel>
                    <FormControl><Input placeholder="Ex: Urgente, Revisão" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* ==========================================
                SEÇÃO 3: INDICADORES E LOCALIZAÇÃO
            ========================================== */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                3. Indicadores Geográficos e Status
              </h3>
              {/* Mobile: 2 colunas. Tablet: 3. Desktop: 12, 2 colunas por campo = 6 campos numa linha */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-x-4 gap-y-5">
                
                <FormField control={form.control} name="taxa" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5 min-w-0">
                    <FormLabel className="text-xs font-bold text-slate-700">Taxa (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="-16.00" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="regiao" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5 min-w-0">
                    <FormLabel className="text-xs font-bold text-slate-700">Região</FormLabel>
                    <FormControl><Input placeholder="Ex: SUL" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="habitantes" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5 min-w-0">
                    <FormLabel className="text-xs font-bold text-slate-700">Habitantes</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 114427" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="distancia_km" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5 min-w-0">
                    <FormLabel className="text-xs font-bold text-slate-700">Dist. (KM)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 261" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="qualificacao" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5 min-w-0">
                    <FormLabel className="text-xs font-bold text-slate-700">Qualificação</FormLabel>
                    <FormControl><Input placeholder="Status" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="data_evento" render={({ field }) => (
                  <FormItem className="lg:col-span-2 space-y-1.5 min-w-0">
                    <FormLabel className="text-xs font-bold text-slate-700">Data Evento</FormLabel>
                    <FormControl><Input type="date" className="border-slate-300 h-9 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="mr-3 text-slate-500 hover:text-slate-700 font-semibold">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] shadow-sm font-bold h-10">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Registro"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}