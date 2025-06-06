/* eslint-disable @typescript-eslint/no-unused-vars */
import express from "express";
import bcrypt from "bcrypt";
import pkg from "@prisma/client";
import jwt from "jsonwebtoken";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const publicRouter = express.Router();

// Usar fallback caso .env não esteja carregado corretamente
// eslint-disable-next-line no-undef
const JWT_SECRET = process.env.JWT_SECRET || "secrettokenfallback";

// Cadastro
publicRouter.post("/cadastro", async (req, res) => {
  const user = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(user.password, salt);

    const userdb = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: hashPassword,
      },
    });

    // Retornar sem o campo password
    const { password, ...userSafe } = userdb;

    res.status(201).json(userSafe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro de Servidor, Tente Novamente" });
  }
});

// Login
publicRouter.post("/login", async (req, res) => {
  try {
    const userInfo = req.body;

    const user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const isMatch = await bcrypt.compare(userInfo.password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    // Gerar token JWT com id do user
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // Retornar user sem o campo password
    const { password, ...userSafe } = user;

    res.status(200).json({
      message: "Login bem-sucedido",
      user: userSafe,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro de Servidor, Tente Novamente" });
  }
});

export default publicRouter;
