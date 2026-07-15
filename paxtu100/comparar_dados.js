const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

async function runComparison() {
  console.log('================================================');
  console.log('  COMPARATIVO DE DADOS: PAXTU LEGADO VS PAXTU 100 ');
  console.log('================================================');

  try {
    // 1. Resumo Geral de Associados
    const resSummary = await sql`
      SELECT 
        l.nome,
        l.registro,
        (SELECT count(*) FROM progressao_legado pl WHERE pl.id_associado = l.id_associado) as prog_legado,
        (SELECT count(*) FROM progressao_paxtu100 pp WHERE pp.id_associado = p.id_associado) as prog_paxtu100,
        (SELECT count(*) FROM atividades_legado al WHERE al.id_associado = l.id_associado) as ativ_legado,
        (SELECT count(*) FROM atividades_paxtu100 ap WHERE ap.id_associado = p.id_associado) as ativ_paxtu100
      FROM associados_legado l
      JOIN associados_paxtu100 p ON l.registro = p.registro
      ORDER BY l.nome;
    `;

    console.log('\n--- RESUMO DE COMPATIBILIDADE ---');
    console.log('| Nome | Registro | Prog. Legado | Prog. P100 | Ativ. Legado | Ativ. P100 |');
    console.log('| :--- | :--- | :---: | :---: | :---: | :---: |');
    resSummary.forEach(row => {
      console.log(`| ${row.nome} | ${row.registro} | ${row.prog_legado} | ${row.prog_paxtu100} | ${row.ativ_legado} | ${row.ativ_paxtu100} |`);
    });

    // 2. Detalhar divergências de data de progressão (Milestones)
    const progDivergences = await sql`
      SELECT 
        a.nome,
        pl.milestone,
        pl.data_conclusao as data_legado,
        pp.data_conclusao as data_paxtu100
      FROM progressao_legado pl
      JOIN associados_legado al ON pl.id_associado = al.id_associado
      JOIN associados_paxtu100 p ON al.registro = p.registro
      JOIN progressao_paxtu100 pp ON p.id_associado = pp.id_associado AND pl.milestone = pp.milestone
      JOIN associados_paxtu100 a ON p.id_associado = a.id_associado
      WHERE pl.data_conclusao <> pp.data_conclusao;
    `;

    console.log('\n--- DIVERGÊNCIAS DE DATA NAS PROGRESSÕES ---');
    if (progDivergences.length === 0) {
      console.log('✓ Nenhuma divergência de data encontrada nas progressões.');
    } else {
      console.log('| Nome | Milestone | Data Legado | Data Paxtu 100 |');
      console.log('| :--- | :--- | :---: | :---: |');
      progDivergences.forEach(row => {
        const dLegado = row.data_legado.toISOString().split('T')[0];
        const dP100 = row.data_paxtu100.toISOString().split('T')[0];
        console.log(`| ${row.nome} | ${row.milestone} | ${dLegado} | ${dP100} |`);
      });
    }

  } catch (err) {
    console.error('Erro ao rodar comparação:', err);
  }
}

runComparison();
