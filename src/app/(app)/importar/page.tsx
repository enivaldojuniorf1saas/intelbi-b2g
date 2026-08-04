"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const normalizar = (texto: string) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export default function ImportarPage() {
  const { isInterno } = useAuth();
  
  const [estado, setEstado] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ tipo: "sucesso" | "erro" | "aviso", texto: string } | null>(null);

  const processarCSV = async () => {
    if (!estado) return setStatusMsg({ tipo: "erro", texto: "Selecione o Estado primeiro." });
    if (!file) return setStatusMsg({ tipo: "erro", texto: "Selecione um arquivo CSV." });

    setIsProcessing(true);
    setStatusMsg(null);

    try {
      const { data: dbMunicipios, error: munError } = await supabase
        .from("municipios")
        .select("id, local, lat, lng, habitantes, distancia_km, regiao")
        .eq("estado", estado);

      if (munError) throw munError;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => normalizar(header),
        complete: (results) => {
          const linhas = results.data as any[];
          
          if (linhas.length === 0) {
            setStatusMsg({ tipo: "erro", texto: "O arquivo parece estar vazio ou num formato inválido." });
            setIsProcessing(false);
            return;
          }

          const dadosEnriquecidos = linhas.map((linha) => {
            const nomeCidadeCSV = linha.local || linha.municipio || linha.cidade || "";
            const match = dbMunicipios?.find(
              (m) => normalizar(m.local) === normalizar(nomeCidadeCSV)
            );

            // ✨ REGRA 2: Se não houver valor, preenche com 0 (R$ 0,00)
            let valorLimpo = 0;
            if (linha.valor !== undefined && linha.valor !== null && String(linha.valor).trim() !== "") {
              const n = parseFloat(String(linha.valor));
              if (!isNaN(n)) valorLimpo = n; 
            }

            // ✨ REGRA 1: Se não houver objeto, preenche com "SEM OBJETO"
            const objetoTratado = linha.objeto && String(linha.objeto).trim() !== "" 
              ? String(linha.objeto).trim().toUpperCase() 
              : "SEM OBJETO";

            // Checagem de vigência para a Regra 3
            const temVigencia = linha.vigencia && String(linha.vigencia).trim() !== "";

            return {
              ...linha,
              estado: estado,
              local: match ? match.local : nomeCidadeCSV.toUpperCase(),
              
              lat: match ? match.lat : null,
              lng: match ? match.lng : null,
              habitantes_auto: match ? match.habitantes : null,
              distancia_auto: match ? match.distancia_km : null,
              regiao_auto: match ? match.regiao : null,
              
              objeto_tratado: objetoTratado,
              valor_tratado: valorLimpo, 
              tem_vigencia: temVigencia,
              
              _status: !match ? "nao_encontrado" : "ok"
            };
          });

          setPreviewData(dadosEnriquecidos);
          setIsProcessing(false);
        },
        error: (err) => {
          console.error(err);
          setStatusMsg({ tipo: "erro", texto: "Erro na leitura bruta do CSV." });
          setIsProcessing(false);
        }
      });

    } catch (error: any) {
      console.error("Erro ao buscar municípios:", error);
      const detalhe = error?.message || error?.error_description || JSON.stringify(error);
      setStatusMsg({ tipo: "erro", texto: `Falha ao buscar municípios: ${detalhe}` });
      setIsProcessing(false);
    }
  };

  const salvarNoBanco = async () => {
    if (previewData.length === 0) return;
    
    const cidadesComErro = previewData.filter(d => d._status === "nao_encontrado");
    if (cidadesComErro.length > 0) {
      alert(`Corrija as ${cidadesComErro.length} cidades não encontradas antes de importar.`);
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado para importar.");

      const payload = previewData.map(d => {
        let vigenciaTratada = null;
        let qualificacaoTratada = (d.qualificacao || "Pendente").toUpperCase();

        if (d.tem_vigencia) {
          const v = String(d.vigencia).trim().split(' ')[0];

          // ✨ A MAGIA DA AUTO-CURA DE DATAS (Impede dias impossíveis como 31/11)
          const corrigirData = (ano: number, mes: number, dia: number) => {
            const m = Math.min(Math.max(mes, 1), 12); // Trava o mês entre 1 e 12
            const ultimoDia = new Date(ano, m, 0).getDate(); // Descobre o último dia daquele mês
            const d = Math.min(dia, ultimoDia); // Trava o dia para não passar do limite
            return `${ano}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          };

          if (v.includes('/')) {
            const partes = v.split('/');
            if (partes.length === 3) {
              const p1 = parseInt(partes[0], 10);
              const p2 = parseInt(partes[1], 10);
              const p3 = parseInt(partes[2], 10);
              
              if (p3 > 1000) {
                if (p2 > 12) {
                  // Formato EUA (MM/DD/YYYY)
                  vigenciaTratada = corrigirData(p3, p1, p2);
                } else {
                  // Formato BR (DD/MM/YYYY)
                  vigenciaTratada = corrigirData(p3, p2, p1);
                }
              }
            }
          }
          else if (v.includes('-')) {
            const partes = v.split('-');
            if (partes.length === 3) {
              const p1 = parseInt(partes[0], 10);
              const p2 = parseInt(partes[1], 10);
              const p3 = parseInt(partes[2], 10);
              
              if (p1 > 1000) {
                // Formato Padrão Banco (YYYY-MM-DD)
                vigenciaTratada = corrigirData(p1, p2, p3);
              } else if (p3 > 1000) {
                // Formato (DD-MM-YYYY)
                if (p2 > 12) {
                  vigenciaTratada = corrigirData(p3, p1, p2);
                } else {
                  vigenciaTratada = corrigirData(p3, p2, p1);
                }
              }
            }
          }
        } else {
          qualificacaoTratada = "VENCIDO";
        }

        return {
          user_id: user.id,
          estado: d.estado,
          local: d.local,
          lat: d.lat,
          lng: d.lng,
          
          objeto: d.objeto_tratado, // Regra 1: "SEM OBJETO"
          valor: d.valor_tratado,   // Regra 2: R$ 0,00
          vigencia: vigenciaTratada, 
          qualificacao: qualificacaoTratada, // Regra 3: "VENCIDO"
          
          fornecedor: (d.fornecedor || "").toUpperCase(),
          decisor: (d["nome i"] || d.decisor || "").toUpperCase(),
          referencia: (d["nome ii"] || d.referencia || "").toUpperCase(),
          numero: d.numero || "",
          
          taxa: d.taxa ? parseFloat(String(d.taxa).replace(',', '.').replace('%', '')) : null,
          regiao: d.regiao_auto || (d.regiao || "").toUpperCase(),
          habitantes: d.habitantes_auto || (d.habitantes ? parseInt(String(d.habitantes).replace(/\D/g, '')) : null),
          distancia_km: d.distancia_auto || (d.distancia ? parseFloat(String(d.distancia).replace(/KM/i, '').replace(',', '.').trim()) : null)
        };
      });

      const { error } = await supabase.from("registros").insert(payload);
      if (error) throw error;

      setStatusMsg({ tipo: "sucesso", texto: `${payload.length} contratos importados e geolocalizados no mapa com sucesso!` });
      setPreviewData([]);
      setFile(null);
      setEstado("");

    } catch (error: any) {
      console.error("Erro do Supabase:", error);
      setStatusMsg({ tipo: "erro", texto: error.message || "O servidor recusou alguns dados. Verifique a formatação." });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isInterno) {
    return <div className="p-8 text-center text-slate-500 font-medium flex items-center justify-center h-screen">Área restrita à Gestão.</div>;
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-blue-100 p-2.5 rounded-xl border border-blue-200">
          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importação Automática</h1>
          <p className="text-sm text-slate-500">Suba o arquivo CSV e injete coordenadas instantaneamente.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">1. Selecione a UF</label>
              <Select value={estado} onValueChange={setEstado} disabled={isProcessing || isUploading}>
                <SelectTrigger className="bg-white border-slate-300 h-11"><SelectValue placeholder="Escolha..." /></SelectTrigger>
                <SelectContent>{ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">2. Anexar o CSV</label>
              <Input 
                type="file" 
                accept=".csv" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="bg-white border-slate-300 h-11 file:bg-blue-50 file:text-blue-700 file:font-semibold file:border-0 file:mr-4 file:px-3 file:py-1 file:rounded-md cursor-pointer"
                disabled={isProcessing || isUploading}
              />
            </div>

            <Button 
              onClick={processarCSV} 
              disabled={!estado || !file || isProcessing || isUploading}
              className="bg-slate-800 hover:bg-slate-900 text-white h-11 font-bold shadow-md transition-transform active:scale-95"
            >
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : "Mapear Municípios"}
            </Button>

          </div>

          {statusMsg && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm ${
              statusMsg.tipo === "sucesso" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : 
              statusMsg.tipo === "erro" ? "bg-rose-50 text-rose-700 border border-rose-200" : 
              "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {statusMsg.tipo === "sucesso" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {statusMsg.texto}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {previewData.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 text-center">Status</TableHead>
                  <TableHead className="font-bold text-slate-700">MUNICÍPIO (IBGE)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">GEOLOCALIZAÇÃO</TableHead>
                  <TableHead className="font-bold text-slate-700">OBJETO (CONTRATO)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right pr-6">VALOR R$</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((linha, i) => (
                  <TableRow key={i} className={linha._status !== "ok" ? "bg-rose-50/50" : "hover:bg-blue-50/30"}>
                    
                    <TableCell className="text-center">
                      {linha._status === "ok" 
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> 
                        : <AlertCircle className="h-4 w-4 text-rose-500 mx-auto" title="Município não encontrado!" />}
                    </TableCell>
                    
                    <TableCell className="font-bold text-slate-800 uppercase">{linha.local}</TableCell>
                    
                    <TableCell className="text-center">
                      {linha.lat && linha.lng ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">
                          <MapPin className="h-3 w-3" /> Conectado
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200">
                          <AlertCircle className="h-3 w-3" /> S/ Coordenadas
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-sm text-slate-600 truncate max-w-[200px]">
                      {linha.objeto_tratado}
                    </TableCell>
                    
                    <TableCell className="text-right font-semibold text-slate-700 pr-6">
                      {`R$ ${linha.valor_tratado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <UploadCloud className="h-12 w-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">Aguardando planilha...</p>
              <p className="text-sm mt-1 text-slate-400">Certifique-se de que o arquivo esteja em formato .csv</p>
            </div>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">
              Prontos para subir: <strong className="text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm ml-1">{previewData.length} registros</strong>
            </div>
            
            <Button 
              onClick={salvarNoBanco} 
              disabled={isUploading || previewData.some(d => d._status === "nao_encontrado")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 shadow-md transition-transform active:scale-95"
            >
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Injetando no Banco...</> : <><ArrowRight className="mr-2 h-4 w-4" /> Importar para o Mapa</>}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}