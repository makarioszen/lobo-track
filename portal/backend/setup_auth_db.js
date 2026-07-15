require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function setupAuthDatabase() {
  console.log('Iniciando configuração do banco de dados de autenticação e progresso...');
  try {
    // 1. Criar tabela de usuários
    console.log('Criando tabela usuarios_sistema...');
    await sql`
      CREATE TABLE IF NOT EXISTS usuarios_sistema (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        cargo VARCHAR(50) NOT NULL DEFAULT 'chefe',
        secao_id INT NOT NULL DEFAULT 11009,
        secao_nome VARCHAR(255) NOT NULL DEFAULT 'Alcateia Waingunga',
        aprovado BOOLEAN NOT NULL DEFAULT FALSE,
        paxtu_legado_user VARCHAR(255),
        paxtu_legado_password_encrypted TEXT,
        paxtu100_user VARCHAR(255),
        paxtu100_password_encrypted TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Criar tabela de status de sincronização
    console.log('Criando tabela sync_status...');
    await sql`
      CREATE TABLE IF NOT EXISTS sync_status (
        email VARCHAR(255) PRIMARY KEY REFERENCES usuarios_sistema(email) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'idle',
        progress INTEGER NOT NULL DEFAULT 0,
        step VARCHAR(255),
        error TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Configurar RLS (Row Level Security) e Políticas de Segurança por Seção
    console.log('Habilitando RLS nas tabelas...');
    await sql`ALTER TABLE associados_legado ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE associados_legado FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE associados_paxtu100 ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE associados_paxtu100 FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE ajustes_chefia ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE ajustes_chefia FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE progressao_legado ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE progressao_legado FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE atividades_legado ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE atividades_legado FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE especialidades_legado ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE especialidades_legado FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE progressao_paxtu100 ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE progressao_paxtu100 FORCE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE atividades_paxtu100 ENABLE ROW LEVEL SECURITY;`;
    await sql`ALTER TABLE atividades_paxtu100 FORCE ROW LEVEL SECURITY;`;

    console.log('Criando políticas de RLS...');
    await sql`DROP POLICY IF EXISTS secao_policy ON associados_legado;`;
    await sql`
      CREATE POLICY secao_policy ON associados_legado
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR secao ILIKE current_setting('app.current_secao_nome', true)
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON associados_paxtu100;`;
    await sql`
      CREATE POLICY secao_policy ON associados_paxtu100
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR secao ILIKE current_setting('app.current_secao_nome', true)
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON ajustes_chefia;`;
    await sql`
      CREATE POLICY secao_policy ON ajustes_chefia
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR EXISTS (
          SELECT 1 FROM associados_paxtu100 WHERE associados_paxtu100.registro = ajustes_chefia.registro AND secao ILIKE current_setting('app.current_secao_nome', true)
          UNION
          SELECT 1 FROM associados_legado WHERE associados_legado.registro = ajustes_chefia.registro AND secao ILIKE current_setting('app.current_secao_nome', true)
        )
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON progressao_legado;`;
    await sql`
      CREATE POLICY secao_policy ON progressao_legado
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR EXISTS (
          SELECT 1 FROM associados_legado 
          WHERE associados_legado.id_associado = progressao_legado.id_associado 
            AND secao ILIKE current_setting('app.current_secao_nome', true)
        )
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON atividades_legado;`;
    await sql`
      CREATE POLICY secao_policy ON atividades_legado
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR EXISTS (
          SELECT 1 FROM associados_legado 
          WHERE associados_legado.id_associado = atividades_legado.id_associado 
            AND secao ILIKE current_setting('app.current_secao_nome', true)
        )
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON especialidades_legado;`;
    await sql`
      CREATE POLICY secao_policy ON especialidades_legado
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR EXISTS (
          SELECT 1 FROM associados_legado 
          WHERE associados_legado.id_associado = especialidades_legado.id_associado 
            AND secao ILIKE current_setting('app.current_secao_nome', true)
        )
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON progressao_paxtu100;`;
    await sql`
      CREATE POLICY secao_policy ON progressao_paxtu100
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR EXISTS (
          SELECT 1 FROM associados_paxtu100 
          WHERE associados_paxtu100.id_associado = progressao_paxtu100.id_associado 
            AND secao ILIKE current_setting('app.current_secao_nome', true)
        )
      );
    `;

    await sql`DROP POLICY IF EXISTS secao_policy ON atividades_paxtu100;`;
    await sql`
      CREATE POLICY secao_policy ON atividades_paxtu100
      USING (
        current_setting('app.current_secao_nome', true) IS NULL 
        OR current_setting('app.current_secao_nome', true) = '' 
        OR EXISTS (
          SELECT 1 FROM associados_paxtu100 
          WHERE associados_paxtu100.id_associado = atividades_paxtu100.id_associado 
            AND secao ILIKE current_setting('app.current_secao_nome', true)
        )
      );
    `;

    console.log('Configuração de autenticação, progresso e RLS concluída com sucesso!');
  } catch (err) {
    console.error('Erro ao configurar banco de dados de autenticação:', err);
    process.exit(1);
  }
}

setupAuthDatabase();
