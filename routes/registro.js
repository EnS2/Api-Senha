import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ObjectId } from "bson"; // 👈 Importação para lidar com ObjectId

const prisma = new PrismaClient();
const registroRouter = Router();

// ✅ Criar novo registro
registroRouter.post("/registrar", async (req, res) => {
  try {
    const {
      rgCondutor,
      dataMarcada,
      horaSaida,
      kmIda,
      kmVolta,
      observacao,
      veiculo,
      placa,
      userId,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "O campo userId é obrigatório." });
    }

    if (!ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ error: "userId inválido (formato errado)." });
    }

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

    const dataMarcadaDate = new Date(dataMarcada);
    if (isNaN(dataMarcadaDate.getTime())) {
      return res.status(400).json({ error: "dataMarcada inválida." });
    }

    const kmIdaNum = parseFloat(kmIda);
    const kmVoltaNum = parseFloat(kmVolta);

    if (isNaN(kmIdaNum) || isNaN(kmVoltaNum)) {
      return res
        .status(400)
        .json({ error: "kmIda ou kmVolta devem ser números válidos." });
    }

    const usuarioExiste = await prisma.user.findUnique({
      where: { id: new ObjectId(userId) },
    });

    if (!usuarioExiste) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    const novoRegistro = await prisma.registro.create({
      data: {
        rgCondutor,
        dataMarcada: dataMarcadaDate,
        horaSaida,
        kmIda: kmIdaNum,
        kmVolta: kmVoltaNum,
        observacao,
        veiculo,
        placa,
        userId: new ObjectId(userId),
      },
    });

    res.status(201).json(novoRegistro);
  } catch (error) {
    console.error("Erro ao criar registro:", error);
    res.status(500).json({
      error: error?.message || "Erro ao criar registro",
      detalhes: error,
    });
  }
});

// ✅ Listar todos os registros
registroRouter.get("/listar", async (req, res) => {
  try {
    const registros = await prisma.registro.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error("Erro ao listar registros:", error);
    res.status(500).json({ error: "Erro ao listar registros" });
  }
});

// ✅ Buscar registro por ID
registroRouter.get("/buscar/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const registro = await prisma.registro.findUnique({
      where: { id: new ObjectId(id) },
    });

    if (!registro) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    res.status(200).json(registro);
  } catch (error) {
    console.error("Erro ao buscar registro:", error);
    res.status(500).json({ error: "Erro ao buscar registro" });
  }
});

// ✅ Atualizar registro
registroRouter.put("/atualizar/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizados = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const registroAtualizado = await prisma.registro.update({
      where: { id: new ObjectId(id) },
      data: dadosAtualizados,
    });

    res.status(200).json(registroAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar registro:", error);
    res.status(500).json({ error: "Erro ao atualizar registro" });
  }
});

// ✅ Deletar registro
registroRouter.delete("/deletar/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    await prisma.registro.delete({
      where: { id: new ObjectId(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar registro:", error);
    res.status(500).json({ error: "Erro ao deletar registro" });
  }
});

export default registroRouter;
