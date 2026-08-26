"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle2, AlertCircle, X, FileUp, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_FASE_OPCOES = [
  "CADASTRO", "DISPUTA", "FASE RECURSAL", "POC", "AGUARDANDO DECISÃO", "HOMOLOGADO"
];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const publicacaoSchema = z.object({
  data_publicacao: z.string().min(1, "Data de publicação é obrigatória"),
  cliente: z.string().min(3, "Mínimo de 3 caracteres"),
  numero: z.string().optional(),
  objeto: z.string().min(3, "Mínimo de 3 caracteres"),
  abertura: z.string().min(1, "Data de abertura é obrigatória"),
  valor: z.number().min(0, "Valor inválido").optional(),
  taxa_credenciamento: z.number().optional().nullable(),
  taxa_administracao: z.number().optional().nullable(),
  qtd_rede_cred: z.string().optional().nullable(),
  capacidade_tecnica: z.string().optional().nullable(),
  poc: z.string().optional().nullable(),
  status_fase: z.string().optional().nullable(),
});

type PublicacaoInput = z.infer<typeof publicacaoSchema>;

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

interface EditarPublicacaoModalProps {
  publicacao: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditarPublicacaoModal({ publicacao, isOpen, onClose, onSuccess }: EditarPublicacaoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [arquivoExistenteUrl, setArquivoExistenteUrl] = useState<string | null>(null);
  const [arquivoErro, setArquivoErro] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PublicacaoInput>({
    resolver: zodResolver(publicacaoSchema),
    defaultValues: {
      data_publicacao: "",
      cliente: "",
      numero: "",
      objeto: "",
      abertura: "",
      valor: undefined,
      taxa_credenciamento: null,
      taxa_administracao: null,
      qtd_rede_cred: "",
      capacidade_tecnica: "",
      poc: "",
      status_fase: "",
    },
  });

  // ✨ CORREÇÃO DE PERFORMANCE: O Modal abre instantaneamente, os dados piscam 150ms depois
  useEffect(() => {
    if (publicacao && isOpen) {
      const timer = setTimeout(() => {
        form.reset({
          data_publicacao: publicacao.data_publicacao || "",
          cliente: publicacao.cliente || "",
          numero: publicacao.numero || "",
          objeto: publicacao.objeto || "",
          abertura: publicacao.abertura || "",
          valor: publicacao.valor !== null ? Number(publicacao.valor) : undefined,
          taxa_credenciamento: publicacao.taxa_credenciamento !== null ? Number(publicacao.taxa_credenciamento) : null,
          taxa_administracao: publicacao.taxa_administracao !== null ? Number(publicacao.taxa_administracao) : null,
          qtd_rede_cred: publicacao.qtd_rede_cred || "",
          capacidade_tecnica: publicacao.capacidade_tecnica || "",
          poc: publicacao.poc || "",
          status_fase: publicacao.status_fase || "",
        });
        setFeedback({ type: null, message: '' }); 
        setArquivoPdf(null);
        setArquivoErro("");
        setArquivoExistenteUrl(publicacao.arquivo_url || null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [publicacao, isOpen, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setArquivoErro("");
    
    if (!file) return;

    if (file.type !== "application/pdf") {
      setArquivoErro('Apenas arquivos no formato PDF são suportados.');
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setArquivoErro(`O arquivo excede o limite máximo de ${MAX_FILE_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setArquivoPdf(file);
    setArquivoExistenteUrl(null); 
  };

  const removerArquivo = () => {
    setArquivoPdf(null);
    setArquivoExistenteUrl(null);
    setArquivoErro("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: PublicacaoInput) => {
    if (!publicacao) return;
    setIsSubmitting(true);
    setFeedback({ type: null, message: '' });

    try {
      if (data.cliente) data.cliente = data.cliente.toUpperCase();
      if (data.numero) data.numero = data.numero.toUpperCase();
      if (data.objeto) data.objeto = data.objeto.toUpperCase();

      let arquivo_url = arquivoExistenteUrl;

      if (arquivoPdf) {
        const fileExt = arquivoPdf.name.split('.').pop();
        const fileName = `pub-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("pdfs_publicacoes")
          .upload(fileName, arquivoPdf);

        if (uploadError) {
          throw new Error("Erro no upload do PDF: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("pdfs_publicacoes")
          .getPublicUrl(fileName);

        arquivo_url = publicUrlData.publicUrl;
      }

      const payload = { ...data, arquivo_url };

      const { error } = await supabase
        .from("publicacoes")
        .update(payload)
        .eq("id", publicacao.id);

      if (error) throw error;

      setFeedback({ type: 'success', message: 'A publicação foi atualizada com sucesso!' });

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

  if (!publicacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="p-0 shadow-2xl rounded-xl border-0 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ maxWidth: '900px', width: '95vw' }}
      >
        <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900">Editar Publicação</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Altere os dados principais, indicadores e anexe editais.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
          
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
            <form id="editar-publicacao-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">1. Dados Principais</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="data_publicacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold text-slate-700">Data da Publicação <span className="text-rose-500">*</span></FormLabel>
                      <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="abertura" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold text-slate-700">Data de Abertura <span className="text-rose-500">*</span></FormLabel>
                      <FormControl><Input type="date" className="border-slate-300 bg-white h-10" {...field} /></FormControl>
                    </FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="cliente" render={({ field }) => (
                    <FormItem className="sm:col-span-9">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Cliente / Órgão <span className="text-rose-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PREFEITURA..." className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="numero" render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PE 0001/2025" className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                    </FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <FormField control={form.control} name="objeto" render={({ field }) => (
                    <FormItem className="sm:col-span-8">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Objeto (Edital) <span className="text-rose-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: ALIMENTAÇÃO" className="border-slate-300 bg-white h-10 uppercase placeholder:normal-case" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="valor" render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-[11px] font-bold text-slate-700">Valor Estimado (R$)</FormLabel>
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

                  <FormField control={form.control} name="poc" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-[11px] font-bold text-slate-700">POC</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="border-slate-300 h-10 bg-white">
                            <SelectValue placeholder="Opção..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIM">SIM</SelectItem>
                          <SelectItem value="NÃO">NÃO</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}/>

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

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">3. Arquivo do Edital</h3>
                
                {arquivoErro && (
                  <div className="text-rose-600 text-xs font-medium bg-rose-50 p-2 rounded border border-rose-100 mb-2">
                    ⚠️ {arquivoErro}
                  </div>
                )}

                {(!arquivoPdf && !arquivoExistenteUrl) ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    <FileUp className="h-8 w-8 text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700">Clique para anexar um novo PDF do Edital</p>
                    <p className="text-xs font-medium text-slate-400 mt-1.5">Tamanho máximo permitido: {MAX_FILE_SIZE_MB}MB</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="bg-emerald-100 p-2.5 rounded-lg shrink-0">
                        <FileText className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-emerald-900 truncate">
                          {arquivoPdf ? arquivoPdf.name : "Edital Atualmente Vinculado"}
                        </p>
                        <p className="text-xs font-medium text-emerald-700 mt-0.5">
                          {arquivoPdf ? `${(arquivoPdf.size / 1024 / 1024).toFixed(2)} MB (Aguardando Salvar)` : "Disponível para Download"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {arquivoExistenteUrl && !arquivoPdf && (
                        <a 
                          href={arquivoExistenteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-md text-xs font-bold transition-colors"
                        >
                          Ver PDF Atual
                        </a>
                      )}
                      <button 
                        type="button" 
                        onClick={removerArquivo}
                        className="p-2 hover:bg-emerald-200 text-emerald-700 rounded-md transition-colors"
                        title="Remover arquivo"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf"
                  className="hidden" 
                />
              </div>

            </form>
          </Form>
        </div>

        <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="mr-3 text-slate-500 font-semibold" disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="editar-publicacao-form" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white min-w-[180px] font-bold shadow-sm h-11">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</> : "Atualizar Publicação"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}