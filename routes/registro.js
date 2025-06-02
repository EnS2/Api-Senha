import express from "express";
import { PrismaClient } from "@prisma/client";
import { ObjectId } from "bson";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = express.Router();

// Middleware para autenticar o token e obter userId e nome
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

// POST: Criar novo registro
router.post("/registrar", autenticarToken, async (req, res) => {
  try {
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
    } = req.body;

    const { id: userId } = req.usuario;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "userId inválido." });
    }

    if (
      !dataMarcada ||
      !horaSaida ||
      kmIda === undefined ||
      kmVolta === undefined ||
      !veiculo ||
      !placa ||
      !rgCondutor
    ) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios estão faltando." });
    }

    const dataMarcadaDate = new Date(dataMarcada);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const kmIdaNum = parseFloat(kmIda);
    const kmVoltaNum = parseFloat(kmVolta);
    if (isNaN(kmIdaNum) || isNaN(kmVoltaNum)) {
      return res.status(400).json({ error: "kmIda ou kmVolta inválidos." });
    }

    const userObjectId = new ObjectId(userId);

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
        kmIda: kmIdaNum,
        kmVolta: kmVoltaNum,
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

// GET: Listar todos os registros formatados
router.get("/registrar", autenticarToken, async (req, res) => {
  try {
    const registros = await prisma.registro.findMany({
      orderBy: { dataMarcada: "desc" },
      include: {
        user: {
          select: {
            nome: true,
          },
        },
      },
    });

    const registrosFormatados = registros.map((r) => ({
      id: r.id,
      data: new Date(r.dataMarcada).toLocaleDateString("pt-BR"),
      nome: r.user?.nome ?? "Desconhecido",
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

// PUT: Atualizar registro por ID
router.put("/registrar/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID do registro inválido." });
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
    } = req.body;

    if (
      !dataMarcada ||
      !horaSaida ||
      kmIda === undefined ||
      kmVolta === undefined ||
      !veiculo ||
      !placa ||
      !rgCondutor
    ) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios estão faltando." });
    }

    const dataMarcadaDate = new Date(dataMarcada);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const kmIdaNum = parseFloat(kmIda);
    const kmVoltaNum = parseFloat(kmVolta);
    if (isNaN(kmIdaNum) || isNaN(kmVoltaNum)) {
      return res.status(400).json({ error: "kmIda ou kmVolta inválidos." });
    }

    const registroAtualizado = await prisma.registro.update({
      where: { id },
      data: {
        rgCondutor,
        dataMarcada: dataMarcadaDate,
        horaInicio: horaInicio ?? null,
        horaSaida,
        destino: destino ?? null,
        kmIda: kmIdaNum,
        kmVolta: kmVoltaNum,
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

// DELETE: Deletar registro por ID
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
