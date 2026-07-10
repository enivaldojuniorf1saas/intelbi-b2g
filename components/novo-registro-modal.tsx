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

// Array estático com as 27 UFs do Brasil
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
      objeto: "",
      valor: undefined,
      decisor: "",
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
      alert("Erro ao salvar o registro. Verifique o console.");
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
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Cadastrar Novo Registro</DialogTitle>
          <DialogDescription className="text-slate-500">
            Preencha os dados do edital ou contrato. Os campos Estado e Local são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CAMPO DE ESTADO COM SELECT (DROPDOWN) */}
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Estado (UF)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-200 h-11">
                          <SelectValue placeholder="Selecione o estado..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (
                          <SelectItem key={uf} value={uf} className="cursor-pointer">
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              {/* CAMPO LOCAL */}
              <FormField
                control={form.control}
                name="local"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Local / Município</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Goiânia" className="border-slate-200 h-11" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              {/* CAMPO OBJETO */}
              <FormField
                control={form.control}
                name="objeto"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-slate-700 font-semibold">Objeto do Registro</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição do edital, produto ou serviço..." className="border-slate-200 h-11" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              {/* CAMPO VALOR */}
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Valor Base (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ex: 150000.50" 
                        className="border-slate-200 h-11"
                        {...field} 
                        value={field.value || ""} 
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              {/* CAMPO DECISOR */}
              <FormField
                control={form.control}
                name="decisor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Decisor / Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da pessoa ou órgão" className="border-slate-200 h-11" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-100">
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="mr-2 text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px] shadow-sm"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  "Salvar Registro"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}