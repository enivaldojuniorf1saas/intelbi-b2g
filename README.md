# 🎯 IntelBI - Painel de Gestão e Inteligência

O **IntelBI** é uma plataforma robusta de Business Intelligence e Gestão Operacional construída para centralizar, analisar e gerenciar o fluxo de faturamento, performance e registros de licenciados. 

O sistema foi desenhado para oferecer uma experiência de usuário (UI/UX) fluida, com foco em visualização de dados (dashboards, mapas) e gestão em lote (Matrizes de Lançamento).

## 🚀 Tecnologias Utilizadas (Stack)

O projeto foi construído utilizando as tecnologias mais modernas do ecossistema React:

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Linguagem:** TypeScript
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + Utilitários `cn` (clsx/tailwind-merge)
*   **Componentes de UI:** Radix UI / shadcn/ui
*   **Ícones:** [Lucide React](https://lucide.dev/)
*   **Gráficos e BI:** [Recharts](https://recharts.org/)
*   **Gerenciamento de Formulários:** React Hook Form + Zod (Validação)
*   **Backend / Banco de Dados / Autenticação:** [Supabase](https://supabase.com/) (PostgreSQL com Row Level Security)

## 🧩 Arquitetura e Módulos Principais

O painel é dividido sob uma governança de permissões (Usuários Internos vs. Licenciados/Parceiros) através do `auth-context`, separando as visões nos seguintes módulos:

### 1. Operacional
*   **Home:** Visão geral e widgets de alertas inteligentes (ex: oportunidades vencendo em 45 dias).
*   **Registros / Publicados:** Gestão do ciclo de vida das oportunidades de negócio e licitações mapeadas.

### 2. Visões Analíticas
*   **Inteligência Geo (Mapa):** Mapeamento geográfico de clientes e performance.
*   **Dashboard:** Visão macro de KPIs operacionais.

### 3. Administração
*   **Auditoria:** Log e rastreio de ações no sistema (Apenas Internos).
*   **Importar CSV:** Ferramenta de *Bulk Insert* para carga massiva de dados.

### 4. Desempenho (Performance)
*   **Volume de Venda:** Gestão de receita (faturamento) utilizando o conceito de Matriz de Lançamento em lote para 11 categorias de módulos (Frota, Benefícios, Outros). Possui visão Master-Detail.
*   **Growth (Crescimento):** Painel de BI focado em evolução de receita, destacando Market Share de produtos (Area Charts) e Ranking de Top Performers (Bar Charts).

## 📂 Estrutura de Pastas

```text
├── src/
│   ├── app/                 # Rotas do Next.js (App Router)
│   │   ├── (app)/           # Rotas protegidas (Dashboard, Volume, Growth, etc)
│   │   ├── login/           # Rota pública de autenticação
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Componentes reutilizáveis
│   │   ├── ui/              # Componentes base (Botões, Inputs, Modais, Tabelas)
│   │   ├── sidebar.tsx      # Navegação lateral e controle de sessão
│   │   └── novo-faturamento-modal.tsx # Modais de negócio complexos
│   ├── contexts/            # Context API (auth-context.tsx)
│   └── lib/                 # Utilitários (supabase.ts, utils.ts)