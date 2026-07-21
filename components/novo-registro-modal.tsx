"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { registroSchema, RegistroInput } from "../lib/validations/registro";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

// ============================================================================
// CONSTANTES E FUNÇÕES AUXILIARES GLOBAIS
// ============================================================================
const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const QUALIFICACOES = [
  "Selecione", "Transacionando", "Disputando", "Tramitando", "Quente", "Morna", "Fria", "Agendada"
];

const REGIAO_MAP: Record<string, string> = {
  AC: "Norte", AL: "Nordeste", AP: "Norte", AM: "Norte", BA: "Nordeste",
  CE: "Nordeste", DF: "Centro-Oeste", ES: "Sudeste", GO: "Centro-Oeste",
  MA: "Nordeste", MT: "Centro-Oeste", MS: "Centro-Oeste", MG: "Sudeste",
  PA: "Norte", PB: "Nordeste", PR: "Sul", PE: "Nordeste", PI: "Nordeste",
  RJ: "Sudeste", RN: "Nordeste", RS: "Sul", RO: "Norte", RR: "Norte",
  SC: "Sul", SP: "Sudeste", SE: "Nordeste", TO: "Norte"
};

const CAPITAIS_COORD = {
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

// Fórmula de Haversine para cálculo de distância entre duas coordenadas
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Normalizador para buscas de texto à prova de falhas
const normalize = (text: string) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

interface NovoRegistroModalProps {
  onSuccess: () => void;
}

export function NovoRegistroModal({ onSuccess }: NovoRegistroModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [municipiosDisponiveis, setMunicipiosDisponiveis] = useState<any[]>([]);
  const [municipioSelecionado, setMunicipioSelecionado] = useState<any>(null);
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false);
  
  // Controle visual para mostrar que o IBGE está carregando
  const [isFetchingIbge, setIsFetchingIbge] = useState(false);

  const form = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      estado: "", local: "", decisor: "", numero: "", referencia: "", objeto: "",
      valor: undefined, vigencia: "", fornecedor: "", taxa: undefined, regiao: "",
      habitantes: undefined, distancia_km: undefined, qualificacao: "", data_evento: "",
    },
  });

  const estadoSelecionado = form.watch("estado");

  useEffect(() => {
    async function fetchMunicipios() {
      if (!estadoSelecionado) {
        setMunicipiosDisponiveis([]);
        return;
      }
      setIsLoadingMunicipios(true);
      const { data, error } = await supabase
        .from("municipios")
        .select("id, local, lat, lng")
        .eq("estado", estadoSelecionado);

      if (data && !error) setMunicipiosDisponiveis(data);
      setIsLoadingMunicipios(false);
    }
    fetchMunicipios();
  }, [estadoSelecionado]);

  const onSubmit = async (data: RegistroInput) => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Usuário não autenticado");

      const payload: any = { ...data, user_id: userData.user.id };

      if (municipioSelecionado) {
        payload.lat = municipioSelecionado.lat;
        payload.lng = municipioSelecionado.lng;
      }

      const { error } = await supabase.from("registros").insert(payload);
      if (error) throw error;

      form.reset();
      setMunicipioSelecionado(null);
      setIsOpen(false);
      onSuccess(); 
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition"><Plus className="mr-2 h-4 w-4" /> Novo Registro</button>} />
      
      <DialogContent className="!max-w-[1200px] !w-[90vw] p-8 shadow-2xl rounded-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">Cadastrar Novo Registro</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Preenchimento rápido e otimizado com integração automática às APIs do IBGE.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* SEÇÃO 1: DADOS BASE */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">1. Dados Base e Decisão</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                
                <FormField control={form.control} name="estado" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-1">
                    <FormLabel className="text-xs font-bold text-slate-700">Estado (UF)</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("local", ""); form.setValue("habitantes", undefined); form.setValue("distancia_km", undefined); form.setValue("regiao", "");
                        setMunicipioSelecionado(null);
                      }} 
                      value={field.value}
                    >
                      <FormControl><SelectTrigger className="border-slate-300 h-10 text-sm bg-white"><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                      <SelectContent>{ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="local" render={({ field }) => {
                  const termoBusca = normalize(field.value);
                  const cidadesFiltradas = municipiosDisponiveis.filter(m => normalize(m.local).includes(termoBusca));

                  return (
                    <FormItem className="md:col-span-3 lg:col-span-3 relative">
                      <FormLabel className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Local / Município {municipiosDisponiveis.length > 0 && (<span className="text-blue-500 font-normal ml-1 bg-blue-50 px-2 py-0.5 rounded-full">({municipiosDisponiveis.length})</span>)}</span>
                        {isLoadingMunicipios && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      </FormLabel>
                      
                      <FormControl>
                        <Input 
                          placeholder={!estadoSelecionado ? "Selecione a UF 1º" : "Digite para buscar..."} 
                          className="border-slate-300 h-10 text-sm bg-white" autoComplete="off" disabled={!estadoSelecionado || isLoadingMunicipios} {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value); 
                            if (municipioSelecionado) {
                              setMunicipioSelecionado(null); form.setValue("habitantes", undefined); form.setValue("distancia_km", undefined); form.setValue("regiao", "");
                            }
                          }}
                        />
                      </FormControl>

                      {estadoSelecionado && termoBusca.length > 0 && !municipioSelecionado && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[250px] overflow-y-auto">
                          {cidadesFiltradas.length > 0 ? (
                            cidadesFiltradas.map((m) => (
                              <div
                                key={m.id}
                                className="px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border-b border-slate-50 last:border-0"
                                onClick={async () => {
                                  // 1. Grava a cidade selecionada no campo
                                  field.onChange(m.local);
                                  setMunicipioSelecionado(m);
                                  
                                  // 2. Preenche Região Baseado no Mapa
                                  const regiaoMap = REGIAO_MAP[estadoSelecionado];
                                  if (regiaoMap) form.setValue('regiao', regiaoMap);

                                  // 3. Calcula Distância da Capital com Haversine
                                  const cap = CAPITAIS_COORD[estadoSelecionado as keyof typeof CAPITAIS_COORD];
                                  if (cap && m.lat && m.lng) {
                                    const dist = calcularDistancia(cap.lat, cap.lng, m.lat, m.lng);
                                    form.setValue('distancia_km', dist);
                                  }

                                  // 4. Mágica do IBGE: Busca a População ao vivo
                                  // 4. Mágica do IBGE: Busca a População ao vivo
                                  setIsFetchingIbge(true);
                                  try {
                                    // Acha o código IBGE da cidade na API de localidades
                                    const resLoc = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoSelecionado}/municipios`);
                                    const locais = await resLoc.json();
                                    const cityIbge = locais.find((loc: any) => normalize(loc.nome) === normalize(m.local));
                                    
                                    if (cityIbge) {
                                      // Consulta o Censo Demográfico de 2022
                                      const resPop = await fetch(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N6[${cityIbge.id}]`);
                                      const popData = await resPop.json();
                                      
                                      if (popData && popData.length > 0) {
                                        const serie = popData[0]?.resultados?.[0]?.series?.[0]?.serie;
                                        if (serie) {
                                          // Pega o primeiro valor (ignorando o nome exato da chave do ano)
                                          const popString = Object.values(serie)[0] as string;
                                          if (popString) {
                                            // Remove qualquer ponto ou espaço que o IBGE tenha mandado e converte pra número
                                            const popLimpa = parseInt(popString.replace(/\D/g, ''), 10);
                                            form.setValue('habitantes', popLimpa);
                                          }
                                        }
                                      }
                                    }
                                  } catch (err) {
                                    console.error("Falha ao buscar população no IBGE", err);
                                  } finally {
                                    setIsFetchingIbge(false);
                                  }
                                }}
                              >
                                {m.local}
                              </div>
                            ))
                          ) : (<div className="px-3 py-4 text-sm text-slate-500 text-center font-medium">Nenhuma cidade encontrada 🏙️</div>)}
                        </div>
                      )}
                    </FormItem>
                  );
                }}/>

                <FormField control={form.control} name="decisor" render={({ field }) => (
                  <FormItem className="md:col-span-3 lg:col-span-4">
                    <FormLabel className="text-xs font-bold text-slate-700">Nome I</FormLabel>
                    <FormControl><Input placeholder="Responsável" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Número</FormLabel>
                    <FormControl><Input placeholder="Ex: 15" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="referencia" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Nome II</FormLabel>
                    <FormControl><Input placeholder="Nome II" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* SEÇÃO 2: OBJETO E EXECUÇÃO */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">2. Objeto e Execução</h3>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="objeto" render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel className="text-xs font-bold text-slate-700">Objeto do Registro</FormLabel>
                    <FormControl><Input placeholder="Descrição completa..." className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="fornecedor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Fornecedor</FormLabel>
                    <FormControl><Input placeholder="Razão social..." className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="vigencia" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Vigência</FormLabel>
                    <FormControl><Input type="date" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            {/* SEÇÃO 3: INDICADORES */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">3. Indicadores Geográficos e Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                <FormField control={form.control} name="taxa" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Taxa (%)</FormLabel>
                    <FormControl><Input type="number" step="0.01" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}/></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="regiao" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Região</FormLabel>
                    <FormControl><Input className="border-slate-300 h-10 text-sm bg-slate-50 font-semibold" readOnly {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="habitantes" render={({ field }) => (
                  <FormItem className="md:col-span-2 relative">
                    <FormLabel className="text-xs font-bold text-slate-700 flex justify-between">Habitantes {isFetchingIbge && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}</FormLabel>
                    <FormControl><Input type="number" className="border-slate-300 h-10 text-sm bg-slate-50 font-semibold" readOnly {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="distancia_km" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Dist. (KM)</FormLabel>
                    <FormControl><Input type="number" className="border-slate-300 h-10 text-sm bg-slate-50 font-semibold" readOnly {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="qualificacao" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Qualificação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="border-slate-300 h-10 text-sm bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>{QUALIFICACOES.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="data_evento" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold text-slate-700">Data Evento</FormLabel>
                    <FormControl><Input type="date" className="border-slate-300 h-10 text-sm bg-white" {...field} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="mr-3 text-slate-500 hover:text-slate-700 font-semibold">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] shadow-sm font-bold h-10">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Registro"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}