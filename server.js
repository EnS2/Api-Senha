/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

import publicRouter from "./routes/public.js";
import registroRouter from "./routes/registro.js";

dotenv.config();

const app = express();

// Segurança e parsing
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// Middleware de log simples (opcional)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Rota de status
app.get("/", (req, res) => {
  res.status(200).json({ message: "API funcionando 🚀" });
});

// ✅ Agora com prefixo /public
app.use("/public", publicRouter); // /public/login, /public/cadastro, /public/criar-admin
app.use("/registrar", registroRouter); // /registrar (CRUD de registros)

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

// Erro interno
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ message: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
