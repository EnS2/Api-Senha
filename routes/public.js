/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
import express from "express";
import bcrypt from "bcrypt";
import pkg from "@prisma/client";
import jwt from "jsonwebtoken";
import { ROLES } from "./role.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const publicRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "secrettokenfallback";

// 📌 Cadastro de usuário comum
publicRouter.post("/cadastro", async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashPassword,
        role: ROLES.USER,
      },
    });

    const { password: _, ...userSemSenha } = user;
    res.status(201).json(userSemSenha);
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// 🔐 Login (para USER e ADMIN)
publicRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha obrigatórios" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: _, ...userSemSenha } = user;

    res.status(200).json({
      message: "Login bem-sucedido",
      user: userSemSenha,
      token,
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// 👑 Criar administrador
publicRouter.post("/criar-admin", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: senhaHash,
        role: ROLES.ADMIN,
      },
    });

    const { password: _, ...adminSemSenha } = admin;
    res
      .status(201)
      .json({ message: "Admin criado com sucesso", admin: adminSemSenha });
  } catch (error) {
    console.error("Erro ao criar admin:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default publicRouter;
