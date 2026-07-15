const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

async function verify() {
  console.log('--- VERIFICAÇÃO DO BANCO DE DADOS NEON DB (PAXTU 100) ---');
  try {
    const totalAssociados = await sql`SELECT count(*) FROM associados_paxtu100`;
    const totalProgressao = await sql`SELECT count(*) FROM progressao_paxtu100`;
    const totalAtividades = await sql`SELECT count(*) FROM atividades_paxtu100`;

    console.log(`Total de Associados salvos: ${totalAssociados[0].count}`);
    console.log(`Total de Progressões salvas: ${totalProgressao[0].count}`);
    console.log(`Total de Atividades salvas: ${totalAtividades[0].count}`);

    // Exibir alguns lobinhos e suas progressões conquistadas no Paxtu 100
    console.log('\n--- Progressões de Lobinhos conquistadas no Paxtu 100: ---');
    const lobinhoProgressao = await sql`
      SELECT a.nome, p.milestone, p.data_conclusao
      FROM progressao_paxtu100 p
      JOIN associados_paxtu100 a ON p.id_associado = a.id_associado
      WHERE p.milestone IN ('PATA_TENRA', 'SALTADOR', 'RASTREADOR', 'CACADOR')
      ORDER BY a.nome, p.milestone;
    `;
    
    if (lobinhoProgressao.length === 0) {
      console.log('Nenhuma progressão de lobinho localizada.');
    } else {
      lobinhoProgressao.forEach(row => {
        console.log(`- ${row.nome}: ${row.milestone} em ${row.data_conclusao.toISOString().split('T')[0]}`);
      });
    }

  } catch (err) {
    console.error('Erro ao verificar DB:', err);
  }
}

verify();
