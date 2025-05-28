import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ObjectId } from "bson";

const prisma = new PrismaClient();
const registroRouter = Router();

registroRouter.post("/registrar", async (req, res) => {
  try {
    const {
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

    // ID fixo do usuário que está criando o registro (string)
    const userId = "682b46002186204a3a8e150c";

    // Validar userId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "userId inválido." });
    }

    // Validar campos obrigatórios
    if (
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

    // Validar e converter data
    const dataMarcadaDate = new Date(dataMarcada);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    // Validar números
    const kmIdaNum = parseFloat(kmIda);
    const kmVoltaNum = parseFloat(kmVolta);
    if (isNaN(kmIdaNum) || isNaN(kmVoltaNum)) {
      return res
        .status(400)
        .json({ error: "kmIda ou kmVolta devem ser números válidos." });
    }

    // Converter userId para ObjectId para uso com Prisma/MongoDB
    const userObjectId = new ObjectId(userId);

    // Verificar se usuário existe no DB
    const usuarioExiste = await prisma.user.findUnique({
      where: { id: userObjectId },
    });
    if (!usuarioExiste) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    // Criar registro
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
      .json({ error: error.message || "Erro ao criar registro" });
  }
});

export default registroRouter;
