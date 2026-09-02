"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle2, AlertCircle, X, FileUp, FileText, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ✨ NOVO PADRÃO
const STATUS_FASE_OPCOES = [
  "CADASTRO", "DISPUTA", "POC", "FASE RECURSAL", "AGUARDANDO DECISÃO", "SUSPENSO", "HOMOLOGADO", "CANCELADO", "VENCEDOR"
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const normalize = (text: string) => text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
const higienizarTexto = (text: string) => text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

const publicacaoSchemaModal = z.object({
  data_publicacao: z.string().min(1, "Obrigatória"),
  cliente: z.string().min(3),
  numero: z.string().optional(),
  objeto: z.string().min(3),
  abertura: z.string().min(1),
  valor: z.number().min(0).optional(),
  taxa_credenciamento: z.string().optional().nullable(),
  taxa_administracao: z.string().optional().nullable(),
  qtd_rede_cred: z.string().optional().nullable(),
  capacidade_tecnica: z.string().optional().nullable(),
  poc: z.string().optional().nullable(),
  status_fase: z.string().optional().nullable(),
  fornecedor: z.string().optional().nullable(),
  qualificacao_economica: z.string().optional().nullable(), 
  garantia_tipo: z.string().optional().nullable(), 
  garantia_valor: z.string().optional().nullable(), 
});

type PublicacaoInputModal = z.infer<typeof publicacaoSchemaModal>;

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function EditarPublicacaoModal({ publicacao, isOpen, onClose, onSuccess }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<string[]>([]);
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false);
  const fornecedorRef = useRef<HTMLDivElement>(null);

  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [arquivoExistenteUrl, setArquivoExistenteUrl] = useState<string | null>(null);
  const [arquivoErro, setArquivoErro] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PublicacaoInputModal>({
    resolver: zodResolver(publicacaoSchemaModal),
    defaultValues: {
      data_publicacao: "", cliente: "", numero: "", objeto: "", abertura: "", valor: undefined,
      taxa_credenciamento: "", taxa_administracao: "", qtd_rede_cred: "", capacidade_tecnica: "",
      poc: "", status_fase: "", fornecedor: "", qualificacao_economica: "", garantia_tipo: "", garantia_valor: "",
    },
  });

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      supabase.from("registros").select("fornecedor").then(({ data }) => {
        if (data && isMounted) setFornecedoresDisponiveis(Array.from(new Set(data.map(r => higienizarTexto(r.fornecedor)).filter(Boolean))).sort());
      });
    } else {
      setFornecedoresDisponiveis([]); setShowFornecedorDropdown(false);
    }
    return () => { isMounted = false; };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fornecedorRef.current && !fornecedorRef.current.contains(event.target as Node)) setShowFornecedorDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (publicacao && isOpen) {
      const timer = setTimeout(() => {
        form.reset({
          data_publicacao: publicacao.data_publicacao || "", cliente: publicacao.cliente || "", numero: publicacao.numero || "",
          objeto: publicacao.objeto || "", abertura: publicacao.abertura || "", valor: publicacao.valor !== null ? Number(publicacao.valor) : undefined,
          taxa_credenciamento: publicacao.taxa_credenciamento !== null ? String(publicacao.taxa_credenciamento) : "",
          taxa_administracao: publicacao.taxa_administracao !== null ? String(publicacao.taxa_administracao) : "",
          qtd_rede_cred: publicacao.qtd_rede_cred || "", capacidade_tecnica: publicacao.capacidade_tecnica || "",
          poc: publicacao.poc || "", status_fase: publicacao.status_fase || "", fornecedor: publicacao.fornecedor || "",
          qualificacao_economica: publicacao.qualificacao_economica || "", 
          garantia_tipo: publicacao.garantia_tipo || "", 
          garantia_valor: publicacao.garantia_valor !== null ? String(publicacao.garantia_valor) : "",
        });
        setFeedback({ type: null, message: '' }); setArquivoPdf(null); setArquivoErro(""); setArquivoExistenteUrl(publicacao.arquivo_url || null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [publicacao, isOpen, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setArquivoErro("");
    if (!file) return;
    if (file.type !== "application/pdf") { setArquivoErro('Apenas arquivos PDF são suportados.'); return; }
    if (file.size > MAX_FILE_SIZE_BYTES) { setArquivoErro('Arquivo muito grande.'); return; }
    setArquivoPdf(file); setArquivoExistenteUrl(null); 
  };

  const removerArquivo = () => { setArquivoPdf(null); setArquivoExistenteUrl(null); setArquivoErro(""); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const onSubmit = async (data: PublicacaoInputModal) => {
    if (!publicacao) return;
    setIsSubmitting(true); setFeedback({ type: null, message: '' });

    try {
      if (data.cliente) data.cliente = data.cliente.toUpperCase();
      if (data.numero) data.numero = data.numero.toUpperCase();
      if (data.objeto) data.objeto = data.objeto.toUpperCase();
      if (data.fornecedor) data.fornecedor = higienizarTexto(data.fornecedor);

      let arquivo_url = arquivoExistenteUrl;
      if (arquivoPdf) {
        const fileExt = arquivoPdf.name.split('.').pop();
        const fileName = `pub-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("pdfs_publicacoes").upload(fileName, arquivoPdf);
        if (uploadError) throw new Error("Erro upload");
        arquivo_url = supabase.storage.from("pdfs_publicacoes").getPublicUrl(fileName).data.publicUrl;
      }

      const payload: any = { ...data, arquivo_url };
      payload.taxa_credenciamento = payload.taxa_credenciamento ? parseFloat(payload.taxa_credenciamento) : null;
      payload.taxa_administracao = payload.taxa_administracao ? parseFloat(payload.taxa_administracao) : null;
      payload.garantia_valor = payload.garantia_valor ? parseFloat(payload.garantia_valor) : null; 

      const { error } = await supabase.from("publicacoes").update(payload).eq("id", publicacao.id);
      if (error) throw error;

      setFeedback({ type: 'success', message: 'Atualizada com sucesso!' });
      setTimeout(() => { onClose(); onSuccess(); }, 2000);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || "Erro inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!publicacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 shadow-2xl rounded-xl border-0 overflow-hidden flex flex-col max-h-[90vh]" style={{ maxWidth: '900px', width: '95vw' }}>
        <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900">Editar Publicação</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">Altere os dados principais, indicadores e anexe editais.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
          {feedback.type && (
            <div className={`p-4 mb-6 rounded-xl flex items-start gap-3 border transition-all ${feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {feedback.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" /> : <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />}
              <div><h4 className="text-sm font-bold">{feedback.type === 'error' ? 'Atenção' : 'Concluído'}</h4><p className="text-xs mt-0.5 opacity-90">{feedback.message}</p></div>
              <button type="button" onClick={() => setFeedback({ type: null, message: '' })} className="ml-auto opacity-50"><X className="h-4 w-4" /></button>
            </div>
          )}

          <Form {...form}>
            <form id="editar-publicacao-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">1. Dados Principais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="data_publicacao" render={({ field }) => (<FormItem><FormLabel className="text-[11px] font-bold text-slate-700">Data da Publicação *</FormLabel><FormControl><Input type="date" className="h-10" {...field} /></FormControl></FormItem>)}/>
                  <FormField control={form.control} name="abertura" render={({ field }) => (<FormItem><FormLabel className="text-[11px] font-bold text-slate-700">Data de Abertura *</FormLabel><FormControl><Input type="date" className="h-10" {...field} /></FormControl></FormItem>)}/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="cliente" render={({ field }) => (<FormItem className="sm:col-span-9"><FormLabel className="text-[11px] font-bold text-slate-700">Lead *</FormLabel><FormControl><Input placeholder="Ex: PREFEITURA..." className="h-10 uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)}/>
                  <FormField control={form.control} name="numero" render={({ field }) => (<FormItem className="sm:col-span-3"><FormLabel className="text-[11px] font-bold text-slate-700">Número</FormLabel><FormControl><Input placeholder="Ex: PE 0001/2025" className="h-10 uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)}/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="objeto" render={({ field }) => (<FormItem className="sm:col-span-8"><FormLabel className="text-[11px] font-bold text-slate-700">Objeto *</FormLabel><FormControl><Input placeholder="Ex: ALIMENTAÇÃO" className="h-10 uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)}/>
                  <FormField control={form.control} name="valor" render={({ field }) => (<FormItem className="sm:col-span-4"><FormLabel className="text-[11px] font-bold text-slate-700">Valor Estimado (R$)</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="R$ 0,00" className="h-10" value={formatCurrency(field.value)} onChange={(e) => { const digitos = e.target.value.replace(/\D/g, ""); if (!digitos) { field.onChange(undefined); return; } field.onChange(parseInt(digitos, 10) / 100); }} /></FormControl></FormItem>)}/>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">2. Indicadores e Exigências Técnicas</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="taxa_administracao" render={({ field }) => (<FormItem className="sm:col-span-3"><FormLabel className="text-[11px] font-bold text-slate-700">Tx. Adm. (%)</FormLabel><FormControl><Input type="text" placeholder="-8.5" className="h-10" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1'))} /></FormControl></FormItem>)}/>
                  <FormField control={form.control} name="taxa_credenciamento" render={({ field }) => (<FormItem className="sm:col-span-3"><FormLabel className="text-[11px] font-bold text-slate-700">Tx. Cred. (%)</FormLabel><FormControl><Input type="text" placeholder="-8.5" className="h-10" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1'))} /></FormControl></FormItem>)}/>
                  
                  {/* ✨ CORREÇÃO LARGURA: min-w-[120px] */}
                  <FormField control={form.control} name="poc" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel className="text-[11px] font-bold text-slate-700">POC</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger className="h-10"><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent className="min-w-[120px]"><SelectItem value="SIM">SIM</SelectItem><SelectItem value="NÃO">NÃO</SelectItem></SelectContent></Select></FormItem>)}/>
                  
                  {/* ✨ CORREÇÃO LARGURA: min-w-[220px] */}
                  <FormField control={form.control} name="status_fase" render={({ field }) => (<FormItem className="sm:col-span-4"><FormLabel className="text-[11px] font-bold text-slate-700">Status da Fase</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger className="h-10"><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent className="min-w-[220px]">{STATUS_FASE_OPCOES.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select></FormItem>)}/>
                </div>

                <FormField control={form.control} name="qualificacao_economica" render={({ field }) => (
                  <FormItem className="sm:col-span-12">
                    <FormLabel className="text-[11px] font-bold text-slate-700">Qualificação Econômico-Financeira Exigida</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap items-center gap-6 mt-1 pt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input type="radio" value="Patrimônio Líquido" checked={field.value === "Patrimônio Líquido"} onChange={field.onChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" /> 
                          Patrimônio Líquido
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input type="radio" value="Capacidade Econômico-Financeira" checked={field.value === "Capacidade Econômico-Financeira"} onChange={field.onChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" /> 
                          Capacidade Econômico-Financeira
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}/>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <FormField control={form.control} name="garantia_tipo" render={({ field }) => (
                    <FormItem className="sm:col-span-5">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Tipo de Garantia</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4 h-10">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input type="radio" value="R$" checked={field.value === "R$"} onChange={(e) => { field.onChange(e); form.setValue('garantia_valor', ''); }} className="w-4 h-4 text-emerald-600 border-slate-300" /> R$ (Valor Fixo)
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input type="radio" value="%" checked={field.value === "%"} onChange={(e) => { field.onChange(e); form.setValue('garantia_valor', ''); }} className="w-4 h-4 text-emerald-600 border-slate-300" /> % (do Contrato)
                          </label>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="garantia_valor" render={({ field }) => {
                    const tipo = form.watch("garantia_tipo");
                    return (
                      <FormItem className="sm:col-span-7">
                        <FormLabel className="text-[11px] font-bold text-slate-700">Valor da Garantia</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            placeholder={tipo === "R$" ? "R$ 0,00" : (tipo === "%" ? "Ex: 5" : "Selecione o tipo ao lado...")}
                            className="h-10 bg-white" 
                            disabled={!tipo}
                            value={tipo === "R$" ? formatCurrency(field.value ? parseFloat(field.value) : undefined) : (field.value || "")} 
                            onChange={(e) => {
                              if (tipo === "R$") {
                                const val = e.target.value.replace(/\D/g, '');
                                field.onChange(val ? (parseFloat(val) / 100).toString() : "");
                              } else {
                                const val = e.target.value.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1');
                                field.onChange(val);
                              }
                            }} 
                          />
                        </FormControl>
                      </FormItem>
                    )
                  }}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="qtd_rede_cred" render={({ field }) => (<FormItem><FormLabel className="text-[11px] font-bold text-slate-700">Qtd. Rede Credenciada</FormLabel><FormControl><Textarea className="min-h-[60px] resize-none" {...field} value={field.value || ""} /></FormControl></FormItem>)}/>
                  <FormField control={form.control} name="capacidade_tecnica" render={({ field }) => (<FormItem><FormLabel className="text-[11px] font-bold text-slate-700">Capacidade Técnica Exigida</FormLabel><FormControl><Textarea className="min-h-[60px] resize-none" {...field} value={field.value || ""} /></FormControl></FormItem>)}/>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">3. Fornecedor Atual</h3>
                <FormField control={form.control} name="fornecedor" render={({ field }) => {
                  const termoBusca = normalize(field.value || "");
                  const fornecedoresFiltrados = fornecedoresDisponiveis.filter(forn => normalize(forn).includes(termoBusca));
                  return (
                    <FormItem className="relative" ref={fornecedorRef}>
                      <FormLabel className="text-[11px] font-bold text-slate-700">Nome do Fornecedor</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="Busque ou digite..." className="h-10 uppercase pr-8" autoComplete="off" {...field} value={field.value || ""} onFocus={() => setShowFornecedorDropdown(true)} onChange={e => { field.onChange(e.target.value.toUpperCase()); setShowFornecedorDropdown(true); }} />
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        </div>
                      </FormControl>
                      {showFornecedorDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border shadow-xl max-h-[200px] overflow-y-auto">
                          {fornecedoresFiltrados.length > 0 ? fornecedoresFiltrados.map((forn, idx) => (<div key={idx} className="px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer" onMouseDown={(e) => { e.preventDefault(); field.onChange(forn); setShowFornecedorDropdown(false); }}>{forn}</div>)) : (<div className="px-3 py-3 text-xs text-slate-500 italic">Novo fornecedor será mantido.</div>)}
                        </div>
                      )}
                    </FormItem>
                  );
                }}/>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">4. Arquivo do Edital</h3>
                {arquivoErro && <div className="text-rose-600 text-xs font-medium bg-rose-50 p-2 border-rose-100 mb-2">⚠️ {arquivoErro}</div>}
                {(!arquivoPdf && !arquivoExistenteUrl) ? (
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer">
                    <FileUp className="h-8 w-8 text-slate-400 mb-3" />
                    <p className="text-sm font-semibold">Anexar Novo PDF</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border p-4 rounded-xl">
                    <div className="flex items-center gap-4"><FileText className="h-6 w-6 text-emerald-600" /><div><p className="text-sm font-bold text-emerald-900">{arquivoPdf ? arquivoPdf.name : "Edital Atualmente Vinculado"}</p></div></div>
                    <div className="flex gap-2">
                      {arquivoExistenteUrl && !arquivoPdf && (<a href={arquivoExistenteUrl} target="_blank" className="px-3 py-1.5 bg-white text-emerald-700 border hover:bg-emerald-100 rounded-md text-xs font-bold">Ver PDF</a>)}
                      <button type="button" onClick={removerArquivo} className="p-2 text-emerald-700 hover:bg-emerald-200 rounded-md"><X className="h-5 w-5" /></button>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
              </div>
            </form>
          </Form>
        </div>
        <div className="p-6 bg-white border-t border-slate-200 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="mr-3" disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="editar-publicacao-form" disabled={isSubmitting} className="bg-blue-600 text-white min-w-[180px]">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</> : "Atualizar Publicação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}