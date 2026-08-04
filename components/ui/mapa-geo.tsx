"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Building2, DollarSign, Activity, FileText, Calendar } from "lucide-react";

// Correção do bug de ícones nativos do Leaflet no Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Componente invisível para animação de câmera (FlyTo)
function FlyToUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
}

// ✨ NOVA FUNÇÃO: Cria a bolha visual do Cluster com Tailwind
const createClusterCustomIcon = function (cluster: any) {
  const count = cluster.getChildCount();
  
  // Lógica de cores baseada na quantidade de registros agrupados
  let bgClass = "bg-blue-600/90 border-blue-700"; // Padrão: Azul
  
  if (count >= 5 && count < 20) {
    bgClass = "bg-amber-500/90 border-amber-600"; // Médio: Amarelo
  } else if (count >= 20) {
    bgClass = "bg-rose-600/90 border-rose-700"; // Alto: Vermelho
  }

  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full border-[3px] text-white font-bold text-sm shadow-xl backdrop-blur-sm transition-transform hover:scale-110 ${bgClass}">
            ${count}
           </div>`,
    className: "custom-cluster-icon", // Remove a classe padrão transparente
    iconSize: L.point(40, 40, true),
  });
};

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
          iconCreateFunction={createClusterCustomIcon} // ✨ Injetamos o nosso design aqui!
        >
          {registros.map((reg: any) => (
            reg.lat && reg.lng && (
              <Marker key={reg.id} position={[reg.lat, reg.lng]}>
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
                      
                      {/* ✨ OBJETO */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Objeto</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate text-right" title={reg.objeto}>
                          {!reg.objeto || reg.objeto === "SEM OBJETO" ? "-" : reg.objeto}
                        </span>
                      </div>

                      {/* ✨ VALOR */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Valor Oport.</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${reg.valor && reg.valor >= 1000000 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700 bg-slate-100'}`}>
                          {reg.valor ? `R$ ${(reg.valor / 1000000).toFixed(2)}M` : "-"}
                        </span>
                      </div>

                      {/* ✨ VIGÊNCIA */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Vigência</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {reg.vigencia 
                            ? new Date(reg.vigencia + "T00:00:00").toLocaleDateString('pt-BR') 
                            : "-"}
                        </span>
                      </div>

                      {/* ✨ STATUS / QUALIFICAÇÃO */}
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
            )
          ))}
        </MarkerClusterGroup>
        
      </MapContainer>
    </div>
  );
}