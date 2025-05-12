import express from "express";
import publicRoutes from "./routes/public.js";

const app = express();
app.use(express.json());

app.use("/users", publicRoutes); // /users/cadastro

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
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
