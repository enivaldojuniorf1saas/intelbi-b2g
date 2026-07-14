"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";


const menuItems = [
  { label: "Home", href: "/home", icon: Ticket, somenteInterno: false },
  { label: "Registros", href: "/registros", icon: PlusCircle, somenteInterno: false },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, somenteInterno: false },
  { label: "Importar CSV", href: "/importar", icon: Upload, somenteInterno: true },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  
  const { isInterno, profile } = useAuth();

  const menusVisiveis = menuItems.filter(
    (item) => !item.somenteInterno || isInterno
  );

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-white border-r border-slate-200 transition-all duration-200",
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
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-4">
        {menusVisiveis.map((item) => {
          const Icon = item.icon;
          // Deixa o menu azul se estiver na página
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

      {/* Rodapé */}
      <div className="px-3 pb-4 space-y-2">
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