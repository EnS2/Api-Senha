import express from "express";
import cors from "cors";
import publicRouter from "./routes/public.js";
import registroRouter from "./routes/registro.js";

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());

// ✅ Rotas
app.use("/registro", registroRouter);
app.use("/", publicRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// ✅ Tratamento de erro
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ message: "Erro interno do servidor" });
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
