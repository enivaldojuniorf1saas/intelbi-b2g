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

// 1. Adicionamos as opções de qualificação do negócio
const QUALIFICACOES = [
  "Selecione",
  "Transacionando",
  "Disputando",
  "Tramitando",
  "Quente",
  "Morna",
  "Fria",
  "Agendada"
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
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                1. Dados Base e Decisão
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                
                {/* Ajustei o span do Estado para 1.5 e Local para 3.5, assim ficam mais próximos */}
                <FormField control={form.control} name="estado" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-1">
                    <FormLabel className="text-xs font-bold text-slate-700">Estado (UF)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-300 h-10 text-sm bg-white"><SelectValue placeholder="UF" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="local" render={({ field }) => (
                  <FormItem className="md:col-span-3 lg:col-span-3">
                    <FormLabel className="text-xs font-bold text-slate-700">Local / Município</FormLabel>
                    <FormControl><Input placeholder="Ex: Goiânia" className="border-slate-300 h-10 text-sm bg-white" {...field} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="decisor" render={({ field }) => (
                  <FormItem className="md:col-span-3 lg:col-span-4">
                    <FormLabel className="text-xs font-bold text-slate-700">Decisor</FormLabel>
                    <FormControl><Input placeholder="Responsável" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Nº Coligação</FormLabel>
                    <FormControl><Input placeholder="Ex: 15" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="referencia" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Referência</FormLabel>
                    <FormControl><Input placeholder="Código" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* ==========================================
                SEÇÃO 2: OBJETO E EXECUÇÃO
            ========================================== */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                2. Objeto e Execução
              </h3>
              
              {/* Ajustado para exatas 2 COLUNAS conforme solicitado */}
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                
                {/* Objeto ganha col-span-2 para usar a linha inteira em cima */}
                <FormField control={form.control} name="objeto" render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel className="text-xs font-bold text-slate-700">Objeto do Registro</FormLabel>
                    <FormControl><Input placeholder="Descrição completa do edital ou projeto..." className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="fornecedor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Fornecedor</FormLabel>
                    <FormControl><Input placeholder="Razão social da empresa" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                    </FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="vigencia" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Vigência</FormLabel>
                    <FormControl><Input type="date" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* ==========================================
                SEÇÃO 3: INDICADORES E LOCALIZAÇÃO
            ========================================== */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                3. Indicadores Geográficos e Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                <FormField control={form.control} name="taxa" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Taxa (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="-16.00" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                    </FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="regiao" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Região</FormLabel>
                    <FormControl><Input placeholder="Ex: SUL" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="habitantes" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Habitantes</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 114427" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}/>
                    </FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="distancia_km" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Dist. (KM)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 261" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/>
                    </FormControl>
                  </FormItem>
                )}/>

                {/* SELECT DA QUALIFICAÇÃO (Substituindo o antigo Input livre) */}
                <FormField control={form.control} name="qualificacao" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Qualificação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-300 h-10 text-sm bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUALIFICACOES.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="data_evento" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Data Evento</FormLabel>
                    <FormControl><Input type="date" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end pt-2">
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