"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

interface CsvImporterProps {
  onSuccess: () => void;
}

export function CsvImporter({ onSuccess }: CsvImporterProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // ✨ A SOLUÇÃO DOS ACENTOS: Forçamos o padrão brasileiro/Windows (Excel)
      encoding: "UTF-8",
      
      // ✨ A MÁGICA AQUI: Converte todos os cabeçalhos do CSV para minúsculo e tira os acentos!
      transformHeader: (header) => {
        return header
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .trim();
      },
      complete: async (results) => {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw new Error("Usuário não autenticado");

          // 🧹 O "TRADUTOR" BLINDADO
          const dadosLimpos = results.data.map((linha: any) => {
            
            const limpaNumero = (valor?: string) => {
              if (valor === undefined || valor === null || valor.trim() === '') return null;
              const numeroLimpo = valor.toString().replace(/[^0-9,-]/g, '').replace(',', '.');
              const float = parseFloat(numeroLimpo);
              return isNaN(float) ? null : float;
            };

            // ✨ NOVA FUNÇÃO: Garante que o número não tenha casas decimais (Especial para Habitantes)
            const limpaInteiro = (valor?: string) => {
              const num = limpaNumero(valor);
              // Math.round arredonda o número (ex: 82.9 vira 83)
              return num !== null ? Math.round(num) : null; 
            };

            const limpaData = (dataBr?: string) => {
              if (!dataBr || dataBr.trim() === '') return null;
              let isoDate = dataBr;
              if (!dataBr.includes('-')) {
                const partes = dataBr.split('/');
                if (partes.length === 3) {
                  isoDate = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                  return null;
                }
              }
              const dateObj = new Date(`${isoDate}T00:00:00`);
              const isValid = !isNaN(dateObj.getTime()) && dateObj.toISOString().split('T')[0] === isoDate;
              return isValid ? isoDate : null;
            };

            return {
              user_id: userData.user.id,
              estado: linha.estado || "GO",
              local: linha.local || "",
              decisor: linha.decisor || null,
              numero: linha.numero || linha.ncoligacao || null,
              referencia: linha.referencia || null,
              objeto: linha.objeto || null,
              valor: limpaNumero(linha.valor),
              vigencia: limpaData(linha.vigencia),
              fornecedor: linha.fornecedor || null,
              taxa: limpaNumero(linha.taxa),
              regiao: linha.regiao || null,
              
              // 👇 APLICAMOS A NOVA FUNÇÃO AQUI NOS HABITANTES:
              habitantes: limpaInteiro(linha.habitantes),
              
              distancia_km: limpaNumero(linha.distancia),
              qualificacao: linha.qualificacao || null,
              data_evento: limpaData(linha.data),
            };
          });

          const { error } = await supabase.from("registros").insert(dadosLimpos);

          if (error) throw error;

          alert(`Sucesso! ${dadosLimpos.length} registros foram importados para sua base.`);
          onSuccess(); 

        } catch (error) {
          console.error("Erro na importação:", error);
          alert("Ocorreu um erro ao importar o arquivo. Verifique o console.");
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error("Erro ao ler o CSV:", error);
        alert("Erro ao tentar ler o arquivo CSV.");
        setIsUploading(false);
      }
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
      >
        {isUploading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
        ) : (
          <><Upload className="mr-2 h-4 w-4" /> Carga em Massa (CSV)</>
        )}
      </Button>
    </div>
  );
}