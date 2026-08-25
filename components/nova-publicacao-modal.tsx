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
import { Textarea } from "@/components/ui/textarea";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const STATUS_FASE_OPCOES = [
  "CADASTRO", "DISPUTA", "FASE RECURSAL", "POC", "AGUARDANDO DECISÃO", "HOMOLOGADO"
];

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
  taxa_credenciamento: z.number().optional(),
  taxa_administracao: z.number().optional(),
  qtd_rede_cred: z.string().optional(),
  capacidade_tecnica: z.string().optional(),
  poc: z.string().optional(),
  status_fase: z.string().optional(),
});

type PublicacaoInput = z.infer<typeof publicacaoSchema>;

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function NovaPublicacaoModal({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      taxa_credenciamento: undefined,
      taxa_administracao: undefined,
      qtd_rede_cred: "",
      capacidade_tecnica: "",
      poc: "",
      status_fase: "",
    },
  });

  useEffect(() => {
    async function fetchObjetos() {
      if (!isOpen) return;
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
      if (data.objeto) data.objeto = higienizarObjeto(data.objeto);
      if (data.cliente) data.cliente = data.cliente.toUpperCase();
      if (data.numero) data.numero = data.numero.toUpperCase();

      const { error } = await supabase.from("publicacoes").insert([data]);
      if (error) throw error;

      form.reset();
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar publicação:", error);
      alert("Erro ao salvar o registro no banco de dados.");
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
        className="p-0 shadow-2xl rounded-xl border-0 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ maxWidth: '900px', width: '95vw' }}
      >
        <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900">Cadastrar Oportunidade</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Preencha os dados da nova publicação mapeada e indicadores técnicos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
          <Form {...form}>
            <form id="nova-publicacao-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* BLOCO 1: DADOS PRINCIPAIS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">1. Dados Principais</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="data_publicacao" render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-xs font-bold text-slate-700">Data Publicação <span className="text-rose-500">*</span></FormLabel>
                      <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="abertura" render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-xs font-bold text-slate-700">Data Abertura <span className="text-rose-500">*</span></FormLabel>
                      <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="estado" render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-xs font-bold text-slate-700">Estado (UF) <span className="text-rose-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="border-slate-300 h-10 bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>{ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}</SelectContent>
                      </Select>
                    </FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="cliente" render={({ field }) => (
                    <FormItem className="sm:col-span-9">
                      <FormLabel className="text-xs font-bold text-slate-700">Cliente / Órgão <span className="text-rose-500">*</span></FormLabel>
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
                  <FormField control={form.control} name="objeto" render={({ field }) => {
                    const termoBusca = normalize(field.value || "");
                    const objetosFiltrados = objetosDisponiveis.filter(obj => normalize(obj).includes(termoBusca));

                    return (
                      <FormItem className="sm:col-span-8 relative">
                        <FormLabel className="text-xs font-bold text-slate-700">Objeto (Edital) <span className="text-rose-500">*</span></FormLabel>
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

                        {showObjetoDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[200px] overflow-y-auto">
                            {objetosFiltrados.length > 0 ? (
                              objetosFiltrados.map((obj, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border-b border-slate-50 last:border-0"
                                  onMouseDown={(e) => {
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
              </div>

              {/* BLOCO 2: INDICADORES E DETALHES TÉCNICOS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">2. Indicadores e Exigências Técnicas</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="taxa_credenciamento" render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Tx. Credenciamento (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="border-slate-300 bg-white h-10" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="taxa_administracao" render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Tx. Administração (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="border-slate-300 bg-white h-10" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                    </FormItem>
                  )}/>

                  {/* ✨ CAMPO POC COMO SELECT */}
                  <FormField control={form.control} name="poc" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-[11px] font-bold text-slate-700">POC</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="border-slate-300 h-10 bg-white">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIM">SIM</SelectItem>
                          <SelectItem value="NÃO">NÃO</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}/>

                  {/* ✨ CAMPO STATUS COMO SELECT */}
                  <FormField control={form.control} name="status_fase" render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Status da Fase</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="border-slate-300 h-10 bg-white">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_FASE_OPCOES.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="qtd_rede_cred" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold text-slate-700">Qtd. Exigida de Rede Credenciada</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva as exigências de rede do edital..." className="border-slate-300 bg-white min-h-[60px] resize-none" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="capacidade_tecnica" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold text-slate-700">Capacidade Técnica Exigida</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva as comprovações técnicas requeridas..." className="border-slate-300 bg-white min-h-[60px] resize-none" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}/>
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex justify-end">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="mr-3 text-slate-500 font-semibold" disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="nova-publicacao-form" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white min-w-[180px] font-bold shadow-sm h-11">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Publicação"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}