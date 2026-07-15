const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

async function verify() {
  console.log('--- VERIFICAÇÃO DO BANCO DE DADOS NEON DB ---');
  try {
    const totalAssociados = await sql`SELECT count(*) FROM associados_legado`;
    const totalProgressao = await sql`SELECT count(*) FROM progressao_legado`;
    const totalEspecialidades = await sql`SELECT count(*) FROM especialidades_legado`;
    const totalAtividades = await sql`SELECT count(*) FROM atividades_legado`;

    console.log(`Total de Associados salvos: ${totalAssociados[0].count}`);
    console.log(`Total de Progressões (Milestones/Cursos) salvas: ${totalProgressao[0].count}`);
    console.log(`Total de Especialidades salvas: ${totalEspecialidades[0].count}`);
    console.log(`Total de Atividades salvas: ${totalAtividades[0].count}`);

    // Exibir alguns escotistas/dirigentes e suas formações
    console.log('\n--- Formações de Escotistas/Dirigentes salvas: ---');
    const adultProgressao = await sql`
      SELECT a.nome, p.milestone, p.data_conclusao
      FROM progressao_legado p
      JOIN associados_legado a ON p.id_associado = a.id_associado
      WHERE p.milestone LIKE 'dt_%'
      ORDER BY a.nome, p.milestone;
    `;
    
    if (adultProgressao.length === 0) {
      console.log('Nenhuma formação de adulto localizada ainda.');
    } else {
      adultProgressao.forEach(row => {
        console.log(`- ${row.nome}: ${row.milestone} em ${row.data_conclusao.toISOString().split('T')[0]}`);
      });
    }

  } catch (err) {
    console.error('Erro ao verificar DB:', err);
  }
}

verify();
