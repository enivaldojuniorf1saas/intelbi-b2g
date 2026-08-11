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
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Map,
  BellRing,
  Megaphone,
  ShieldAlert,
  Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

// ✨ NOVO FORMATO: Menus divididos por Sessões/Grupos
const menuGroups = [
  {
    titulo: "Operacional",
    items: [
      { label: "Home", href: "/home", icon: Ticket, somenteInterno: false },
      { label: "Registros", href: "/registros", icon: PlusCircle, somenteInterno: false },
      { label: "Publicados", href: "/publicados", icon: Megaphone, somenteInterno: false },
    ]
  },
  {
    titulo: "Visões Analíticas",
    items: [
      { label: "Inteligência Geo", href: "/mapa", icon: Map, somenteInterno: false },
      { label: "Dashboard", href: "/dashboard", icon: BarChart3, somenteInterno: false },
    ]
  },
  {
    titulo: "Administração",
    items: [
      { label: "Auditoria", href: "/auditoria", icon: ShieldAlert, somenteInterno: true },
      { label: "Importar CSV", href: "/importar", icon: Upload, somenteInterno: true },
    ]
  },
  {
    titulo: "Financeiro",
    items: [
      { label: "Faturamento", href: "/financeiro", icon: Banknote, somenteInterno: true },
    ]
  }
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  
  const { isInterno, profile } = useAuth();
  
  const [alertasUrgentes, setAlertasUrgentes] = useState(0);

  // EFEITO VIGILANTE: Cálculo dinâmico de 45 dias
  useEffect(() => {
    async function checarAlertas() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase.from("registros").select("vigencia");
        
        if (!isInterno) {
          query = query.eq("user_id", user.id);
        }

        const { data } = await query;
        if (data) {
          const hoje = new Date();
          const limite45Dias = new Date();
          limite45Dias.setDate(hoje.getDate() + 45);

          const qtdUrgente = data.filter((r) => {
            if (!r.vigencia) return false;
            const [ano, mes, dia] = r.vigencia.split("-");
            const dataVencimento = new Date(Number(ano), Number(mes) - 1, dia ? Number(dia) : 1);
            return dataVencimento >= hoje && dataVencimento <= limite45Dias;
          }).length;
          
          setAlertasUrgentes(qtdUrgente);
        }
      } catch (error) {
        console.error("Erro ao checar alertas:", error);
      }
    }

    if (profile) {
      checarAlertas();
    }
  }, [profile, isInterno]);

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-white border-r border-slate-200 transition-all duration-200 shrink-0",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 truncate">
              IntelBI
            </p>
            <p className="text-sm text-slate-400 truncate">
              {profile?.nome || "Carregando..."}
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 shrink-0",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* WIDGET DE ALERTA INTELIGENTE */}
      {alertasUrgentes > 0 && (
        <div className={cn("px-3 mb-2", collapsed && "flex justify-center")}>
          <Link href="/home" className="block">
            {collapsed ? (
              <div 
                className="p-2 bg-red-50 text-red-600 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
                title={`Você tem ${alertasUrgentes} oportunidades vencendo nos próximos 45 dias! Clique aqui para ver.`}
              >
                <BellRing className="h-[18px] w-[18px] animate-pulse" />
              </div>
            ) : (
              <div className="p-3 bg-red-50 hover:bg-red-100 transition-colors border border-red-100 rounded-xl flex items-start gap-3 shadow-sm cursor-pointer group">
                <div className="bg-red-100 group-hover:bg-red-200 transition-colors p-1.5 rounded-lg shrink-0 mt-0.5">
                  <BellRing className="h-4 w-4 text-red-600 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Ação Necessária</p>
                  <p className="text-[11px] font-medium text-red-600 mt-1 leading-snug">
                    Você tem <span className="font-bold text-red-700">{alertasUrgentes} oportunidade(s)</span> vencendo em até 45 dias! <span className="underline font-bold text-red-700">Clique aqui.</span>
                  </p>
                </div>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* ✨ MENUS SEPARADOS POR SESSÃO */}
      <nav className="flex-1 px-3 overflow-y-auto mt-2 pb-4 custom-scrollbar">
        {menuGroups.map((grupo, index) => {
          // Filtra os itens deste grupo baseando-se na permissão do usuário
          const itensVisiveis = grupo.items.filter(item => !item.somenteInterno || isInterno);
          
          // Se o grupo ficar vazio (ex: Administração para um parceiro), não renderiza nada
          if (itensVisiveis.length === 0) return null;

          return (
            <div key={grupo.titulo} className={cn("mb-5", index === 0 && "mt-1")}>
              
              {/* Título da Sessão (Oculto se a barra estiver minimizada) */}
              {!collapsed ? (
                <h4 className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {grupo.titulo}
                </h4>
              ) : (
                // Linha separadora discreta quando minimizado (exceto no primeiro)
                index !== 0 && <div className="h-px bg-slate-100 w-8 mx-auto mb-3 mt-1" />
              )}

              <div className="space-y-1">
                {itensVisiveis.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href; 
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive ? "text-blue-600" : "text-slate-400"
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-3 pb-4 pt-2 space-y-2 border-t border-slate-100 mt-auto">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-slate-400",
            collapsed && "justify-center px-0"
          )}
        >
          <UserCircle className="h-[18px] w-[18px] shrink-0 text-blue-500" />
          {!collapsed && <span className="capitalize font-semibold text-slate-600">{profile?.perfil || "Usuário"}</span>}
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium border transition-colors",
            darkMode
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-blue-600 text-slate-600 hover:bg-blue-50",
            collapsed && "justify-center px-0"
          )}
        >
          {darkMode ? (
            <Sun className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" />
          )}
          {!collapsed && <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>}
        </button>

        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium text-slate-600 hover:bg-slate-50",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}