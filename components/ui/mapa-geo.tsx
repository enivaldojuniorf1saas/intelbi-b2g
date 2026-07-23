"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Corrige o bug clássico do ícone sumindo no Next.js com Leaflet
const iconDefault = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

export default function MapaGeo({ registros }: { registros: any[] }) {
  const locaisComCoordenadas = registros.filter((r) => r.lat && r.lng);

  // Centro inicial do mapa (Centro do Brasil aproximado)
  const centroBrasil: [number, number] = [-15.7801, -47.9292];

  // ✨ A MÁGICA DA FRONTEIRA: Coordenadas extremas do Brasil [Sul, Oeste] até [Norte, Leste]
  const brasilBounds: L.LatLngBoundsExpression = [
    [-35.0, -75.0], // Ponto extremo Sudoeste (abaixo do RS e passando do Acre)
    [6.0, -34.0],   // Ponto extremo Nordeste (acima de Roraima e passando da Paraíba)
  ];

  const formatadorMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={centroBrasil}
        zoom={4}
        minZoom={4} // ✨ Impede o usuário de afastar demais a câmera
        maxBounds={brasilBounds} // ✨ Cria a "caixa" do Brasil
        maxBoundsViscosity={1.0} // ✨ Transforma a caixa numa parede rígida (não dá pra arrastar pra fora)
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {locaisComCoordenadas.map((local) => (
          <Marker key={local.id} position={[local.lat, local.lng]}>
            <Popup className="rounded-xl">
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-slate-800 text-sm">{local.local} - {local.estado}</h3>
                <p className="text-xs text-slate-500 mb-2 mt-0.5">{local.fornecedor || "Sem fornecedor atual"}</p>
                <div className="bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-md text-xs font-semibold mb-2">
                  Valor Estimado: {formatadorMoeda(local.valor)}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Hab: {local.habitantes || 0}</span>
                  <span className="text-blue-600">{local.qualificacao}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}