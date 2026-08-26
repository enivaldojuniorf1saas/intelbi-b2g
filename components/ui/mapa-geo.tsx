"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Building2, DollarSign, Activity, FileText, Calendar } from "lucide-react";

// Necessário para os estilos básicos do mapa Leaflet carregarem corretamente
import "leaflet/dist/leaflet.css";

// ✨ 1. FUNÇÃO: Atualizador de Câmera (Faz o mapa "voar" para o estado selecionado)
function FlyToUpdater({ center, zoom }: any) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// ✨ 2. FUNÇÃO: Ícone do Agrupador (A bolinha azul que junta vários contratos)
const createClusterCustomIcon = function (cluster: any) {
  return L.divIcon({
    html: `<div class="bg-blue-600 text-white rounded-full flex items-center justify-center w-10 h-10 font-bold border-2 border-white shadow-md transition-transform hover:scale-110"><span>${cluster.getChildCount()}</span></div>`,
    className: "custom-cluster-icon bg-transparent",
    iconSize: L.point(40, 40, true),
  });
};

// ✨ 3. FUNÇÃO: Descobre o status baseado na diferença de dias exata do HOME
const getStatusVigencia = (vigencia: string, qualificacao: string) => {
  // Sem data ou vencido explicitamente -> Vermelho
  if (qualificacao === "VENCIDO" || !vigencia) return "vermelho";
  
  const dataVig = new Date(vigencia + "T00:00:00");
  const hoje = new Date(); 
  hoje.setHours(0, 0, 0, 0); // Zera as horas para a conta ser perfeitamente exata nos dias
  
  const diffDias = Math.ceil((dataVig.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  // Regras de negócio solicitadas:
  if (diffDias <= 30) return "vermelho";   // 0 a 30 dias (ou negativos/vencidos)
  if (diffDias <= 60) return "laranja";    // 31 a 60 dias
  if (diffDias <= 90) return "amarelo";    // 61 a 90 dias
  return "verde";                          // 91+ dias
};

// ✨ 4. FUNÇÃO: Cria um pino de mapa customizado com as 4 cores mapeadas
const getMarkerIcon = (status: string) => {
  let colorClass = "bg-emerald-500"; // Padrão Verde (91+ dias)
  
  if (status === "vermelho") colorClass = "bg-red-500";     // <= 30
  if (status === "laranja") colorClass = "bg-orange-500";   // <= 60
  if (status === "amarelo") colorClass = "bg-amber-500";    // <= 90

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8">
      <div class="absolute w-6 h-6 ${colorClass} rounded-full rounded-br-none -rotate-45 border-2 border-white shadow-md transition-transform hover:scale-110"></div>
      <div class="absolute w-2 h-2 bg-white rounded-full z-10 shadow-inner"></div>
    </div>
  `;

  return L.divIcon({
    className: "bg-transparent", 
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 32], // A ponta exata da agulha no mapa
    popupAnchor: [0, -32], // Onde o balãozinho vai abrir
  });
};

// ✨ 5. O COMPONENTE PRINCIPAL DO MAPA
export default function MapaGeo({ registros, center, zoom }: any) {
  return (
    <div className="h-full w-full [&_.leaflet-popup-content-wrapper]:p-0 [&_.leaflet-popup-content-wrapper]:overflow-hidden [&_.leaflet-popup-content-wrapper]:rounded-xl [&_.leaflet-popup-content]:m-0 [&_.leaflet-popup-content]:w-64 [&_.custom-cluster-icon]:bg-transparent">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false} 
      >
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        
        <FlyToUpdater center={center} zoom={zoom} />

        <MarkerClusterGroup
          chunkedLoading={true}
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          iconCreateFunction={createClusterCustomIcon} 
        >
          {registros?.map((reg: any) => {
            // Se não tiver coordenada, não desenha o pino
            if (!reg.lat || !reg.lng) return null;

            // Calcula a cor do semáforo antes de renderizar
            const status = getStatusVigencia(reg.vigencia, reg.qualificacao);

            return (
              <Marker 
                key={reg.id} 
                position={[reg.lat, reg.lng]}
                icon={getMarkerIcon(status)}
              >
                <Popup>
                  <div className="flex flex-col bg-white">
                    <div className="bg-slate-50 border-b border-slate-100 p-3">
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 p-1.5 rounded shrink-0 mt-0.5">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight">
                            {reg.local} <span className="text-slate-400 font-medium">({reg.estado})</span>
                          </h4>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 truncate max-w-[180px]" title={reg.fornecedor}>
                            {reg.fornecedor || "Fornecedor N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5">
                      
                      {/* OBJETO */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Objeto</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate text-right" title={reg.objeto}>
                          {!reg.objeto || reg.objeto === "SEM OBJETO" ? "-" : reg.objeto}
                        </span>
                      </div>

                      {/* VALOR */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Valor Oport.</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${reg.valor && reg.valor >= 1000000 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700 bg-slate-100'}`}>
                          {reg.valor ? `R$ ${(reg.valor / 1000000).toFixed(2)}M` : "-"}
                        </span>
                      </div>

                      {/* VIGÊNCIA E SEMÁFORO DE CORES */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Vigência</span>
                        </div>
                        {/* A cor do texto também acompanha a cor do pino agora! */}
                        <span className={`text-xs font-bold ${
                          status === 'vermelho' ? 'text-red-600' : 
                          status === 'laranja' ? 'text-orange-600' : 
                          status === 'amarelo' ? 'text-amber-600' : 
                          'text-emerald-600'
                        }`}>
                          {reg.vigencia 
                            ? new Date(reg.vigencia + "T00:00:00").toLocaleDateString('pt-BR') 
                            : "-"}
                        </span>
                      </div>

                      {/* STATUS / QUALIFICAÇÃO */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Activity className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Status</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {reg.qualificacao || "Pendente"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}