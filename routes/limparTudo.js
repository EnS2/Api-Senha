// limparTudo.js

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config(); // Carrega o DATABASE_URL do arquivo .env

// eslint-disable-next-line no-undef
const uri = process.env.DATABASE_URL;

async function limparCamposIndesejados() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(); // Usa o nome do banco da URI
    const colecao = db.collection("Anotacao");

    // Remove o campo 'dados' de todos os documentos da coleção Anotacao
    const resultado = await colecao.updateMany({}, { $unset: { dados: "" } });

    console.log(`Campos removidos em ${resultado.modifiedCount} documentos.`);
  } catch (erro) {
    console.error("Erro ao limpar campos:", erro);
  } finally {
    await client.close();
  }
}

limparCamposIndesejados();
