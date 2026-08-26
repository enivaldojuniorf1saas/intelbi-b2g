"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ticket,
  PlusCircle,
  BarChart3,
  Upload,
  UserCircle,
  LogOut,
  Map,
  BellRing,
  Megaphone,
  ShieldAlert,
  Banknote,
  TrendingUpDown,
  Radar,
  ArrowLeftToLine,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

const TERRITORIOS_ESPECIAIS: Record<string, { estado: string, mesorregioes: string[] }> = {
  "CE_SUL": {
    estado: "CE",
    mesorregioes: ["Sul Cearense", "Centro-Sul Cearense"] 
  }
};

const menuGroups = [
  {
    titulo: "OPERACIONAL",
    items: [
      { label: "Home", href: "/home", icon: Ticket, somenteInterno: false },
      { label: "Registros", href: "/registros", icon: PlusCircle, somenteInterno: false },
      { label: "Publicados", href: "/publicados", icon: Megaphone, somenteInterno: false },
    ]
  },
  {
    titulo: "VISÕES ANALÍTICAS",
    items: [
      { label: "Inteligência Geo", href: "/mapa", icon: Map, somenteInterno: false },
      { label: "Dashboard", href: "/dashboard", icon: BarChart3, somenteInterno: false },
    ]
  },
  {
    titulo: "ADMINISTRAÇÃO",
    items: [
      { label: "Auditoria", href: "/auditoria", icon: ShieldAlert, somenteInterno: true },
      { label: "Importar CSV", href: "/importar", icon: Upload, somenteInterno: true },
    ]
  },
  {
    titulo: "DESEMPENHO",
    items: [
      { label: "Volume de Venda", href: "/volume", icon: Banknote, somenteInterno: true },
      { label: "Growth", href: "/crescimento", icon: TrendingUpDown, somenteInterno: true },
    ]
  },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  
  const { isInterno, profile } = useAuth();
  const [alertasUrgentes, setAlertasUrgentes] = useState(0);
  
  const [novasPublicacoesCount, setNovasPublicacoesCount] = useState(0);

  useEffect(() => {
    if (pathname === "/publicados") {
      setNovasPublicacoesCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    const handleVisited = () => setNovasPublicacoesCount(0);
    window.addEventListener("publicados_visited", handleVisited);
    return () => window.removeEventListener("publicados_visited", handleVisited);
  }, []);

  useEffect(() => {
    async function checarAlertasERegistros() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // --- 1. CHECAGEM DE REGISTROS VENCENDO ---
        let queryRegistros = supabase.from("registros").select("vigencia");
        if (!isInterno) {
          queryRegistros = queryRegistros.eq("user_id", user.id);
        }

        const { data: dataReg } = await queryRegistros;
        if (dataReg) {
          const hoje = new Date();
          const limite45Dias = new Date();
          limite45Dias.setDate(hoje.getDate() + 45);

          const qtdUrgente = dataReg.filter((r) => {
            if (!r.vigencia) return false;
            const [ano, mes, dia] = r.vigencia.split("-");
            const dataVencimento = new Date(Number(ano), Number(mes) - 1, dia ? Number(dia) : 1);
            return dataVencimento >= hoje && dataVencimento <= limite45Dias;
          }).length;
          setAlertasUrgentes(qtdUrgente);
        }

        // --- 2. CHECAGEM DE NOVAS PUBLICAÇÕES (AGORA EXCLUSIVO PARA O LICENCIADO) ---
        // Se a pessoa FOR Interno (Aurotech), ignoramos essa contagem inteira!
        if (!isInterno && pathname !== "/publicados") {
          const STORAGE_KEY = "@aurotech:last_visit_publicados";
          const lastVisitIso = localStorage.getItem(STORAGE_KEY);
          let lastVisitDate = new Date();
          
          if (lastVisitIso) {
            lastVisitDate = new Date(lastVisitIso);
          } else {
            lastVisitDate.setDate(lastVisitDate.getDate() - 7);
          }

          let queryPubs = supabase
            .from("publicacoes")
            .select("id", { count: "exact", head: true })
            .gt("created_at", lastVisitDate.toISOString());

          if (profile?.licencas && profile.licencas.length > 0) {
            const licencaAtiva = profile.licencas[0];
            const regraTerritorio = TERRITORIOS_ESPECIAIS[licencaAtiva.estado];

            if (regraTerritorio) {
              queryPubs = queryPubs.eq("estado", regraTerritorio.estado);
            } else {
              queryPubs = queryPubs.eq("estado", licencaAtiva.estado);
            }
          }

          const { count } = await queryPubs;
          if (count) {
            setNovasPublicacoesCount(count);
          }
        }

      } catch (error) {
        console.error("Erro ao checar alertas:", error);
      }
    }

    if (profile) {
      checarAlertasERegistros();
    }
  }, [profile, isInterno, pathname]);

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-[#f9fafb] border-r border-slate-200 transition-all duration-300 shrink-0",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* CABEÇALHO / LOGO */}
      <div className={cn("flex items-center px-4 pt-6 pb-5 border-b border-slate-200/60", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-slate-500/10 p-1.5 rounded-lg shrink-0">
              <Radar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-base font-bold text-slate-800 leading-tight">IntelBI</h1>
              <p className="text-[11px] text-slate-500 truncate leading-tight">Painel de Gestão</p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors shrink-0"
          )}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ArrowLeftToLine className="h-5 w-5" />}
        </button>
      </div>
      

      {/* ÁREA DE NAVEGAÇÃO PRINCIPAL */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-5 pb-2">
        
        {/* WIDGET DE ALERTA INTELIGENTE DE REGISTROS */}
        {alertasUrgentes > 0 && (
          <Link href="/home" className={cn("block mb-5", collapsed && "flex justify-center")}>
            {collapsed ? (
              <div className="p-2 bg-red-50 text-red-600 rounded-xl cursor-pointer hover:bg-red-100 transition-colors" title={`${alertasUrgentes} alertas!`}>
                <BellRing className="h-[18px] w-[18px] animate-pulse" />
              </div>
            ) : (
              <div className="p-3 bg-red-50 hover:bg-red-100 transition-colors border border-red-100 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer group">
                <BellRing className="h-4 w-4 text-red-600 animate-pulse shrink-0" />
                <p className="text-[12px] font-medium text-red-700 leading-tight">
                  <span className="font-bold">{alertasUrgentes}</span> contratos próximos ao vencimento!
                </p>
              </div>
            )}
          </Link>
        )}

        {/* GRUPOS DE MENU */}
        {menuGroups.map((grupo, index) => {
          const itensVisiveis = grupo.items.filter(item => !item.somenteInterno || isInterno);
          if (itensVisiveis.length === 0) return null;

          return (
            <div key={grupo.titulo} className="mb-6">
              
              {!collapsed ? (
                <h4 className="px-3 mb-2 text-[11px] font-bold text-blue-900 tracking-[0.08em]">
                  {grupo.titulo}
                </h4>
              ) : (
                index !== 0 && <div className="h-px bg-slate-200/60 w-8 mx-auto mb-4 mt-2" />
              )}

              <div className="space-y-0.5">
                {itensVisiveis.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href; 
                  
                  const hasPubNotification = item.href === "/publicados" && novasPublicacoesCount > 0;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors relative",
                        isActive
                          ? "bg-slate-100 text-blue-600 font-bold"
                          : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
                        collapsed && "justify-center px-0 py-2.5"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="relative flex items-center justify-center">
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            isActive ? "text-blue-600" : "text-slate-500"
                          )}
                        />
                        {hasPubNotification && collapsed && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
                          </span>
                        )}
                      </div>
                      
                      {!collapsed && <span>{item.label}</span>}

                      {hasPubNotification && !collapsed && (
                        <div className="ml-auto flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-300">
                          {novasPublicacoesCount}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

      </nav>
      

      {/* RODAPÉ: PERFIL E LOGOUT */}
      <div className="p-4 border-t border-slate-200/60 bg-white flex items-center justify-between mt-auto">
        <div className={cn("flex items-center gap-3 min-w-0", collapsed && "hidden")}>
          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
            <UserCircle className="h-5 w-5 text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{profile?.nome || "Usuário"}</p>
            <p className="text-[11px] font-medium text-slate-500 capitalize">{profile?.perfil || "Acessando"}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className={cn(
            "p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0",
            collapsed && "mx-auto w-full flex justify-center"
          )}
          title="Sair do sistema"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}