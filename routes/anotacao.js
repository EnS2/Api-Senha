import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const anotacaoRouter = express.Router();

anotacaoRouter.post("/", async (req, res) => {
  try {
    const { data, texto } = req.body;

    if (!data || !texto) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }

    const novaAnotacao = await prisma.anotacao.create({
      data: {
        data: new Date(data),
        texto,
      },
    });

    res.status(201).json(novaAnotacao);
  } catch (error) {
    console.error("Erro ao criar anotação:", error);
    res.status(500).json({ message: "Erro interno ao criar anotação" });
  }
});

anotacaoRouter.get("/", async (req, res) => {
  try {
    const anotacoes = await prisma.anotacao.findMany({
      orderBy: { data: "desc" },
    });
    res.status(200).json(anotacoes);
  } catch (error) {
    console.error("Erro ao listar anotações:", error);
    res.status(500).json({ message: "Erro interno ao listar anotações" });
  }
});

export default anotacaoRouter;
