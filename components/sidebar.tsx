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
  Lock, // ✨ NOVO: Ícone do cadeado
  FileSignature, // ✨ NOVO: Ícone para Contratos
  Sparkles, // ✨ NOVO: Ícone para o Modal de Vendas
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

// Importações para o Modal de Vendas
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ✨ Tipagem do TypeScript para garantir que ele entenda o 'modulo' opcional
type MenuItem = {
  label: string;
  href: string;
  icon: any;
  somenteInterno: boolean;
  modulo?: string;
};

type MenuGroup = {
  titulo: string;
  items: MenuItem[];
};

const TERRITORIOS_ESPECIAIS: Record<string, { estado: string, mesorregioes: string[] }> = {
  "CE_SUL": {
    estado: "CE",
    mesorregioes: ["Sul Cearense", "Centro-Sul Cearense"] 
  }
};

// ✨ ESTRUTURA SAAS: Agora a constante tem a tipagem MenuGroup[]
const menuGroups: MenuGroup[] = [
  {
    titulo: "OPERACIONAL",
    items: [
      { label: "Home", href: "/home", icon: Ticket, somenteInterno: false, modulo: "base" },
      { label: "Registros", href: "/registros", icon: PlusCircle, somenteInterno: false, modulo: "registros" },
      { label: "Publicados", href: "/publicados", icon: Megaphone, somenteInterno: false, modulo: "publicados" },
      // 👇 Novo módulo premium adicionado na vitrine
      { label: "Contratos", href: "/contratos", icon: FileSignature, somenteInterno: false, modulo: "contratos" }, 
    ]
  },
  {
    titulo: "VISÕES ANALÍTICAS",
    items: [
      { label: "Inteligência Geo", href: "/mapa", icon: Map, somenteInterno: false, modulo: "base" },
      { label: "Dashboard", href: "/dashboard", icon: BarChart3, somenteInterno: false, modulo: "base" },
    ]
  },
  {
    titulo: "ADMINISTRAÇÃO",
    items: [
      { label: "Auditoria", href: "/auditoria", icon: ShieldAlert, somenteInterno: true },
      { label: "Importar CSV", href: "/importar", icon: Upload, somenteInterno: true },
      // 👇 Futura tela da Fase 4
      { label: "Licenciados", href: "/licenciados", icon: Users, somenteInterno: true },
    ]
  },
  {
    titulo: "DESEMPENHO",
    items: [
      { label: "Volume de Venda", href: "/volume", icon: Banknote, somenteInterno: false },
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

  // ✨ ESTADOS DO MODAL DE VENDAS (UPSELL)
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [moduloDesejado, setModuloDesejado] = useState<any>(null);

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

        // --- 2. CHECAGEM DE NOVAS PUBLICAÇÕES ---
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

  // ✨ FUNÇÃO GUARDIÃ DA VITRINE: Checa se o usuário tem a chave do módulo
  const checarAcessoModulo = (modulo?: string) => {
    if (isInterno) return true; // Administradores veem TUDO
    if (!modulo || modulo === "base") return true; // Módulos básicos (Home/Mapa) são de todos
    
    // Verifica se a string do módulo (ex: 'publicados') existe no array de compras do perfil
    return profile?.modulos_ativos?.includes(modulo) || profile?.modulos_ativos?.includes("ALL");
  };

  const abrirUpsell = (item: any) => {
    setModuloDesejado(item);
    setIsUpsellOpen(true);
  };

  return (
    <>
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
                    
                    // ✨ LÓGICA DO SAAS: Verifica se o cliente pagou por esse menu
                    const temAcesso = checarAcessoModulo(item.modulo);
                    
                    // SE NÃO TEM ACESSO, RENDERIZA O BOTÃO DE CADEADO 🔒
                    if (!temAcesso) {
                      return (
                        <button
                          key={item.href}
                          onClick={() => abrirUpsell(item)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors cursor-pointer",
                            "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                            collapsed && "justify-center px-0 py-2.5"
                          )}
                          title={collapsed ? `${item.label} (Módulo Premium)` : undefined}
                        >
                          <div className="relative flex items-center justify-center">
                            <Icon className="h-[18px] w-[18px] shrink-0 opacity-60" />
                            <div className="absolute -bottom-1 -right-1.5 bg-slate-50 rounded-full p-0.5">
                              <Lock className="h-3 w-3 text-amber-500" />
                            </div>
                          </div>
                          
                          {!collapsed && (
                            <div className="flex-1 flex justify-between items-center">
                              <span>{item.label}</span>
                              <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-sm">Premium</span>
                            </div>
                          )}
                        </button>
                      );
                    }

                    // SE TEM ACESSO, RENDERIZA O LINK NORMAL ✅
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

      {/* ✨ O MODAL DE VENDAS (UPSELL) - VERSÃO SENHOR BARRIGA CINEMATOGRÁFICA */}
      <Dialog open={isUpsellOpen} onOpenChange={setIsUpsellOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          
          {/* ÁREA SUPERIOR: Imagem de Fundo + Overlay Escuro + Texto */}
          <div className="relative pt-32 pb-8 px-8 text-center overflow-hidden flex flex-col justify-end min-h-[280px]">
            
            {/* 1. Imagem de Fundo */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-top bg-no-repeat"
              style={{ backgroundImage: "url('https://i.postimg.cc/ZRsbvw5s/seubarriga-removebg-preview.png')" }}
            ></div>
            
            {/* 2. Película escura (Overlay) para o texto não sumir no fundo */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent"></div>
            
            {/* 3. Textos flutuando sobre a imagem */}
            <div className="relative z-20 flex flex-col items-center mt-auto">
              <DialogTitle className="text-3xl font-black text-white mb-2 drop-shadow-lg tracking-tight">
                Olá meu amigo! 💼
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-sm leading-relaxed max-w-sm mx-auto font-medium drop-shadow-md">
                Que tal ter um maior controle dos contratos? O módulo <strong className="text-amber-400 font-bold uppercase">{moduloDesejado?.label}</strong> é premium. Para acessar, você tem que pagar 14 meses de aluguel.
              </DialogDescription>
            </div>
          </div>
          
          {/* ÁREA INFERIOR: Botões Brancos */}
          <div className="p-6 bg-white text-center">
            <p className="text-sm text-slate-600 mb-6 font-medium">
              Brincadeiras à parte, eleve a gestão da sua carteira B2G. Libere agora este módulo e obtenha inteligência de dados completa.
            </p>
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={() => setIsUpsellOpen(false)} className="flex-1 font-bold text-slate-500 hover:bg-slate-100">
                Esconder no Barril
              </Button>
              <Button onClick={() => {
                alert("Um consultor entrará em contato para negociar sua dívida... digo, seu módulo!");
                setIsUpsellOpen(false);
              }} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md hover:shadow-lg transition-all">
                Falar com Seu Barriga
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}