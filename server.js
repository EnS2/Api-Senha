import express from "express";
import cors from "cors";
import publicRouter from "./routes/public.js";

const app = express();

app.use(cors()); // Permitir acesso do frontend
app.use(express.json()); // Permitir JSON no body
app.use("/", publicRouter); // Todas as rotas vêm de public.js

app.listen(4000, () => {
  console.log("Servidor rodando na porta 4000");
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


  MongoDB
  Login:enzopalomaro
  senha:tI9xMlZlggF47gaz
  mongodb+srv://enzopalomaro:tI9xMlZlggF47gaz@omegadrive-cadastro-use.mibvvyy.mongodb.net/?retryWrites=true&w=majority&appName=OmegaDrive-cadastro-users

*/
