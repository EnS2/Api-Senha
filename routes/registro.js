/* eslint-disable no-undef */
import express from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

const prisma = new PrismaClient();
const router = express.Router();

function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const segredo = process.env.JWT_SECRET || "segredo-padrao";
    const payload = jwt.verify(token, segredo);

    if (!payload || !payload.id) {
      return res
        .status(401)
        .json({ error: "Token inválido: id do usuário ausente." });
    }

    req.usuario = payload;
    next();
  } catch (err) {
    console.error("Erro ao validar token:", err);
    return res.status(403).json({ error: "Token inválido." });
  }
}

const registroSchema = z.object({
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

// POST /registrar
router.post("/", autenticarToken, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.observacao === null) body.observacao = undefined;

    const parseResult = registroSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("Erros de validação:", parseResult.error.format());
      return res.status(400).json({
        error: "Dados inválidos.",
        detalhes: parseResult.error.errors,
      });
    }

    const {
      dataMarcada,
      horaInicio,
      horaSaida,
      destino,
      kmIda,
      kmVolta,
      observacao,
      veiculo,
      placa,
      rgCondutor,
    } = parseResult.data;

    const userId = req.usuario.id;

    // Corrigir criação da data local
    const [year, month, day] = dataMarcada.split("-").map(Number);
    const dataMarcadaDate = new Date(year, month - 1, day);

    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const usuarioExiste = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!usuarioExiste) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    const novoRegistro = await prisma.registro.create({
      data: {
        rgCondutor,
        dataMarcada: dataMarcadaDate,
        horaInicio: horaInicio ?? null,
        horaSaida,
        destino: destino ?? null,
        kmIda,
        kmVolta,
        observacao: observacao ?? null,
        editadoPor: null,
        veiculo,
        placa,
        userId,
      },
    });

    return res.status(201).json(novoRegistro);
  } catch (error) {
    console.error("Erro ao criar registro:", error);
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

// GET /registrar
router.get("/", autenticarToken, async (req, res) => {
  try {
    const userId = req.usuario.id;
    const dataParam = req.query.data;
    let dataFiltro = {};

    if (dataParam) {
      let dataParamDate;

      try {
        dataParamDate = new Date(dataParam);

        // Se for um formato customizado tipo "YYYY-MM-DD", trata manualmente
        if (dataParam.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
          const [year, month, day] = dataParam.split("-").map(Number);
          dataParamDate = new Date(year, month - 1, day);
        }

        if (isNaN(dataParamDate.getTime())) {
          throw new Error("Data inválida");
        }
      } catch {
        return res.status(400).json({ error: "Parâmetro de data inválido." });
      }

      const inicioDoDia = startOfDay(dataParamDate);
      const fimDoDia = endOfDay(dataParamDate);

      dataFiltro = {
        dataMarcada: {
          gte: inicioDoDia,
          lte: fimDoDia,
        },
      };
    }

    const registros = await prisma.registro.findMany({
      where: {
        userId,
        ...dataFiltro,
      },
      orderBy: { dataMarcada: "desc" },
      select: {
        id: true,
        dataMarcada: true,
        rgCondutor: true,
        veiculo: true,
        placa: true,
        kmIda: true,
        kmVolta: true,
        observacao: true,
        editadoPor: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const registrosFormatados = registros.map((r) => ({
      id: r.id,
      data: new Date(r.dataMarcada).toLocaleDateString("pt-BR"),
      nome: r.user?.name ?? "Desconhecido",
      rg: r.rgCondutor,
      veiculo: r.veiculo,
      placa: r.placa,
      kmInicial: r.kmIda,
      kmFinal: r.kmVolta,
      observacoes: r.observacao,
      editadoPor: r.editadoPor,
    }));

    return res.status(200).json(registrosFormatados);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

// PUT /registrar/:id
router.put("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.usuario.id;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID do registro inválido." });
    }

    const body = { ...req.body };
    if (body.observacao === null) body.observacao = undefined;

    const parseResult = registroSchema.safeParse(body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Dados inválidos.",
        detalhes: parseResult.error.errors,
      });
    }

    const {
      dataMarcada,
      horaInicio,
      horaSaida,
      destino,
      kmIda,
      kmVolta,
      observacao,
      veiculo,
      placa,
      rgCondutor,
    } = parseResult.data;

    // Corrigir dataMarcada local
    const [year, month, day] = dataMarcada.split("-").map(Number);
    const dataMarcadaDate = new Date(year, month - 1, day);

    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const registroExistente = await prisma.registro.findUnique({
      where: { id },
    });

    if (!registroExistente) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    if (registroExistente.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Sem permissão para editar este registro." });
    }

    const registroAtualizado = await prisma.registro.update({
      where: { id },
      data: {
        rgCondutor,
        dataMarcada: dataMarcadaDate,
        horaInicio: horaInicio ?? null,
        horaSaida,
        destino: destino ?? null,
        kmIda,
        kmVolta,
        observacao: observacao ?? null,
        editadoPor: userId,
        veiculo,
        placa,
      },
    });

    return res.status(200).json(registroAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar registro:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Registro não encontrado." });
    }
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

// DELETE /registrar/:id
router.delete("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.usuario.id;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID do registro inválido." });
    }

    const registroExistente = await prisma.registro.findUnique({
      where: { id },
    });

    if (!registroExistente) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    if (registroExistente.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Sem permissão para deletar este registro." });
    }

    await prisma.registro.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar registro:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Registro não encontrado." });
    }
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

export default router;
