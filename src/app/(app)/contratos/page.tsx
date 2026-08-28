"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { 
  Loader2, Search, FileSignature, LayoutList, 
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, Plus, Pencil, UploadCloud
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ITENS_POR_PAGINA = 20;

const formatarMoeda = (valor: number) => {
  if (valor === null || valor === undefined || isNaN(valor)) return "-";
  return `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

const formatarPercentual = (valor: number | null | undefined) => {
  if (valor === null || valor === undefined || isNaN(valor)) return "-";
  return `${Number(valor).toFixed(2).replace('.', ',')}%`;
};

const emptyForm = {
  empresa_contratada: "",
  orgao: "",
  especie: "",
  municipio: "",
  estado: "",
  origem: "",
  objeto: "",
  instrumento_atual: "CONTRATO",
  numero_base: "",
  valor_global_atual: 0,
  inicio_assinatura: "",
  vigencia_atual: "",
  valor_abastecimento_atual: 0,
  valor_manutencao_atual: 0,
  guincho_seguro_atual: 0,
  telemetria_atual: 0,
  tx_abastecimento: null,
  tx_manutencao: null,
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
     var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
     return v.toString(16);
  });
}

export default function ContratosPage() {
  const router = useRouter();
  const { isInterno, profile, isLoading: authLoading } = useAuth();
  
  const [contratos, setContratos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [licencaAtiva, setLicencaAtiva] = useState<{nome: string, estado: string} | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<any>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    if (!authLoading) {
      const temAcesso = isInterno || profile?.modulos_ativos?.includes("contratos") || profile?.modulos_ativos?.includes("ALL");
      if (!temAcesso) router.replace("/home"); 
    }
  }, [authLoading, isInterno, profile, router]);

  useEffect(() => {
    if (profile?.licencas && profile.licencas.length > 0 && !licencaAtiva) {
      setLicencaAtiva(profile.licencas[0]);
    }
  }, [profile]);

  const fetchContratos = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("contratos").select("*", { count: "exact" }); 

      if (!isInterno && licencaAtiva) {
        query = query.eq("estado", licencaAtiva.estado.trim().toUpperCase());
      }

      if (searchTerm) {
        query = query.or(`orgao.ilike.%${searchTerm}%,municipio.ilike.%${searchTerm}%,numero_base.ilike.%${searchTerm}%,empresa_contratada.ilike.%${searchTerm}%`);
      }

      const de = (paginaAtual - 1) * ITENS_POR_PAGINA;
      const ate = de + ITENS_POR_PAGINA - 1;
      
      query = query.order("vigencia_atual", { ascending: false }).range(de, ate);

      const { data, error, count } = await query;
      if (error) throw error;
      
      setContratos(data || []);
      setTotalItens(count || 0);

    } catch (error) {
      console.error("Erro ao buscar contratos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (isInterno || licencaAtiva)) {
      const delayBusca = setTimeout(() => fetchContratos(), 400);
      return () => clearTimeout(delayBusca);
    }
  }, [authLoading, isInterno, licencaAtiva, paginaAtual, searchTerm]);

  useEffect(() => { setPaginaAtual(1); }, [searchTerm]);
  const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);

  const handleOpenCreate = () => {
    setFormData(emptyForm);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contrato: any) => {
    setFormData({ ...contrato });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.orgao || !formData.municipio || !formData.estado) {
      alert("Órgão, Município e Estado são obrigatórios!");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const valorTotalSoma = 
        Number(formData.valor_abastecimento_atual || 0) + 
        Number(formData.valor_manutencao_atual || 0) + 
        Number(formData.guincho_seguro_atual || 0) + 
        Number(formData.telemetria_atual || 0);

      const payload = {
        ...formData,
        valor_total_soma: valorTotalSoma > 0 ? valorTotalSoma : formData.valor_global_atual,
        user_id: userData.user?.id
      };

      if (modalMode === "create") {
        const { error } = await supabase.from("contratos").insert([payload]);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...updatePayload } = payload;
        const { error } = await supabase.from("contratos").update(updatePayload).eq("id", id);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchContratos();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar contrato: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, name: string) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    if (value === "") {
      setFormData((prev: any) => ({ ...prev, [name]: 0 }));
      return;
    }
    const numValue = Number(value) / 100;
    setFormData((prev: any) => ({ ...prev, [name]: numValue }));
  };

  const handleTaxaChange = (e: React.ChangeEvent<HTMLInputElement>, name: string) => {
    let val = e.target.value;
    val = val.replace(/\./g, ','); 
    val = val.replace(/[^0-9,-]/g, ''); 
    val = val.replace(/(?!^)-/g, ''); 
    val = val.replace(/(,.*?),/g, '$1'); 

    setFormData((prev: any) => ({ ...prev, [name]: val === "" ? null : val }));
  };

  const parseCSVBlindado = (text: string) => {
    const primeiraLinha = text.substring(0, text.indexOf('\n'));
    const separator = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ';' : ',';

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"'; 
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === separator && !insideQuotes) {
        currentRow.push(currentCell.replace(/\n|\r/g, ' ').trim()); 
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') i++; 
        currentRow.push(currentCell.replace(/\n|\r/g, ' ').trim());
        if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.replace(/\n|\r/g, ' ').trim());
      if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
    }
    return rows;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage("Lendo arquivo CSV no Modo Invencível...");

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rawRows = parseCSVBlindado(text);
        
        let startIdx = -1;
        let headers: string[] = [];
        
        for(let i=0; i<rawRows.length; i++){
           const rowStr = rawRows[i].join(' ').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
           if(rowStr.includes('CONTRATADO') || rowStr.includes('OBJETO')){
               startIdx = i; 
               headers = rawRows[i].map(h => h.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
               break;
           }
        }

        if (startIdx === -1) {
          throw new Error("Não encontrei a linha de cabeçalho no arquivo.");
        }

        const getIdx = (possibleNames: string[]) => {
          return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
        };

        const idxContratado = getIdx(['CONTRATADO', 'EMPRESA']);
        const idxOrgao = getIdx(['ORGAO', 'CONTRATANTE', 'CLIENTE', 'IRGIO']); 
        const idxEspecie = getIdx(['ESPECIE', 'ESPƑCIE']); 
        const idxMunicipio = getIdx(['MUNICIPIO', 'CIDADE', 'MUNICEPIO']); 
        const idxUf = getIdx(['UF', 'ESTADO']);
        const idxOrigem = getIdx(['ORIGEM']);
        const idxObjeto = getIdx(['OBJETO']);
        const idxInstrumento = getIdx(['INSTRUMENTO', 'ADITIVO']);
        const idxNumero = getIdx(['NUMERO', 'REF', 'NOMERO']); 
        const idxValorGlobal = getIdx(['VALOR GLOBAL', 'GLOBAL']);
        const idxInicio = getIdx(['INICIO', 'ASSINATURA', 'INECIO']); 
        const idxVigencia = getIdx(['VIGENCIA', 'VIGÆNCIA']); 
        // ✨ Dicionário para as novas colunas
        const idxTxAbast = getIdx(['TAXA (ABAST', 'TX ABAST', 'TAXA ABAST']);
        const idxTxManut = getIdx(['TAXA (MANUT', 'TX MANUT', 'TAXA MANUT']);
        const idxAbast = getIdx(['ABAST', 'COMBUSTIVEL']);
        const idxManut = getIdx(['MANUT']);
        const idxGuincho = getIdx(['GUINCHO', 'SEGURO']);
        const idxTelemetria = getIdx(['TELEMETRIA']);
        const idxTotal = getIdx(['TOTAL']);

        if (idxOrgao === -1 || idxMunicipio === -1) {
           throw new Error(`As colunas 'ÓRGÃO' e 'MUNICÍPIO' não foram encontradas. Colunas lidas pelo sistema: [${headers.join(" | ")}]`);
        }

        const dataRows = rawRows.slice(startIdx + 1);

        const parseCurrency = (val: string | undefined) => {
          if (!val || val === '-' || val === '') return 0.0;
          return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0.0;
        };

        const parseTaxa = (val: string | undefined) => {
          if (!val || val === '-' || val.trim() === '') return null;
          // Retira o símbolo de % e formata a vírgula
          const clean = val.replace('%', '').replace(/\./g, '').replace(',', '.').trim();
          const num = parseFloat(clean);
          return isNaN(num) ? null : num;
        };

        const parseDate = (val: string | undefined) => {
          if (!val || val === '-' || val === '') return null;
          const parts = val.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
          return null;
        };

        const estadoMap: Record<string, string> = {
          "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA", 
          "CEARA": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "GOIAS": "GO", 
          "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG", 
          "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI"
        };

        const normalizarUF = (ufOriginal: string | undefined) => {
           if (!ufOriginal) return "ND";
           let limpo = ufOriginal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
           if (limpo.includes("CEAR")) return "CE";
           if (limpo.includes("PIAU")) return "PI";
           if (limpo.includes("MINAS")) return "MG";
           if (estadoMap[limpo]) return estadoMap[limpo];
           return limpo.substring(0, 2);
        };

        setImportMessage("Agrupando Contratos Pais e Filhos...");
        const contratosMap = new Map();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        dataRows.forEach((cols) => {
           const getCol = (idx: number) => idx !== -1 && cols[idx] ? cols[idx] : '';
           
           const contratado = getCol(idxContratado);
           const orgao = getCol(idxOrgao);
           const especie = getCol(idxEspecie);
           const municipio = getCol(idxMunicipio);
           const uf = getCol(idxUf);
           const origem = getCol(idxOrigem);
           const objeto = getCol(idxObjeto);
           const instrumento = getCol(idxInstrumento);
           const numero = getCol(idxNumero);
           const valorGlobal = getCol(idxValorGlobal);
           const inicio = getCol(idxInicio);
           const vigencia = getCol(idxVigencia);
           
           // ✨ Lendo as taxas do CSV
           const txAbast = getCol(idxTxAbast);
           const txManut = getCol(idxTxManut);

           const abast = getCol(idxAbast);
           const manut = getCol(idxManut);
           const guincho = getCol(idxGuincho);
           const telemetria = getCol(idxTelemetria);
           const total = getCol(idxTotal);

           if (!orgao || !municipio) return;

           const ufMapeada = normalizarUF(uf);
           const chave = `${orgao} - ${municipio}`;

           if (!contratosMap.has(chave)) {
               contratosMap.set(chave, {
                   id: generateUUID(),
                   empresa_contratada: contratado || null,
                   orgao: orgao,
                   especie: especie || null,
                   municipio: municipio,
                   estado: ufMapeada,
                   origem: origem || null,
                   objeto: objeto || null,
                   instrumento_atual: 'CONTRATO',
                   numero_base: numero || null,
                   valor_global_atual: 0,
                   inicio_assinatura: parseDate(inicio),
                   vigencia_atual: null,
                   valor_abastecimento_atual: 0,
                   valor_manutencao_atual: 0,
                   guincho_seguro_atual: 0,
                   telemetria_atual: 0,
                   tx_abastecimento: parseTaxa(txAbast), // Grava a taxa no pai
                   tx_manutencao: parseTaxa(txManut), // Grava a taxa no pai
                   valor_total_soma: 0,
                   user_id: userId,
                   filhos: []
               });
           }

           const contrato = contratosMap.get(chave);
           
           const vigenciaLinha = parseDate(vigencia);
           if (vigenciaLinha) {
               if (!contrato.vigencia_atual || new Date(vigenciaLinha) > new Date(contrato.vigencia_atual)) {
                   contrato.vigencia_atual = vigenciaLinha;
               }
           }

           // Se for um aditivo e tiver taxa nova, ele substitui a taxa do pai pela mais recente
           const novaTxAbast = parseTaxa(txAbast);
           if (novaTxAbast !== null) contrato.tx_abastecimento = novaTxAbast;
           
           const novaTxManut = parseTaxa(txManut);
           if (novaTxManut !== null) contrato.tx_manutencao = novaTxManut;

           const valorLinha = parseCurrency(valorGlobal);
           contrato.valor_global_atual += valorLinha;

           contrato.valor_abastecimento_atual += parseCurrency(abast);
           contrato.valor_manutencao_atual += parseCurrency(manut);
           contrato.guincho_seguro_atual += parseCurrency(guincho);
           contrato.telemetria_atual += parseCurrency(telemetria);
           contrato.valor_total_soma += (total ? parseCurrency(total) : valorLinha);

           const instrFormatado = instrumento?.toUpperCase() || '';
           
           if (instrFormatado === 'CONTRATO') {
               contrato.numero_base = numero || contrato.numero_base;
               contrato.objeto = objeto || contrato.objeto;
               contrato.origem = origem || contrato.origem;
           } else if (instrFormatado) {
               contrato.instrumento_atual = "ADITIVADO";
               contrato.filhos.push({
                   contrato_id: contrato.id,
                   tipo_instrumento: instrFormatado,
                   numero_ref: numero || null,
                   valor_adicionado: valorLinha,
                   nova_vigencia: vigenciaLinha,
                   valor_abastecimento: parseCurrency(abast),
                   valor_manutencao: parseCurrency(manut),
                   taxa_guincho_seguro: parseCurrency(guincho),
                   taxa_telemetria: parseCurrency(telemetria)
               });
           }
        });

        setImportMessage(`Limpando tabela antiga para a nova carga...`);
        await supabase.from('contratos_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('contratos').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        const pais = Array.from(contratosMap.values());
        const apenasPais = pais.map(({ filhos, ...resto }) => resto);
        const apenasFilhos = pais.flatMap(p => p.filhos);

        const chunkArray = (array: any[], size: number) => {
            const result = [];
            for (let i = 0; i < array.length; i += size) {
                result.push(array.slice(i, i + size));
            }
            return result;
        };

        setImportMessage(`Salvando ${apenasPais.length} Contratos Principais...`);
        const paisChunks = chunkArray(apenasPais, 500);
        for (const chunk of paisChunks) {
            const { error } = await supabase.from('contratos').insert(chunk);
            if (error) throw error;
        }

        setImportMessage(`Salvando ${apenasFilhos.length} Aditivos...`);
        const filhosChunks = chunkArray(apenasFilhos, 500);
        for (const chunk of filhosChunks) {
            const { error } = await supabase.from('contratos_historico').insert(chunk);
            if (error) throw error;
        }

        setImportMessage("Sucesso absoluto!");
        setTimeout(() => {
          setIsImporting(false);
          fetchContratos(); 
        }, 1500);

      } catch (err: any) {
        console.error(err);
        alert("Ocorreu um erro ao importar o arquivo: " + err.message);
        setIsImporting(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    
    // Leitura em macintosh
    reader.readAsText(file, 'macintosh'); 
  };

  const renderizarStatusVigencia = (dataVigencia: string) => {
    if (!dataVigencia) return <span className="text-slate-400 font-medium">Não informada</span>;
    const dataFim = new Date(`${dataVigencia}T23:59:59`);
    const hoje = new Date();
    const diffDias = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return <span className="inline-flex items-center justify-center px-2 py-1 w-full rounded-md bg-rose-50 text-rose-700 text-[11px] uppercase font-bold border border-rose-200 shadow-sm">Vencido</span>;
    } else if (diffDias <= 45) {
      return <span className="inline-flex items-center justify-center px-2 py-1 w-full rounded-md bg-amber-50 text-amber-700 text-[11px] uppercase font-bold border border-amber-200 shadow-sm animate-pulse">Faltam {diffDias}d</span>;
    } else {
      return <span className="inline-flex items-center justify-center px-2 py-1 w-full rounded-md bg-emerald-50 text-emerald-700 text-[11px] uppercase font-bold border border-emerald-200 shadow-sm">Ativo</span>;
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-4 flex flex-col gap-4 overflow-hidden">
      
      <Dialog open={isImporting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md text-center py-10 rounded-2xl border-0 shadow-2xl">
          <div className="flex flex-col items-center">
            <Loader2 className="h-14 w-14 text-blue-600 animate-spin mb-6" />
            <DialogTitle className="text-xl font-bold text-slate-800 mb-2">Importação Mágica</DialogTitle>
            <p className="text-sm font-semibold text-slate-500 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">{importMessage}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-0 shadow-2xl rounded-lg">
          <DialogHeader className="bg-slate-50 px-8 py-5 border-b border-slate-200">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-blue-600" />
              {modalMode === "create" ? "Novo Contrato" : "Editar Contrato"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Órgão / Cliente *</label>
                <Input name="orgao" value={formData.orgao} onChange={handleChange} placeholder="Ex: Prefeitura Municipal..." className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Empresa Contratada</label>
                <Input name="empresa_contratada" value={formData.empresa_contratada} onChange={handleChange} className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Município *</label>
                <Input name="municipio" value={formData.municipio} onChange={handleChange} className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Estado (UF) *</label>
                <Input name="estado" value={formData.estado} onChange={handleChange} placeholder="Ex: CE, SP, MG" maxLength={2} className="h-10 text-sm uppercase bg-slate-50 focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Espécie</label>
                <Input name="especie" value={formData.especie} onChange={handleChange} placeholder="Ex: PREFEITURA" className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Origem / Modalidade</label>
                <Input name="origem" value={formData.origem} onChange={handleChange} placeholder="Ex: PREGÃO ELETRÔNICO..." className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Objeto</label>
                <Input name="objeto" value={formData.objeto} onChange={handleChange} placeholder="Ex: Aquisição de combustíveis..." className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Instrumento Atual</label>
                <Input name="instrumento_atual" value={formData.instrumento_atual} onChange={handleChange} placeholder="Ex: CONTRATO ou 1º ADITIVO" className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Número / Ref.</label>
                <Input name="numero_base" value={formData.numero_base} onChange={handleChange} className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Início / Assinatura</label>
                <Input type="date" name="inicio_assinatura" value={formData.inicio_assinatura} onChange={handleChange} className="h-10 text-sm bg-slate-50 focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-700">Data de Vigência</label>
                <Input type="date" name="vigencia_atual" value={formData.vigencia_atual} onChange={handleChange} className="h-10 text-sm border-amber-300 bg-amber-50/30 focus:bg-white focus-visible:ring-amber-500" />
              </div>

              <div className="h-px bg-slate-200 md:col-span-2 my-2" />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Valor Global (Ref. Original)</label>
                <Input 
                  type="text" 
                  name="valor_global_atual" 
                  value={Number(formData.valor_global_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  onChange={(e) => handleCurrencyChange(e, "valor_global_atual")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white font-semibold text-right" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Taxa Abastecimento (%)</label>
                <Input 
                  type="text" 
                  name="tx_abastecimento" 
                  placeholder="Ex: -2,5 ou 5"
                  value={formData.tx_abastecimento !== null && formData.tx_abastecimento !== undefined ? String(formData.tx_abastecimento).replace('.', ',') : ""}
                  onChange={(e) => handleTaxaChange(e, "tx_abastecimento")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Taxa Manutenção (%)</label>
                <Input 
                  type="text" 
                  name="tx_manutencao" 
                  placeholder="Ex: -5,0 ou 10"
                  value={formData.tx_manutencao !== null && formData.tx_manutencao !== undefined ? String(formData.tx_manutencao).replace('.', ',') : ""}
                  onChange={(e) => handleTaxaChange(e, "tx_manutencao")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white" 
                />
              </div>

              <div className="md:col-span-1" />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Fatia: Abastecimento (R$)</label>
                <Input 
                  type="text" 
                  name="valor_abastecimento_atual" 
                  value={Number(formData.valor_abastecimento_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  onChange={(e) => handleCurrencyChange(e, "valor_abastecimento_atual")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white text-right" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Fatia: Manutenção (R$)</label>
                <Input 
                  type="text" 
                  name="valor_manutencao_atual" 
                  value={Number(formData.valor_manutencao_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  onChange={(e) => handleCurrencyChange(e, "valor_manutencao_atual")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white text-right" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Fatia: Guincho / Seguro (R$)</label>
                <Input 
                  type="text" 
                  name="guincho_seguro_atual" 
                  value={Number(formData.guincho_seguro_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  onChange={(e) => handleCurrencyChange(e, "guincho_seguro_atual")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white text-right" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Fatia: Telemetria (R$)</label>
                <Input 
                  type="text" 
                  name="telemetria_atual" 
                  value={Number(formData.telemetria_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  onChange={(e) => handleCurrencyChange(e, "telemetria_atual")} 
                  className="h-10 text-sm bg-slate-50 focus:bg-white text-right" 
                />
              </div>

            </div>
          </div>
          
          <DialogFooter className="bg-slate-50 px-8 py-5 border-t border-slate-200 sm:justify-between items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsModalOpen(false)} 
              className="border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-300 font-bold w-full sm:w-auto transition-colors"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md w-full sm:w-auto transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
              {modalMode === "create" ? "Salvar Contrato" : "Atualizar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-xl border border-blue-200">
            <FileSignature className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Contratos</h1>
            {isInterno ? (
              <p className="text-sm text-slate-500">Mapeamento nacional de contratos vigentes.</p>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-500">Sua carteira B2G ativa:</p>
                {profile?.licencas && profile.licencas.length > 1 ? (
                  <select
                    value={licencaAtiva?.estado || ""}
                    onChange={(e) => {
                      const novaLicenca = profile.licencas.find((l: any) => l.estado === e.target.value);
                      if (novaLicenca) setLicencaAtiva(novaLicenca);
                    }}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 py-0 text-sm font-semibold text-blue-700 cursor-pointer shadow-sm"
                  >
                    {profile.licencas.map((lic: any, idx: number) => (
                      <option key={idx} value={lic.estado}>🏢 {lic.nome} ({lic.estado})</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-blue-700 px-1">🏢 {licencaAtiva?.nome} ({licencaAtiva?.estado})</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por órgão, município..." 
              className="pl-9 bg-white border-slate-200 h-10 text-sm focus-visible:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isInterno && (
            <div className="flex items-center gap-2">
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-bold h-10 px-4 whitespace-nowrap shadow-sm transition-all">
                <UploadCloud className="h-4 w-4 mr-2"/> Importar CSV
              </Button>
              
              <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-4 whitespace-nowrap shadow-md transition-all">
                <Plus className="h-4 w-4 mr-2"/> Novo Contrato
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table className="w-full min-w-[3200px] table-fixed text-[11px] md:text-xs">
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[8%] px-3 py-3 font-bold text-slate-700 uppercase">CONTRATADO</TableHead>
                <TableHead className="w-[12%] px-3 py-3 font-bold text-slate-700 uppercase">ÓRGÃO</TableHead>
                <TableHead className="w-[7%] px-3 py-3 font-bold text-slate-700 uppercase">ESPÉCIE</TableHead>
                <TableHead className="w-[7%] px-3 py-3 font-bold text-slate-700 uppercase">MUNICÍPIO</TableHead>
                <TableHead className="w-[3%] px-3 py-3 font-bold text-slate-700 uppercase text-center">UF</TableHead>
                <TableHead className="w-[9%] px-3 py-3 font-bold text-slate-700 uppercase">ORIGEM</TableHead>
                <TableHead className="w-[12%] px-3 py-3 font-bold text-slate-700 uppercase">OBJETO</TableHead>
                <TableHead className="w-[7%] px-3 py-3 font-bold text-slate-700 uppercase">INSTRUMENTO</TableHead>
                <TableHead className="w-[6%] px-3 py-3 font-bold text-slate-700 uppercase">NÚMERO/REF.</TableHead>
                <TableHead className="w-[6%] px-3 py-3 font-bold text-slate-700 uppercase text-right">VALOR GLOBAL</TableHead>
                <TableHead className="w-[5%] px-3 py-3 font-bold text-slate-700 uppercase text-center">INÍCIO ASSINATURA</TableHead>
                <TableHead className="w-[5%] px-3 py-3 font-bold text-blue-700 uppercase text-center bg-blue-50/50">VIGÊNCIA</TableHead>
                <TableHead className="w-[5%] px-3 py-3 font-bold text-slate-700 uppercase text-center">STATUS</TableHead>
                
                {/* ✨ NOVAS COLUNAS DE TAXA AQUI */}
                <TableHead className="w-[5%] px-3 py-3 font-bold text-slate-700 uppercase text-center">TX ABAST.</TableHead>
                <TableHead className="w-[5%] px-3 py-3 font-bold text-slate-700 uppercase text-center">TX MANUT.</TableHead>

                <TableHead className="w-[6%] px-3 py-3 font-bold text-slate-700 uppercase text-right">VALOR ABAST.</TableHead>
                <TableHead className="w-[6%] px-3 py-3 font-bold text-slate-700 uppercase text-right">VALOR MANUT.</TableHead>
                <TableHead className="w-[6%] px-3 py-3 font-bold text-slate-700 uppercase text-right">GUINCHO/SEGURO</TableHead>
                <TableHead className="w-[5%] px-3 py-3 font-bold text-slate-700 uppercase text-right">TELEMETRIA</TableHead>
                <TableHead className="w-[6%] px-3 py-3 font-bold text-emerald-700 uppercase text-right bg-emerald-50">TOTAL</TableHead>
                <TableHead className="w-[8%] px-3 py-3 font-bold text-slate-700 uppercase text-center">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={21} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : contratos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={21} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <LayoutList className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhum contrato encontrado.</p>
                      {isInterno && <p className="text-xs mt-1">Use os botões acima para cadastrar ou importar sua planilha.</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contratos.map((contrato) => (
                  <TableRow key={contrato.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-bold text-slate-700 whitespace-normal break-words" title={contrato.empresa_contratada}>{contrato.empresa_contratada || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-bold text-slate-800 whitespace-normal break-words" title={contrato.orgao}>{contrato.orgao || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-semibold text-slate-500 line-clamp-2" title={contrato.especie}>{contrato.especie || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-bold text-slate-700 line-clamp-2" title={contrato.municipio}>{contrato.municipio || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle text-center">
                      <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm border">{contrato.estado}</span>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="text-slate-600 line-clamp-2" title={contrato.origem}>{contrato.origem || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-medium text-slate-600 line-clamp-2" title={contrato.objeto}>{contrato.objeto || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-semibold text-slate-700 line-clamp-2">{contrato.instrumento_atual || "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-semibold text-slate-600 whitespace-normal break-words">{contrato.numero_base || "-"}</div>
                    </TableCell>
                    
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-bold text-slate-700 text-right">{formatarMoeda(contrato.valor_global_atual)}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-medium text-slate-600 text-center">{contrato.inicio_assinatura ? new Date(`${contrato.inicio_assinatura}T00:00:00`).toLocaleDateString("pt-BR") : "-"}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle bg-blue-50/30">
                      <div className="font-bold text-blue-800 text-center">{contrato.vigencia_atual ? new Date(`${contrato.vigencia_atual}T00:00:00`).toLocaleDateString("pt-BR") : "-"}</div>
                    </TableCell>

                    <TableCell className="px-3 py-3 align-middle text-center">{renderizarStatusVigencia(contrato.vigencia_atual)}</TableCell>

                    <TableCell className="px-3 py-3 align-middle text-center">
                      {contrato.tx_abastecimento !== null && contrato.tx_abastecimento !== undefined ? (
                        <span className={Number(contrato.tx_abastecimento) < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                          {formatarPercentual(contrato.tx_abastecimento)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle text-center">
                      {contrato.tx_manutencao !== null && contrato.tx_manutencao !== undefined ? (
                        <span className={Number(contrato.tx_manutencao) < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                          {formatarPercentual(contrato.tx_manutencao)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-medium text-slate-700 text-right">{formatarMoeda(contrato.valor_abastecimento_atual)}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-medium text-slate-700 text-right">{formatarMoeda(contrato.valor_manutencao_atual)}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-medium text-slate-700 text-right">{formatarMoeda(contrato.guincho_seguro_atual)}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle">
                      <div className="font-medium text-slate-700 text-right">{formatarMoeda(contrato.telemetria_atual)}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3 align-middle bg-emerald-50/30">
                      <div className="font-bold text-emerald-700 text-right">{formatarMoeda(contrato.valor_total_soma)}</div>
                    </TableCell>
                    
                    <TableCell className="px-3 py-3 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isInterno && (
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(contrato)} className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-bold h-8 text-xs shadow-sm transition-all">
                          Histórico
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* RODAPÉ E PAGINAÇÃO */}
        {!isLoading && totalItens > 0 && (
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{(paginaAtual - 1) * ITENS_POR_PAGINA + 1}</strong> até <strong className="text-slate-800">{Math.min(paginaAtual * ITENS_POR_PAGINA, totalItens)}</strong> de <strong className="text-slate-800">{totalItens}</strong> contratos
            </span>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="h-8 px-2 text-slate-600 font-semibold"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <div className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm">
                Pág. {paginaAtual} de {totalPaginas}
              </div>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas || totalPaginas === 0}
                className="h-8 px-2 text-slate-600 font-semibold"
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}