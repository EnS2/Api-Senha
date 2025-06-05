import express from "express";
import { PrismaClient } from "@prisma/client";
import { ObjectId } from "bson";
import jwt from "jsonwebtoken";
import { startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

const prisma = new PrismaClient();
const router = express.Router();

// Middleware de autenticação
function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // eslint-disable-next-line no-undef
    const segredo = process.env.JWT_SECRET || "segredo-padrao";
    const usuario = jwt.verify(token, segredo);
    req.usuario = usuario;
    next();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return res.status(403).json({ error: "Token inválido." });
  }
}

// Esquema com transformação de strings para número e aceitando null para campos opcionais
const registroSchema = z.object({
  dataMarcada: z.string(),
  horaInicio: z.string().optional(),
  horaSaida: z.string(),
  destino: z.string().optional(),
  kmIda: z.coerce.number(),
  kmVolta: z.coerce.number(),
  observacao: z.string().nullable().optional(), // aceita string, null ou undefined
  editadoPor: z.string().nullable().optional(),
  veiculo: z.string(),
  placa: z.string(),
  rgCondutor: z.string(),
});

function ajustarParaFusoSP(date) {
  const offsetSP = -3 * 60;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + offsetSP * 60000);
}

// POST
router.post("/registrar", autenticarToken, async (req, res) => {
  try {
    // Ajusta campos que podem vir null para undefined para melhor compatibilidade com o schema
    const body = { ...req.body };
    if (body.observacao === null) body.observacao = undefined;
    if (body.editadoPor === null) body.editadoPor = undefined;

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
      editadoPor,
      veiculo,
      placa,
      rgCondutor,
    } = parseResult.data;

    const { id: userId } = req.usuario;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "userId inválido." });
    }

    const userObjectId = new ObjectId(userId);
    const dataMarcadaDate = new Date(dataMarcada);

    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const usuarioExiste = await prisma.user.findUnique({
      where: { id: userObjectId },
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
        editadoPor: editadoPor ?? null,
        veiculo,
        placa,
        userId: userObjectId,
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

// GET
router.get("/registrar", autenticarToken, async (req, res) => {
  try {
    const { id: userId } = req.usuario;

    const agoraSP = ajustarParaFusoSP(new Date());
    const inicioDoDiaSP = startOfDay(agoraSP);
    const fimDoDiaSP = endOfDay(agoraSP);

    const inicioUtc = new Date(
      inicioDoDiaSP.getTime() - inicioDoDiaSP.getTimezoneOffset() * 60000
    );
    const fimUtc = new Date(
      fimDoDiaSP.getTime() - fimDoDiaSP.getTimezoneOffset() * 60000
    );

    const registros = await prisma.registro.findMany({
      where: {
        userId: userId,
        dataMarcada: {
          gte: inicioUtc,
          lte: fimUtc,
        },
      },
      orderBy: { dataMarcada: "desc" },
      include: {
        user: true,
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
    }));

    return res.status(200).json(registrosFormatados);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

// PUT
router.put("/registrar/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID do registro inválido." });
    }

    // Ajusta campos que podem vir null para undefined
    const body = { ...req.body };
    if (body.observacao === null) body.observacao = undefined;
    if (body.editadoPor === null) body.editadoPor = undefined;

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
      editadoPor,
      veiculo,
      placa,
      rgCondutor,
    } = parseResult.data;

    const dataMarcadaDate = new Date(dataMarcada);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
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
        editadoPor: editadoPor ?? null,
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

// DELETE
router.delete("/registrar/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID do registro inválido." });
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
