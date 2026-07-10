// src/lib/validations/registro.ts
import { z } from "zod";

export const registroSchema = z.object({
  estado: z.string().min(2, "Obrigatório").max(2, "Use a sigla com 2 letras"),
  local: z.string().min(1, "O local é obrigatório"),
  decisor: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  objeto: z.string().optional().nullable(),
  valor: z.number().nonnegative("O valor não pode ser negativo").optional().nullable(),
  vigencia: z.string().optional().nullable(),
  fornecedor: z.string().optional().nullable(),
  taxa: z.number().optional().nullable(),
  regiao: z.string().optional().nullable(),
  habitantes: z.number().int().nonnegative().optional().nullable(),
  distancia_km: z.number().nonnegative().optional().nullable(),
  qualificacao: z.string().optional().nullable(),
  data_evento: z.string().optional().nullable(),
});

export type RegistroInput = z.infer<typeof registroSchema>;