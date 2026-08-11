"use client";

import { useState, useEffect } from "react";
import { Loader2, Calculator, CheckCircle2, AlertCircle, X, Truck, Gift, PackageOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const CATEGORIAS = [
  {
    titulo: "Frota", icone: Truck, cor: "text-blue-600", bg: "bg-blue-50 border-blue-100",
    modulos: ["ABASTECIMENTO", "MANUTENÇÃO", "TELEMETRIA"]
  },
  {
    titulo: "Benefícios", icone: Gift, cor: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100",
    modulos: ["ALIMENTAÇÃO", "REFEIÇÃO", "GÁS", "EDUCAÇÃO", "CULTURA", "SAÚDE"]
  },
  {
    titulo: "Outros", icone: PackageOpen, cor: "text-purple-600", bg: "bg-purple-50 border-purple-100",
    modulos: ["PATRIMÔNIO", "TRANSPORTE"]
  }
];

const TODOS_MODULOS = CATEGORIAS.flatMap(cat => cat.modulos);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function EditarFaturamentoModal({ grupo, isOpen, onClose, onSuccess }: { grupo: any, isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const [valores, setValores] = useState<Record<string, number>>({});

  // Preenche os dados assim que o modal abre
  useEffect(() => {
    if (isOpen && grupo) {
      const initialValores: Record<string, number> = {};
      grupo.detalhes.forEach((det: any) => {
        initialValores[det.modulo] = Number(det.valor || 0);
      });
      setValores(initialValores);
      setFeedback({ type: null, message: '' });
    }
  }, [isOpen, grupo]);

  const handleValorChange = (modulo: string, textValue: string) => {
    const digitos = textValue.replace(/\D/g, "");
    const num = digitos ? parseInt(digitos, 10) / 100 : 0;
    setValores(prev => ({ ...prev, [modulo]: num }));
  };

  const valorTotal = TODOS_MODULOS.reduce((acc, mod) => acc + (valores[mod] || 0), 0);

  const onSubmit = async () => {
    setFeedback({ type: null, message: '' });
    setIsSubmitting(true);

    try {
      // ✨ BLINDAGEM: Atualiza cada detalhe com segurança, garantindo que valores em branco sejam 0.
      const atualizacoes = grupo.detalhes.map(async (det: any) => {
        const novoValor = valores[det.modulo] || 0;
        
        const { error } = await supabase
          .from("faturamentos")
          .update({ valor: novoValor })
          .eq("id", det.id);
          
        if (error) throw error;
      });

      // Aguarda todas as atualizações terminarem
      await Promise.all(atualizacoes);

      setFeedback({ type: 'success', message: 'Faturamento atualizado com sucesso!' });
      
      setTimeout(() => {
        onClose();
        onSuccess(); 
      }, 2000);

    } catch (error: any) {
      console.error("Erro no update de faturamento:", error);
      setFeedback({ type: 'error', message: "Não foi possível salvar as alterações. Verifique as permissões de rede." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!grupo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[900px] !w-[90vw] p-8 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            Editar Faturamento da Rede
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Atualize os valores projetados da operação.
          </DialogDescription>
        </DialogHeader>

        {feedback.type && (
          <div className={`p-4 my-4 rounded-xl flex items-start gap-3 border transition-all duration-300 ${feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {feedback.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <div>
              <h4 className="text-sm font-bold">{feedback.type === 'error' ? 'Atenção' : 'Sucesso'}</h4>
              <p className="text-xs mt-0.5 opacity-90">{feedback.message}</p>
            </div>
            <button onClick={() => setFeedback({ type: null, message: '' })} className="ml-auto opacity-50 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="space-y-6 mt-2">
          
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-4 opacity-80">
            <div className="sm:col-span-3">
              <Label className="text-xs font-bold text-slate-700 mb-2 block">Mês Ref.</Label>
              <Input type="month" value={grupo.mes_referencia} disabled className="bg-slate-100 border-slate-300 h-10 w-full" />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs font-bold text-slate-700 mb-2 block">Estado (UF)</Label>
              <Input value={grupo.estado} disabled className="bg-slate-100 border-slate-300 h-10 w-full font-bold text-blue-700" />
            </div>
            <div className="sm:col-span-6">
              <Label className="text-xs font-bold text-slate-700 mb-2 block">Nome do Licenciado</Label>
              <Input value={grupo.licenciado} disabled className="bg-slate-100 border-slate-300 h-10 w-full font-bold text-slate-800" />
            </div>
          </div>

          <div className="space-y-5">
            {CATEGORIAS.map((categoria) => {
              const IconeCat = categoria.icone;
              return (
                <div key={categoria.titulo} className={`p-5 rounded-xl border ${categoria.bg}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${categoria.cor}`}>
                    <IconeCat className="h-4 w-4" /> {categoria.titulo}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {categoria.modulos.map(modulo => (
                      <div key={modulo} className="bg-white border border-slate-200 p-3 rounded-lg focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all shadow-sm">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{modulo}</Label>
                        <Input
                          type="text" inputMode="numeric" placeholder="R$ 0,00"
                          className="border-0 shadow-none h-8 px-0 text-sm font-bold text-slate-800 focus-visible:ring-0"
                          value={valores[modulo] ? formatCurrency(valores[modulo]) : ""}
                          onChange={(e) => handleValorChange(modulo, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className=" border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-md sticky bottom-0 z-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Faturamento Bruto Projetado</p>
              <p className="text-sm font-medium mt-0.5">Soma de todos os {TODOS_MODULOS.length} módulos</p>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight">
              {formatCurrency(valorTotal)}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="mr-3 text-slate-500 font-semibold" disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] font-bold h-11">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</> : "Atualizar Valores"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}