"use client";

import { useState } from "react";
import {
  Ticket,
  PlusCircle,
  Users,
  BarChart3,
  Upload,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Home", href: "/home/page", icon: Ticket },
  { label: "Registros", href: "/novoRegistro", icon: PlusCircle },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Importar CSV", href: "/importar", icon: Upload },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activePath, setActivePath] = useState("/chamados");
  const [darkMode, setDarkMode] = useState(false);

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
              IntelBi-B2G
            </p>
            <p className="text-sm text-slate-400 truncate">
              Enivaldo Junior
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
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.href;
          return (
            <button
              key={item.href}
              onClick={() => setActivePath(item.href)}
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
            </button>
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
          <UserCircle className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Gestor</span>}
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