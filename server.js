import express from "express";
import cors from "cors";
import publicRouter from "./routes/public.js";
import registroRouter from "./routes/registro.js";

const app = express();

// ✅ Middlewares globais
app.use(cors());
app.use(express.json());

// ✅ Rotas principais
app.use("/registro", registroRouter); // ex: POST /registro/registrar
app.use("/", publicRouter); // outras rotas públicas

// ✅ Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// ✅ Tratamento de erro geral
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ message: "Erro interno do servidor" });
});

// ✅ Inicializa o servidor
// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

/*
  1) tipo de rota /Metodo HTTP
  2) Endereço

  www.OmegaDrive.com/cadastro


  Cria nossa API de usuarios 
  
  -Criar um usuarios
  -Listar todos os usuarios
  -Editar um usuarios
  -Deletar um usuario
  -Criptografar Senha 
  -Chegar codigo no email


  MongoDB
  Login:enzopalomaro
  senha:tI9xMlZlggF47gaz
  mongodb+srv://enzopalomaro:tI9xMlZlggF47gaz@omegadrive-cadastro-use.mibvvyy.mongodb.net/?retryWrites=true&w=majority&appName=OmegaDrive-cadastro-users

*/
