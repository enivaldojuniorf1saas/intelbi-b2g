"use client";

import { useState } from "react";
import { X, Loader2, Trash2, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Nota = {
  id: string;
  autor_id: string;
  autor_nome: string;
  texto: string;
  criado_em: string;
};

type Registro = {
  id: string;
  user_id: string | null;
  estado: string | null;
  local: string | null;
  decisor: string | null;
  numero: string | null;
  referencia: string | null;
  objeto: string | null;
  valor: number | null;
  vigencia: string | null;
  fornecedor: string | null;
  taxa: number | null;
  regiao: string | null;
  habitantes: number | null;
  distancia_km: number | null;
  qualificacao: string | null;
  data_evento: string | null;
  created_at: string | null;
  updated_at: string | null;
  historico_notas: Nota[] | null;
  dia_visita: string | null;
};

export function RegistroModal({
  registro,
  perfil,
  userId,
  onClose,
  onUpdated,
}: {
  registro: Registro;
  perfil: "interno" | "externo" | null;
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const isInterno = perfil === "interno";

  const [qualificacao, setQualificacao] = useState(registro.qualificacao ?? "");
  const [diaVisita, setDiaVisita] = useState(registro.dia_visita ?? "");
  const [novaNota, setNovaNota] = useState("");
  const [editandoNotaId, setEditandoNotaId] = useState<string | null>(null);
  const [textoEdicaoNota, setTextoEdicaoNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const notas: Nota[] = Array.isArray(registro.historico_notas)
    ? registro.historico_notas
    : [];

  async function salvarGestao() {
    setSaving(true);
    setError("");
    try {
      if (isInterno) {
        const { error } = await supabase
          .from("registros")
          .update({ qualificacao, dia_visita: diaVisita || null })
          .eq("id", registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("atualizar_registro_externo", {
          p_registro_id: registro.id,
          p_qualificacao: qualificacao,
          p_dia_visita: diaVisita || null,
        });
        if (error) throw error;
      }
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function adicionarNota() {
    if (!novaNota.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.rpc("adicionar_nota", {
        p_registro_id: registro.id,
        p_texto: novaNota.trim(),
      });
      if (error) throw error;
      setNovaNota("");
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? "Erro ao adicionar nota.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarEdicaoNota(notaId: string) {
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.rpc("editar_nota", {
        p_registro_id: registro.id,
        p_nota_id: notaId,
        p_novo_texto: textoEdicaoNota,
      });
      if (error) throw error;
      setEditandoNotaId(null);
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? "Erro ao editar nota.");
    } finally {
      setSaving(false);
    }
  }

  async function excluirNota(notaId: string) {
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.rpc("excluir_nota", {
        p_registro_id: registro.id,
        p_nota_id: notaId,
      });
      if (error) throw error;
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? "Erro ao excluir nota.");
    } finally {
      setSaving(false);
    }
  }

  const camposDetalhe: { label: string; value: string | number | null }[] = [
    { label: "Número", value: registro.numero },
    { label: "Referência", value: registro.referencia },
    { label: "Objeto", value: registro.objeto },
    { label: "Local", value: registro.local },
    { label: "Estado", value: registro.estado },
    { label: "Região", value: registro.regiao },
    { label: "Decisor", value: registro.decisor },
    { label: "Fornecedor", value: registro.fornecedor },
    { label: "Valor", value: registro.valor },
    { label: "Taxa", value: registro.taxa },
    { label: "Vigência", value: registro.vigencia },
    { label: "Habitantes", value: registro.habitantes },
    { label: "Distância (km)", value: registro.distancia_km },
    { label: "Data do Evento", value: registro.data_evento },
    { label: "Criado em", value: registro.created_at },
    { label: "Atualizado em", value: registro.updated_at },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">
            {registro.objeto || "Detalhe do Registro"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Dados gerais (somente leitura) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Dados do Registro
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {camposDetalhe.map((c) => (
                <div key={c.label}>
                  <p className="text-xs text-slate-400">{c.label}</p>
                  <p className="text-sm text-slate-800">
                    {c.value !== null && c.value !== undefined && c.value !== ""
                      ? String(c.value)
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Gestão do Registro */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Gestão do Registro
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Qualificação</Label>
                <Input
                  value={qualificacao}
                  onChange={(e) => setQualificacao(e.target.value)}
                  placeholder="Qualificação"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dia da Visita</Label>
                <Input
                  type="date"
                  value={diaVisita ?? ""}
                  onChange={(e) => setDiaVisita(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 p-2.5 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <Button
              onClick={salvarGestao}
              disabled={saving}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>

          {/* Notas */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Nota sobre a Movimentação
            </h3>

            <div className="space-y-3">
              {notas.length === 0 && (
                <p className="text-sm text-slate-400">
                  Nenhuma nota registrada.
                </p>
              )}

              {notas.map((nota) => {
                const souAutor = nota.autor_id === userId;
                const emEdicao = editandoNotaId === nota.id;
                return (
                  <div
                    key={nota.id}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-600">
                        {nota.autor_nome}
                      </p>
                      {souAutor && !emEdicao && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditandoNotaId(nota.id);
                              setTextoEdicaoNota(nota.texto);
                            }}
                            className="text-slate-400 hover:text-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => excluirNota(nota.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {emEdicao ? (
                      <div className="flex gap-2">
                        <Input
                          value={textoEdicaoNota}
                          onChange={(e) => setTextoEdicaoNota(e.target.value)}
                          className="h-9 rounded-lg text-sm"
                        />
                        <Button
                          onClick={() => salvarEdicaoNota(nota.id)}
                          disabled={saving}
                          className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs px-3"
                        >
                          Salvar
                        </Button>
                        <Button
                          onClick={() => setEditandoNotaId(null)}
                          variant="ghost"
                          className="h-9 text-xs px-3"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700">{nota.texto}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3">
              <Input
                value={novaNota}
                onChange={(e) => setNovaNota(e.target.value)}
                placeholder="Escreva uma nota..."
                className="h-10 rounded-lg flex-1"
              />
              <Button
                onClick={adicionarNota}
                disabled={saving || !novaNota.trim()}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}