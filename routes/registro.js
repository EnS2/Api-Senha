import express from "express";
import { PrismaClient } from "@prisma/client";
import { ObjectId } from "bson";

const prisma = new PrismaClient();
const registroRouter = express.Router();

registroRouter.post("/registrar", async (req, res) => {
  try {
    const {
      id,
      rgCondutor,
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
    } = req.body;

    const userId = "682b46002186204a3a8e150c";

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "userId inválido." });
    }

    if (
      !id ||
      !rgCondutor ||
      !dataMarcada ||
      !horaSaida ||
      kmIda === undefined ||
      kmVolta === undefined ||
      !veiculo ||
      !placa
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
        id,
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

registroRouter.get("/registrar", async (req, res) => {
  try {
    const registros = await prisma.registro.findMany({
      orderBy: { dataMarcada: "desc" },
    });
    return res.status(200).json(registros);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    return res
      .status(500)
      .json({ error: error.message || "Erro interno no servidor." });
  }
});

export default registroRouter;
