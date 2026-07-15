require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function setupDatabase() {
  console.log('Iniciando configuração do banco de dados no Neon DB...');
  try {
    // 1. Criar tabela de associados
    console.log('Criando tabela associados_legado...');
    await sql`
      CREATE TABLE IF NOT EXISTS associados_legado (
        id_associado INTEGER PRIMARY KEY,
        registro VARCHAR(50) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        ramo VARCHAR(100),
        data_nascimento DATE,
        sexo VARCHAR(100),
        ativo BOOLEAN,
        grupo VARCHAR(50),
        secao VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Criar tabela de progressões (milestones)
    console.log('Criando tabela progressao_legado...');
    await sql`
      CREATE TABLE IF NOT EXISTS progressao_legado (
        id SERIAL PRIMARY KEY,
        id_associado INTEGER REFERENCES associados_legado(id_associado) ON DELETE CASCADE,
        milestone VARCHAR(100) NOT NULL,
        data_conclusao DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id_associado, milestone)
      );
    `;

    // 3. Criar tabela de especialidades
    console.log('Criando tabela especialidades_legado...');
    await sql`
      CREATE TABLE IF NOT EXISTS especialidades_legado (
        id SERIAL PRIMARY KEY,
        id_associado INTEGER REFERENCES associados_legado(id_associado) ON DELETE CASCADE,
        cd_especialidade VARCHAR(50) NOT NULL,
        ds_especialidade VARCHAR(255) NOT NULL,
        nivel INTEGER NOT NULL,
        data_conclusao DATE NOT NULL,
        itens_concluidos INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id_associado, cd_especialidade)
      );
    `;

    // 4. Criar tabela de atividades detalhadas
    console.log('Criando tabela atividades_legado...');
    await sql`
      CREATE TABLE IF NOT EXISTS atividades_legado (
        id SERIAL PRIMARY KEY,
        id_associado INTEGER REFERENCES associados_legado(id_associado) ON DELETE CASCADE,
        cd_ueb VARCHAR(50) NOT NULL,
        ds_atividade TEXT NOT NULL,
        data_conclusao DATE,
        check_escotista VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id_associado, cd_ueb)
      );
    `;

    console.log('Configuração do banco de dados concluída com sucesso!');
  } catch (err) {
    console.error('Erro ao configurar banco de dados:', err);
    process.exit(1);
  }
}

setupDatabase();
