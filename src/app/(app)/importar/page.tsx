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

const CAPITAIS_COORD: Record<string, { lat: number, lng: number }> = {
  AC: { lat: -9.974, lng: -67.807 }, AL: { lat: -9.665, lng: -35.735 },
  AP: { lat: 0.034, lng: -51.066 }, AM: { lat: -3.101, lng: -60.025 },
  BA: { lat: -12.971, lng: -38.510 }, CE: { lat: -3.717, lng: -38.543 },
  DF: { lat: -15.779, lng: -47.929 }, ES: { lat: -20.315, lng: -40.312 },
  GO: { lat: -16.679, lng: -49.253 }, MA: { lat: -2.538, lng: -44.282 },
  MT: { lat: -15.596, lng: -56.096 }, MS: { lat: -20.442, lng: -54.646 },
  MG: { lat: -19.920, lng: -43.937 }, PA: { lat: -1.455, lng: -48.502 },
  PB: { lat: -7.115, lng: -34.863 }, PR: { lat: -25.428, lng: -49.273 },
  PE: { lat: -8.057, lng: -34.882 }, PI: { lat: -5.089, lng: -42.801 },
  RJ: { lat: -22.906, lng: -43.172 }, RN: { lat: -5.794, lng: -35.211 },
  RS: { lat: -30.027, lng: -51.228 }, RO: { lat: -8.761, lng: -63.903 },
  RR: { lat: 2.819, lng: -60.673 }, SC: { lat: -27.596, lng: -48.549 },
  SP: { lat: -23.548, lng: -46.636 }, SE: { lat: -10.947, lng: -37.073 },
  TO: { lat: -10.212, lng: -48.360 }
};

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const normalizar = (texto: string) => texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
// ✨ REGRA CEGA: Corta qualquer "- UF" que tiver no nome do município para garantir o match
const extrairNome = (texto: string) => normalizar(texto).split('-')[0].trim();

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
      const [dbResponse, ibgeResponse, ibgePopResponse] = await Promise.all([
        supabase.from("municipios").select("id, local, lat, lng, regiao").eq("estado", estado),
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`),
        fetch(`https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6[all]`)
      ]);

      if (dbResponse.error) throw dbResponse.error;
      const dbMunicipios = dbResponse.data;
      let ibgeData: any[] = ibgeResponse.ok ? await ibgeResponse.json() : [];
      let ibgePopData: any[] = ibgePopResponse.ok ? await ibgePopResponse.json() : [];

      const popMap: Record<string, number> = {};
      if (ibgePopData.length > 0) {
        const series = ibgePopData[0].resultados[0].series;
        for (const s of series) {
          const partes = s.localidade.nome.split(" - ");
          if (partes.length === 2) {
             const key = `${extrairNome(partes[0])}_${partes[1].trim().toUpperCase()}`;
             const popStr = s.serie["2022"];
             if (popStr && popStr !== "-" && popStr !== "...") popMap[key] = parseInt(popStr.replace(/\D/g, ''));
          }
        }
      }

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
            const nomeLimpo = extrairNome(nomeCidadeCSV);
            
            // ✨ MATCH BLINDADO: Usando a extração do nome para driblar o "- UF"
            const match = dbMunicipios?.find((m) => extrairNome(m.local) === nomeLimpo);
            const matchIbge = ibgeData.find((cidade: any) => extrairNome(cidade.nome) === nomeLimpo);
            const mesorregiao = matchIbge?.microrregiao?.mesorregiao?.nome || null;

            let distCalculada = null;
            if (match?.lat && match?.lng && CAPITAIS_COORD[estado]) {
               const cap = CAPITAIS_COORD[estado];
               distCalculada = calcularDistancia(cap.lat, cap.lng, match.lat, match.lng);
            }

            let habBuscado = null;
            const chavePop = `${nomeLimpo}_${estado}`;
            if (popMap[chavePop]) habBuscado = popMap[chavePop];

            let valorLimpo = 0;
            if (linha.valor && String(linha.valor).trim() !== "") {
              let textoValor = String(linha.valor).trim().replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
              const n = parseFloat(textoValor);
              if (!isNaN(n)) valorLimpo = n; 
            }

            const objetoTratado = linha.objeto && String(linha.objeto).trim() !== "" ? String(linha.objeto).trim().toUpperCase() : "SEM OBJETO";
            const temVigencia = linha.vigencia && String(linha.vigencia).trim() !== "";

            return {
              ...linha,
              estado: estado,
              local: match ? match.local : nomeCidadeCSV.toUpperCase(),
              orgao: (linha.orgao || "").trim().toUpperCase(),
              
              lat: match ? match.lat : null,
              lng: match ? match.lng : null,
              habitantes_auto: habBuscado,
              distancia_auto: distCalculada,
              regiao_auto: mesorregiao || (match ? match.regiao : null),
              
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
      setStatusMsg({ tipo: "erro", texto: `Falha ao processar dados: ${error.message}` });
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
          const corrigirData = (ano: number, mes: number, dia: number) => {
            const m = Math.min(Math.max(mes, 1), 12); 
            const ultimoDia = new Date(ano, m, 0).getDate(); 
            const d = Math.min(dia, ultimoDia); 
            return `${ano}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          };

          if (v.includes('/')) {
            const partes = v.split('/');
            if (partes.length === 3) {
              const p1 = parseInt(partes[0], 10);
              const p2 = parseInt(partes[1], 10);
              const p3 = parseInt(partes[2], 10);
              if (p3 > 1000) vigenciaTratada = p2 > 12 ? corrigirData(p3, p1, p2) : corrigirData(p3, p2, p1);
            }
          } else if (v.includes('-')) {
            const partes = v.split('-');
            if (partes.length === 3) {
              const p1 = parseInt(partes[0], 10);
              const p2 = parseInt(partes[1], 10);
              const p3 = parseInt(partes[2], 10);
              if (p1 > 1000) vigenciaTratada = corrigirData(p1, p2, p3);
              else if (p3 > 1000) vigenciaTratada = p2 > 12 ? corrigirData(p3, p1, p2) : corrigirData(p3, p2, p1);
            }
          }
        } else {
          qualificacaoTratada = "VENCIDO";
        }

        return {
          user_id: user.id,
          estado: d.estado,
          local: d.local,
          orgao: d.orgao,
          lat: d.lat,
          lng: d.lng,
          objeto: d.objeto_tratado,
          valor: d.valor_tratado,
          vigencia: vigenciaTratada, 
          qualificacao: qualificacaoTratada, 
          fornecedor: (d.fornecedor || "").toUpperCase(),
          decisor: (d["nome i"] || d.decisor || "").toUpperCase(),
          referencia: (d["nome ii"] || d.referencia || "").toUpperCase(),
          numero: d.numero || "",
          taxa: d.taxa ? parseFloat(String(d.taxa).replace(',', '.').replace('%', '')) : null,
          regiao: d.regiao_auto || (d.regiao || "").toUpperCase(),
          habitantes: d.habitantes_auto,
          distancia_km: d.distancia_auto
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

  if (!isInterno) return null;

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-blue-100 p-2.5 rounded-xl border border-blue-200">
          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importação Automática</h1>
          <p className="text-sm text-slate-500">Suba o arquivo CSV e injete coordenadas e distâncias instantaneamente.</p>
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
                type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="bg-white border-slate-300 h-11 file:bg-blue-50 file:text-blue-700 file:font-semibold file:border-0 file:mr-4 file:px-3 file:py-1 file:rounded-md cursor-pointer"
                disabled={isProcessing || isUploading}
              />
            </div>
            <Button onClick={processarCSV} disabled={!estado || !file || isProcessing || isUploading} className="bg-slate-800 hover:bg-slate-900 text-white h-11 font-bold shadow-md">
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : "Mapear Municípios"}
            </Button>
          </div>
          {statusMsg && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm ${statusMsg.tipo === "sucesso" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : statusMsg.tipo === "erro" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
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
                  <TableHead className="font-bold text-slate-700 text-center">POPULAÇÃO</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">DISTÂNCIA</TableHead>
                  <TableHead className="font-bold text-slate-700">OBJETO</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right pr-6">VALOR R$</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((linha, i) => (
                  <TableRow key={i} className={linha._status !== "ok" ? "bg-rose-50/50" : "hover:bg-blue-50/30"}>
                    <TableCell className="text-center">
                      {linha._status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <AlertCircle className="h-4 w-4 text-rose-500 mx-auto" />}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 uppercase">{linha.local}</TableCell>
                    <TableCell className="text-center">
                      {linha.lat && linha.lng ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200"><MapPin className="h-3 w-3" /> Conectado</div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200"><AlertCircle className="h-3 w-3" /> Erro</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-600 font-semibold">{linha.habitantes_auto ? linha.habitantes_auto.toLocaleString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-center text-slate-600 font-semibold">{linha.distancia_auto ? `${linha.distancia_auto} KM` : '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600 truncate max-w-[150px]">{linha.objeto_tratado}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-700 pr-6">{`R$ ${linha.valor_tratado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <UploadCloud className="h-12 w-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">Aguardando planilha...</p>
            </div>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Prontos para subir: <strong className="text-slate-900">{previewData.length} registros</strong></div>
            <Button onClick={salvarNoBanco} disabled={isUploading || previewData.some(d => d._status === "nao_encontrado")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 shadow-md">
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Injetando...</> : <><ArrowRight className="mr-2 h-4 w-4" /> Importar</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}