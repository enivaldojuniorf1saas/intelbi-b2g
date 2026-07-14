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
      encoding: "UTF-8",
      delimiter: ";", 
      transformHeader: (header) => {
        return header
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      },
      complete: async (results) => {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw new Error("Usuário não autenticado");

          const dadosLimpos = results.data.map((linha: any) => {
            const limpaNumero = (valor?: string) => {
              if (valor === undefined || valor === null || valor.trim() === '') return null;
              const numeroLimpo = valor.toString().replace(/[^0-9,-]/g, '').replace(',', '.');
              const float = parseFloat(numeroLimpo);
              return isNaN(float) ? null : float;
            };

            const limpaInteiro = (valor?: string) => {
              const num = limpaNumero(valor);
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
              estado: (linha.estado || "GO").trim().toUpperCase(),
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
              habitantes: limpaInteiro(linha.habitantes),
              distancia_km: limpaNumero(linha.distancia),
              qualificacao: linha.qualificacao || null,
              data_evento: limpaData(linha.data),
            };
          });

          // ✨ A MÁGICA DA ALTA PERFORMANCE: Inserindo em Pacotes (Chunks) de 300
          const TAMANHO_PACOTE = 300;
          for (let i = 0; i < dadosLimpos.length; i += TAMANHO_PACOTE) {
            const pacote = dadosLimpos.slice(i, i + TAMANHO_PACOTE);
            
            const { error } = await supabase.from("registros").insert(pacote);
            
            if (error) {
              console.error(`Erro ao inserir pacote ${i} até ${i + TAMANHO_PACOTE}:`, error);
              throw error; // Trava e avisa se o banco rejeitar algo
            }
          }

          alert(`Sucesso!!! ${dadosLimpos.length} registros foram importados em lotes para sua base.`);
          onSuccess(); 

        } catch (error) {
          console.error("Erro na importação:", error);
          alert("Ocorreu um erro ao importar o arquivo. Verifique se os dados da planilha estão corretos.");
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
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando Lotes...</>
        ) : (
          <><Upload className="mr-2 h-4 w-4" /> Carga em Massa (CSV)</>
        )}
      </Button>
    </div>
  );
}