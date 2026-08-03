"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Building2, DollarSign, Activity, FileText } from "lucide-react";

// Correção do bug de ícones nativos do Leaflet no Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ✨ COMPONENTE INVISÍVEL PARA ANIMAÇÃO DE CÂMERA (FlyTo)
function FlyToUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    // A mágica acontece aqui: uma animação suave de 1.5s até o novo estado
    map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
}

export default function MapaGeo({ registros, center, zoom }: any) {
  return (
    // Escondendo os estilos feios nativos do Popup do leaflet com CSS local
    <div className="h-full w-full [&_.leaflet-popup-content-wrapper]:p-0 [&_.leaflet-popup-content-wrapper]:overflow-hidden [&_.leaflet-popup-content-wrapper]:rounded-xl [&_.leaflet-popup-content]:m-0 [&_.leaflet-popup-content]:w-64">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false} // Esconde os botões +/- pra interface ficar mais limpa
      >
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
        />
        
        {/* Injeta a função que atualiza a câmera no mapa */}
        <FlyToUpdater center={center} zoom={zoom} />

        {registros.map((reg: any) => (
          reg.lat && reg.lng && (
            <Marker key={reg.id} position={[reg.lat, reg.lng]}>
              <Popup>
                {/* ✨ O NOSSO CARD ENRIQUECIDO AQUI DENTRO DO POPUP */}
                <div className="flex flex-col bg-white">
                  
                  {/* Cabeçalho do Card */}
                  <div className="bg-slate-50 border-b border-slate-100 p-3">
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1.5 rounded shrink-0 mt-0.5">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 leading-tight">
                          {reg.local} <span className="text-slate-400 font-medium">({reg.estado})</span>
                        </h4>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 truncate max-w-[180px]">
                          {reg.fornecedor || "Fornecedor N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-3 space-y-2.5">
                    
                    {/* Linha: Valor */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">Valor Oport.</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${reg.valor && reg.valor >= 1000000 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700 bg-slate-100'}`}>
                        {reg.valor ? `R$ ${(reg.valor / 1000000).toFixed(2)}M` : "-"}
                      </span>
                    </div>

                    {/* Linha: Qualificação / Status */}
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
      </MapContainer>
    </div>
  );
}