"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ✨ Criamos ícones HTML puros para não depender de arquivos de imagem. São levinhos e bonitos!
const createCustomIcon = (colorClass: string, ringClass: string) => {
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div class="w-5 h-5 rounded-full shadow-md border-2 border-white flex items-center justify-center ${colorClass} ${ringClass}"><div class="w-1.5 h-1.5 bg-white rounded-full opacity-80"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Centraliza o pin
    popupAnchor: [0, -12], // Faz o balãozinho abrir um pouco acima do pin
  });
};

const icons = {
  vermelho: createCustomIcon("bg-red-500", "ring-2 ring-red-200"),
  laranja: createCustomIcon("bg-orange-500", "ring-2 ring-orange-200"),
  amarelo: createCustomIcon("bg-amber-500", "ring-2 ring-amber-200"),
  azul: createCustomIcon("bg-blue-500", "ring-2 ring-blue-200"),
  default: createCustomIcon("bg-slate-400", "ring-2 ring-slate-200"),
};

export default function MapaCliente({ registros }: { registros: any[] }) {
  // Coordenadas que centralizam o mapa no Brasil
  const center: [number, number] = [-14.235, -51.925];

  return (
    <MapContainer 
      center={center} 
      zoom={4} 
      className="w-full h-full rounded-xl z-0" 
      style={{ minHeight: '600px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {registros.map((reg) => {
        // Pega as coordenadas e converte para número
        const lat = Number(reg.lat);
        const lng = Number(reg.lng);

        // Se a latitude ou longitude for inválida (0, null, NaN), não renderiza o pin
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

        let icon = icons.default;
        if (reg.diasRestantes <= 30) icon = icons.vermelho;
        else if (reg.diasRestantes <= 60) icon = icons.laranja;
        else if (reg.diasRestantes <= 90) icon = icons.amarelo;
        else if (reg.diasRestantes <= 120) icon = icons.azul;

        return (
          <Marker key={reg.id} position={[lat, lng]} icon={icon}>
            <Popup className="rounded-lg">
              <div className="p-1 min-w-[200px] max-w-[250px]">
                <h3 className="font-bold text-slate-900 text-[13px] uppercase tracking-tight">{reg.local} - {reg.estado}</h3>
                <p className="text-xs text-slate-600 mt-1.5 font-medium line-clamp-3" title={reg.objeto}>
                  {reg.objeto || "Objeto não especificado"}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Vigência</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(reg.vigencia).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm
                    ${reg.diasRestantes <= 30 ? 'bg-red-500' : reg.diasRestantes <= 60 ? 'bg-orange-500' : reg.diasRestantes <= 90 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                    {reg.diasRestantes} dias
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}