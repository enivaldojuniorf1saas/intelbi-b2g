"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, Wrench } from "lucide-react";

// Dicionário com as coordenadas exatas de todas as Capitais do Brasil
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

const normalizar = (t: string) => t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
// Corta o "- UF" do nome para fazer o match perfeito
const extrairNome = (t: string) => normalizar(t).split('-')[0].trim();

export default function ManutencaoPage() {
  const { isInterno } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const rodarScript = async () => {
    setIsProcessing(true);
    setLog([]);
    addLog("Iniciando modo Deus (Auto-Cura)...");

    try {
      addLog("1. Baixando Censo 2022 do IBGE (Brasil inteiro)...");
      const resPop = await fetch("https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6[all]");
      const popData = await resPop.json();
      
      const popMap: Record<string, number> = {};
      if (popData.length > 0) {
        const series = popData[0].resultados[0].series;
        for (const s of series) {
          const partes = s.localidade.nome.split(" - ");
          if (partes.length === 2) {
             const key = `${extrairNome(partes[0])}_${partes[1].trim().toUpperCase()}`;
             const popStr = s.serie["2022"];
             if (popStr && popStr !== "-" && popStr !== "...") {
               popMap[key] = parseInt(popStr.replace(/\D/g, ''));
             }
          }
        }
      }
      addLog(`✅ IBGE carregado (${Object.keys(popMap).length} municípios).`);

      addLog("2. Buscando tabela base de Municípios (Supabase)...");
      const { data: municipiosDb, error: errMun } = await supabase.from('municipios').select('local, estado, lat, lng');
      if (errMun) throw errMun;

      addLog("3. Buscando registros para auditar...");
      const { data: registros, error } = await supabase.from('registros').select('id, local, estado, lat, lng, habitantes, distancia_km');
      if (error) throw error;
      
      const paraAtualizar = [];

      for (const reg of registros || []) {
        let novaLat = reg.lat;
        let novaLng = reg.lng;
        let novaDist = reg.distancia_km;
        let novaPop = reg.habitantes;
        let mudou = false;

        // ✨ AUTO-CURA 1: SE O CSV SUBIU SEM LAT/LNG, RECUPERAMOS AQUI!
        if (!novaLat || !novaLng) {
           const matchMun = municipiosDb?.find(m => m.estado === reg.estado && extrairNome(m.local) === extrairNome(reg.local));
           if (matchMun) {
             novaLat = matchMun.lat;
             novaLng = matchMun.lng;
             mudou = true;
           }
        }

        // ✨ AUTO-CURA 2: FORÇA O RECÁLCULO DA DISTÂNCIA
        if (novaLat && novaLng && reg.estado && CAPITAIS_COORD[reg.estado]) {
          const cap = CAPITAIS_COORD[reg.estado];
          const calc = calcularDistancia(cap.lat, cap.lng, Number(novaLat), Number(novaLng));
          if (calc !== novaDist) {
            novaDist = calc;
            mudou = true;
          }
        }

        // ✨ AUTO-CURA 3: FORÇA A ATUALIZAÇÃO DA POPULAÇÃO
        if (reg.local && reg.estado) {
          const chave = `${extrairNome(reg.local)}_${reg.estado}`;
          if (popMap[chave] && popMap[chave] !== novaPop) {
            novaPop = popMap[chave];
            mudou = true;
          }
        }

        if (mudou) {
          paraAtualizar.push({ id: reg.id, lat: novaLat, lng: novaLng, distancia_km: novaDist, habitantes: novaPop });
        }
      }

      addLog(`🔍 Encontrei ${paraAtualizar.length} registros com dados faltantes (Lat/Lng, Distância ou População).`);

      if (paraAtualizar.length > 0) {
        addLog("4. Injetando correções no banco em lote...");
        const promessas = paraAtualizar.map(item => 
          supabase.from('registros').update({ 
             lat: item.lat, 
             lng: item.lng, 
             distancia_km: item.distancia_km, 
             habitantes: item.habitantes 
          }).eq('id', item.id)
        );
        
        await Promise.all(promessas);
        addLog(`✅ Todos os ${paraAtualizar.length} registros foram curados com sucesso! Verifique a página de registros.`);
      } else {
        addLog("Nenhuma correção necessária. Seu banco está perfeito!");
      }

    } catch (err: any) {
      console.error(err);
      addLog(`❌ ERRO: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isInterno) return null;

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-10 flex justify-center items-center">
      <div className="max-w-2xl w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-orange-100 p-4 rounded-full"><Wrench className="h-8 w-8 text-orange-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Robô de Manutenção de Dados</h1>
            <p className="text-slate-500">Recupera Coordenadas, Distâncias e injeta Censo IBGE nos registros.</p>
          </div>
        </div>

        <div className="bg-slate-900 text-emerald-400 font-mono text-sm p-5 rounded-lg h-64 overflow-y-auto mb-6 custom-scrollbar shadow-inner">
          {log.length === 0 ? <span className="text-slate-600">Aguardando inicialização do sistema...</span> : 
            log.map((l, i) => <div key={i} className="mb-2">{`> ${l}`}</div>)
          }
        </div>

        <Button onClick={rodarScript} disabled={isProcessing} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg transition-transform active:scale-95">
          {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Auditando e Corrigindo Banco...</> : "Rodar Auto-Cura Completa"}
        </Button>
      </div>
    </div>
  );
}