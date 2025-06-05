import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import publicRouter from "./routes/public.js";
import registroRouter from "./routes/registro.js";

dotenv.config(); // Carrega variáveis de ambiente do .env

const app = express();

// Middlewares globais
app.use(cors({ origin: "*" })); // pode ser ajustado para origens específicas
app.use(express.json());

// Rotas da aplicação
app.use("/registro", registroRouter);
app.use("/", publicRouter);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

// Middleware global de tratamento de erros
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ message: "Erro interno do servidor." });
});

// Porta e inicialização
// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
