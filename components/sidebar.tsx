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
  BellRing // ✨ Novo ícone para o alerta
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { label: "Home", href: "/home", icon: Ticket, somenteInterno: false },
  { label: "Inteligência Geo", href: "/mapa", icon: Map, somenteInterno: false },
  { label: "Registros", href: "/registros", icon: PlusCircle, somenteInterno: false },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, somenteInterno: false },
  { label: "Importar CSV", href: "/importar", icon: Upload, somenteInterno: true },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  
  const { isInterno, profile } = useAuth();
  
  // ✨ ESTADO DO ALERTA INTELIGENTE
  const [alertasUrgentes, setAlertasUrgentes] = useState(0);

  // ✨ EFEITO VIGILANTE: Busca contratos de "Curto Prazo" em segundo plano
  useEffect(() => {
    async function checarAlertas() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Busca apenas a coluna de vigência para economizar dados de internet
        let query = supabase.from("registros").select("vigencia");
        
        // 🛡️ RBAC aplicado aos alertas
        if (!isInterno) {
          query = query.eq("user_id", user.id);
        }

        const { data } = await query;
        if (data) {
          // Conta quantos estão na janela de risco (Jun/26 até Ago/26)
          const qtdUrgente = data.filter((r) => {
            if (!r.vigencia) return false;
            const mesAno = r.vigencia.substring(0, 7);
            return mesAno >= "2026-06" && mesAno <= "2026-08";
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

  const menusVisiveis = menuItems.filter(
    (item) => !item.somenteInterno || isInterno
  );

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

      {/* Menus */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2 pb-4 custom-scrollbar">
        {menusVisiveis.map((item) => {
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
      </nav>

      {/* 🔔 WIDGET DE ALERTA INTELIGENTE */}
      {alertasUrgentes > 0 && (
        <div className={cn("px-3 mb-2", collapsed && "flex justify-center")}>
          {collapsed ? (
            <div 
              className="p-2 bg-red-50 text-red-600 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
              title={`${alertasUrgentes} oportunidades vencendo até Ago/26!`}
            >
              <BellRing className="h-[18px] w-[18px] animate-pulse" />
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 shadow-sm cursor-default">
              <div className="bg-red-100 p-1.5 rounded-lg shrink-0 mt-0.5">
                <BellRing className="h-4 w-4 text-red-600 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Ação Necessária</p>
                <p className="text-[11px] font-medium text-red-600 mt-1 leading-snug">
                  Você tem <span className="font-bold text-red-700">{alertasUrgentes} município(s)</span> com vigência vencendo até Ago/26.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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