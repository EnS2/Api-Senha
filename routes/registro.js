/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
import express from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";
import dateFnsTz from "date-fns-tz";
import { ROLES } from "./role.js";

const { zonedTimeToUtc, formatInTimeZone } = dateFnsTz;

const prisma = new PrismaClient();
const router = express.Router();
const TIMEZONE = "America/Sao_Paulo";

// Middleware de autenticação JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const segredo = process.env.JWT_SECRET || "segredo-padrao";
    const payload = jwt.verify(token, segredo);

    if (!payload?.id) {
      return res.status(401).json({ error: "Token inválido: ID ausente." });
    }

    req.usuario = payload;
    next();
  } catch (err) {
    console.error("Erro ao validar token:", err);
    return res.status(403).json({ error: "Token inválido." });
  }
}

// Validação dos dados do registro
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
      return res.status(400).json({
        error: "Dados inválidos.",
        detalhes: parseResult.error.errors,
      });
    }

    const {
      rgCondutor,
      dataMarcada,
      horaInicio,
      horaSaida,
      destino,
      kmIda,
      kmVolta,
      observacao,
      veiculo,
      placa,
    } = parseResult.data;

    const userId = req.usuario.id;

    const dataMarcadaDate = zonedTimeToUtc(`${dataMarcada}T00:00:00`, TIMEZONE);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const usuario = await prisma.user.findUnique({ where: { id: userId } });
    if (!usuario) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    const novoRegistro = await prisma.registro.create({
      data: {
        condutor: usuario.name,
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
    return res.status(500).json({
      error: error.message || "Erro interno no servidor.",
    });
  }
});

// GET /registrar
router.get("/", autenticarToken, async (req, res) => {
  try {
    const { id: userId, role } = req.usuario;
    const dataParam = req.query.data;

    let dataFiltro = {};

    if (dataParam) {
      let dataParamDate;

      try {
        dataParamDate = zonedTimeToUtc(`${dataParam}T00:00:00`, TIMEZONE);
        if (isNaN(dataParamDate.getTime())) {
          return res.status(400).json({ error: "Parâmetro de data inválido." });
        }
      } catch {
        return res.status(400).json({ error: "Parâmetro de data inválido." });
      }

      const inicioDoDiaUTC = dataParamDate;
      const fimDoDiaUTC = new Date(
        inicioDoDiaUTC.getTime() + 24 * 60 * 60 * 1000 - 1
      );

      dataFiltro = {
        dataMarcada: {
          gte: inicioDoDiaUTC,
          lte: fimDoDiaUTC,
        },
      };
    }

    const whereClause =
      role === ROLES.ADMIN ? dataFiltro : { userId, ...dataFiltro };

    const registros = await prisma.registro.findMany({
      where: whereClause,
      orderBy: { dataMarcada: "desc" },
      include: { user: true },
    });

    const registrosFormatados = registros.map((r) => ({
      id: r.id,
      dataFormatada: formatInTimeZone(r.dataMarcada, TIMEZONE, "dd/MM/yyyy"),
      dataISO: formatInTimeZone(r.dataMarcada, TIMEZONE, "yyyy-MM-dd"),
      nome: r.user?.name || "Nome não disponível",
      condutor: r.condutor || "",
      rg: r.rgCondutor,
      veiculo: r.veiculo,
      placa: r.placa,
      kmInicial: r.kmIda,
      kmFinal: r.kmVolta,
      observacoes: r.observacao,
      horaInicio: r.horaInicio,
      horaSaida: r.horaSaida,
      destino: r.destino,
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
    const { id: userId, role } = req.usuario;

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

    const dataMarcadaDate = zonedTimeToUtc(`${dataMarcada}T00:00:00`, TIMEZONE);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const registroExistente = await prisma.registro.findUnique({
      where: { id },
    });

    if (!registroExistente) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    if (registroExistente.userId !== userId && role !== ROLES.ADMIN) {
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
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

// DELETE /registrar/:id
router.delete("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.usuario;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID do registro inválido." });
    }

    const registroExistente = await prisma.registro.findUnique({
      where: { id },
    });

    if (!registroExistente) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    if (registroExistente.userId !== userId && role !== ROLES.ADMIN) {
      return res
        .status(403)
        .json({ error: "Sem permissão para deletar este registro." });
    }

    await prisma.registro.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar registro:", error);
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

export default router;
