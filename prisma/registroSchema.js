import { z } from "zod";

export const registroSchema = z.object({
  dataMarcada: z.string(),
  horaInicio: z.string().optional(),
  horaSaida: z.string(),
  destino: z.string().optional(),
  kmIda: z.coerce.number(),
  kmVolta: z.coerce.number(),
  observacao: z.string().nullable().optional(),
  veiculo: z.string(),
  placa: z.string(),
  rgCondutor: z.string(),
});
