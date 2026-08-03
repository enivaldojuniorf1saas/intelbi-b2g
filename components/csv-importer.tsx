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
  // Estado para controlar se o sistema está a processar o ficheiro
  const [isUploading, setIsUploading] = useState(false);
  // Referência para o input de ficheiro oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return; // Se o utilizador cancelar a seleção, não faz nada

    setIsUploading(true);

    // Utilizamos o PapaParse para ler o CSV de forma rápida no navegador
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      delimiter: ";", 
      // Transforma "Região" em "regiao", facilitando o mapeamento
      transformHeader: (header) => {
        return header
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      },
      complete: async (results) => {
        try {
          // 1. Verifica se o utilizador está autenticado
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw new Error("Usuário não autenticado");

          // 2. Mapeamento e limpeza dos dados lidos do CSV
          const dadosLimpos = results.data.map((linha: any) => {
            
            // Função para converter "1.000,50" em 1000.50
            const limpaNumero = (valor?: string) => {
              if (valor === undefined || valor === null || valor.trim() === '') return null;
              const numeroLimpo = valor.toString().replace(/[^0-9,-]/g, '').replace(',', '.');
              const float = parseFloat(numeroLimpo);
              return isNaN(float) ? null : float;
            };

            // Função para limpar números inteiros (ex: habitantes)
            const limpaInteiro = (valor?: string) => {
              const num = limpaNumero(valor);
              return num !== null ? Math.round(num) : null; 
            };

            // Função para garantir que a data vai no formato AAA-MM-DD para o banco
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

            // Retorna o objeto exatamente como a tabela "registros" espera
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

          // 3. Alta Performance: Inserindo em Pacotes (Chunks) de 300
          const TAMANHO_PACOTE = 300;
          for (let i = 0; i < dadosLimpos.length; i += TAMANHO_PACOTE) {
            const pacote = dadosLimpos.slice(i, i + TAMANHO_PACOTE);
            
            const { error } = await supabase.from("registros").insert(pacote);
            
            if (error) {
              console.error(`Erro ao inserir pacote ${i} até ${i + TAMANHO_PACOTE}:`, error);
              throw error; 
            }
          }

          // 4. Sucesso e Reset
          alert(`Sucesso! ${dadosLimpos.length} registos foram importados em lotes para a tua base.`);
          onSuccess(); 

        } catch (error) {
          console.error("Erro na importação:", error);
          alert("Ocorreu um erro ao importar o ficheiro. Verifica se os dados da planilha estão corretos.");
        } finally {
          setIsUploading(false);
          // Limpa o input para permitir selecionar o mesmo ficheiro novamente se necessário
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error("Erro ao ler o CSV:", error);
        alert("Erro ao tentar ler o ficheiro CSV.");
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
        className="hidden" // Escondemos o input nativo para usar o nosso botão bonito
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