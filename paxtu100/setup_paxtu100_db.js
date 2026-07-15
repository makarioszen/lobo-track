require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function setupDatabase() {
  console.log('Iniciando configuração das tabelas do Paxtu 100 no Neon DB...');
  try {
    // 1. Criar tabela de associados
    console.log('Criando tabela associados_paxtu100...');
    await sql`
      CREATE TABLE IF NOT EXISTS associados_paxtu100 (
        id_associado INTEGER PRIMARY KEY,
        registro VARCHAR(50) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        ramo VARCHAR(100),
        data_nascimento DATE,
        sexo VARCHAR(100),
        secao VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Criar tabela de progressões
    console.log('Criando tabela progressao_paxtu100...');
    await sql`
      CREATE TABLE IF NOT EXISTS progressao_paxtu100 (
        id SERIAL PRIMARY KEY,
        id_associado INTEGER REFERENCES associados_paxtu100(id_associado) ON DELETE CASCADE,
        milestone VARCHAR(100) NOT NULL,
        data_conclusao DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id_associado, milestone)
      );
    `;

    // 3. Criar tabela de atividades detalhadas
    console.log('Criando tabela atividades_paxtu100...');
    await sql`
      CREATE TABLE IF NOT EXISTS atividades_paxtu100 (
        id SERIAL PRIMARY KEY,
        id_associado INTEGER REFERENCES associados_paxtu100(id_associado) ON DELETE CASCADE,
        data_inicio DATE NOT NULL,
        data_fim DATE,
        ds_atividade TEXT NOT NULL,
        localidade TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id_associado, data_inicio, ds_atividade)
      );
    `;

    console.log('Configuração do banco de dados para Paxtu 100 concluída com sucesso!');
  } catch (err) {
    console.error('Erro ao configurar banco de dados:', err);
    process.exit(1);
  }
}

setupDatabase();
