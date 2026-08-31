"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { 
  Loader2, Users, ShieldCheck, MapPin, Database, 
  Megaphone, FileSignature, Map, BarChart3, Banknote, TrendingUpDown 
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ToggleSwitch = ({ checked, onChange, disabled, isLoading }: { checked: boolean, onChange: () => void, disabled?: boolean, isLoading?: boolean }) => (
  <button
    type="button"
    disabled={disabled || isLoading}
    onClick={onChange}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner",
      checked ? "bg-emerald-500" : "bg-slate-300",
      (disabled || isLoading) && "opacity-50 cursor-not-allowed"
    )}
  >
    <span
      className={cn(
        "pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
        checked ? "translate-x-5" : "translate-x-0"
      )}
    >
      {isLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
    </span>
  </button>
);

export default function LicenciadosPage() {
  const router = useRouter();
  const { isInterno, isLoading: authLoading } = useAuth();
  
  const [licenciados, setLicenciados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isInterno) {
      router.replace("/home");
    }
  }, [authLoading, isInterno, router]);

  const fetchLicenciados = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("nome");

      if (error) throw error;

      const dadosTratados = (data || [])
        .filter((user) => {
          const perfilDoBanco = user.perfil ? user.perfil.toLowerCase().trim() : "";
          return perfilDoBanco !== "interno"; 
        })
        .map((user) => ({
          ...user,
          modulos_ativos: user.modulos_ativos || []
        }));

      setLicenciados(dadosTratados);
    } catch (error) {
      console.error("Erro ao buscar licenciados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isInterno) {
      fetchLicenciados();
    }
  }, [authLoading, isInterno]);

  const toggleModulo = async (userId: string, modulo: string, modulosAtuais: string[]) => {
    setUpdatingId(`${userId}-${modulo}`);
    
    const possuiModulo = modulosAtuais.includes(modulo);
    const novosModulos = possuiModulo 
      ? modulosAtuais.filter(m => m !== modulo) 
      : [...modulosAtuais, modulo];

    setLicenciados(prev => prev.map(user => 
      user.id === userId ? { ...user, modulos_ativos: novosModulos } : user
    ));

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .update({ modulos_ativos: novosModulos })
        .eq("id", userId)
        .select(); 

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Bloqueio de Segurança (RLS)");
      }

    } catch (error) {
      console.error("Erro ao atualizar módulo:", error);
      alert("Operação bloqueada pelo banco de dados! Verifique as regras de RLS no Supabase.");
      
      setLicenciados(prev => prev.map(user => 
        user.id === userId ? { ...user, modulos_ativos: modulosAtuais } : user
      ));
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || (!isInterno && !authLoading)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] p-6 flex flex-col gap-6 overflow-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl border border-indigo-200">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Gestão de Licenciados
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Controle os acessos aos módulos premium dos clientes B2B.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table className="w-full min-w-[1200px] text-sm">
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[20%] px-4 py-4 font-bold text-slate-700 uppercase">Cliente / Empresa</TableHead>
                <TableHead className="w-[15%] px-4 py-4 font-bold text-slate-700 uppercase">Territórios</TableHead>
                
                {/* Módulos Operacionais */}
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-blue-700 bg-blue-50/50 uppercase">
                  <div className="flex flex-col items-center gap-1">
                    <Database className="h-4 w-4" /> Registros
                  </div>
                </TableHead>
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-emerald-700 bg-emerald-50/50 uppercase">
                  <div className="flex flex-col items-center gap-1">
                    <Megaphone className="h-4 w-4" /> Publicados
                  </div>
                </TableHead>
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-amber-700 bg-amber-50/50 uppercase border-r border-slate-200">
                  <div className="flex flex-col items-center gap-1">
                    <FileSignature className="h-4 w-4" /> Contratos
                  </div>
                </TableHead>

                {/* ✨ Módulos Analíticos */}
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-indigo-700 bg-indigo-50/50 uppercase">
                  <div className="flex flex-col items-center gap-1">
                    <Map className="h-4 w-4" /> Int. Geo
                  </div>
                </TableHead>
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-indigo-700 bg-indigo-50/50 uppercase border-r border-slate-200">
                  <div className="flex flex-col items-center gap-1">
                    <BarChart3 className="h-4 w-4" /> Dashboard
                  </div>
                </TableHead>

                {/* ✨ Módulos de Desempenho */}
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-rose-700 bg-rose-50/50 uppercase">
                  <div className="flex flex-col items-center gap-1">
                    <Banknote className="h-4 w-4" /> Vol. Venda
                  </div>
                </TableHead>
                <TableHead className="w-[8%] px-2 py-4 text-center font-bold text-rose-700 bg-rose-50/50 uppercase">
                  <div className="flex flex-col items-center gap-1">
                    <TrendingUpDown className="h-4 w-4" /> Growth
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : licenciados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Users className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhum licenciado encontrado no banco de dados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                licenciados.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    
                    <TableCell className="px-4 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-base">{user.nome}</span>
                        <span className="text-xs text-slate-500 font-medium">{user.email}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4 align-middle">
                      <div className="flex flex-wrap gap-1.5">
                        {user.licencas && user.licencas.length > 0 ? (
                          user.licencas.map((lic: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-md">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {lic.estado}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem territórios definidos</span>
                        )}
                      </div>
                    </TableCell>

                    {/* MÓDULOS OPERACIONAIS */}
                    <TableCell className="px-2 py-4 text-center align-middle bg-blue-50/10 border-l border-slate-50">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("registros")}
                        onChange={() => toggleModulo(user.id, "registros", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-registros`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-4 text-center align-middle bg-emerald-50/10 border-l border-slate-50">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("publicados")}
                        onChange={() => toggleModulo(user.id, "publicados", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-publicados`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-4 text-center align-middle bg-amber-50/10 border-l border-r border-slate-200/50">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("contratos")}
                        onChange={() => toggleModulo(user.id, "contratos", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-contratos`}
                      />
                    </TableCell>

                    {/* ✨ MÓDULOS ANALÍTICOS */}
                    <TableCell className="px-2 py-4 text-center align-middle bg-indigo-50/10">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("mapa")}
                        onChange={() => toggleModulo(user.id, "mapa", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-mapa`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-4 text-center align-middle bg-indigo-50/10 border-l border-r border-slate-200/50">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("dashboard")}
                        onChange={() => toggleModulo(user.id, "dashboard", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-dashboard`}
                      />
                    </TableCell>

                    {/* ✨ MÓDULOS DE DESEMPENHO */}
                    <TableCell className="px-2 py-4 text-center align-middle bg-rose-50/10">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("volume")}
                        onChange={() => toggleModulo(user.id, "volume", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-volume`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-4 text-center align-middle bg-rose-50/10 border-l border-slate-50">
                      <ToggleSwitch 
                        checked={user.modulos_ativos.includes("crescimento")}
                        onChange={() => toggleModulo(user.id, "crescimento", user.modulos_ativos)}
                        isLoading={updatingId === `${user.id}-crescimento`}
                      />
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}