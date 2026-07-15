const puppeteer = require('puppeteer');
const axios = require('axios');
const ExcelJS = require('exceljs');
const path = require('path');
const { parseGwtRpc } = require('./parser');
const { neon } = require('@neondatabase/serverless');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const targetUrl = process.env.paxtu_old_url || 'https://paxtu.escoteiros.org.br/paxtu/';

if (!process.env.DATABASE_URL) {
  console.error('Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function updateProgress(status, progress, step, error = null) {
  if (process.env.SYNC_USER_EMAIL) {
    try {
      await sql`
        INSERT INTO sync_status (email, status, progress, step, error, updated_at)
        VALUES (${process.env.SYNC_USER_EMAIL}, ${status}, ${progress}, ${step}, ${error}, NOW())
        ON CONFLICT (email) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          step = EXCLUDED.step,
          error = EXCLUDED.error,
          updated_at = EXCLUDED.updated_at;
      `;
    } catch (e) {
      console.error('Erro ao atualizar progresso no banco:', e.message);
    }
  }
}


async function getSessionCookies() {
  console.log('[1/5] Iniciando o Puppeteer para obter os cookies de sessão...');
  await updateProgress('running', 5, 'Iniciando Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log(`[1/5] Navegando para: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  const user = process.env.paxtu_old_user;
  const pass = process.env.paxtu_old_pass;

  console.log('[1/5] Preenchendo login...');
  await updateProgress('running', 10, 'Autenticando no Paxtu Legado...');
  await page.waitForSelector('input[name="dsLogin"]', { timeout: 15000 });
  await page.type('input[name="dsLogin"]', user, { delay: 50 });
  await page.type('input[name="dsSenha"]', pass, { delay: 50 });

  console.log('[1/5] Clicando no botão de login...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Login' || b.className.includes('x-btn-text'));
    if (btn) btn.click();
  });

  console.log('[1/5] Aguardando painel principal...');
  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log('[1/5] Obtendo cookies da sessão...');
  const cookies = await page.cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  await browser.close();
  console.log('[1/5] Puppeteer finalizado e cookies capturados.');
  await updateProgress('running', 20, 'Sessão autenticada com sucesso.');
  return cookieString;
}

// Concurrency helper
async function mapLimit(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
function parseDateToIso(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    // Simple validation
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

async function saveToDatabase(assoc) {
  const id = parseInt(assoc.id, 10);
  const dataNascIso = parseDateToIso(assoc.dataNascimento);
  const ativoBool = assoc.ativo === 'S';

  // 1. Salvar associado
  await sql`
    INSERT INTO associados_legado (id_associado, registro, nome, categoria, ramo, data_nascimento, sexo, ativo, grupo, secao)
    VALUES (${id}, ${assoc.registro}, ${assoc.nome}, ${assoc.categoria || null}, ${assoc.ramo || null}, ${dataNascIso}, ${assoc.sexo || null}, ${ativoBool}, ${assoc.grupo || null}, ${assoc.secao || null})
    ON CONFLICT (id_associado) DO UPDATE SET
      registro = EXCLUDED.registro,
      nome = EXCLUDED.nome,
      categoria = EXCLUDED.categoria,
      ramo = EXCLUDED.ramo,
      data_nascimento = EXCLUDED.data_nascimento,
      sexo = EXCLUDED.sexo,
      ativo = EXCLUDED.ativo,
      grupo = EXCLUDED.grupo,
      secao = EXCLUDED.secao;
  `;

  // 2. Salvar progressões (milestones)
  const milestones = {
    'INVESTIDURA': assoc.investidura,
    'PROMESSA_ESCOTEIRA_LOBINHO': assoc.promessaLobinho,
    'PATA_TENRA': assoc.pataTenra,
    'SALTADOR': assoc.saltador,
    'RASTREADOR': assoc.rastreador,
    'CACADOR': assoc.cacador,
    'CRUZEIRO_SUL': assoc.cruzeiroDoSul,
    
    // Adult leader training milestones
    'dt_escotista_preliminar_curso': assoc.dt_escotista_preliminar_curso,
    'dt_escotista_preliminar_nivel': assoc.dt_escotista_preliminar_nivel,
    'dt_escotista_basico_curso': assoc.dt_escotista_basico_curso,
    'dt_escotista_basico_nivel': assoc.dt_escotista_basico_nivel,
    'dt_escotista_avancado_curso': assoc.dt_escotista_avancado_curso,
    'dt_escotista_avancado_nivel': assoc.dt_escotista_avancado_nivel,
    'dt_dirigente_preliminar_curso': assoc.dt_dirigente_preliminar_curso,
    'dt_dirigente_preliminar_nivel': assoc.dt_dirigente_preliminar_nivel,
    'dt_dirigente_basico_curso': assoc.dt_dirigente_basico_curso,
    'dt_dirigente_basico_nivel': assoc.dt_dirigente_basico_nivel,
    'dt_dirigente_avancado_curso': assoc.dt_dirigente_avancado_curso,
    'dt_dirigente_avancado_nivel': assoc.dt_dirigente_avancado_nivel,
    'dt_formador_cf1_curso': assoc.dt_formador_cf1_curso,
    'dt_formador_cf2_curso': assoc.dt_formador_cf2_curso,
    'dt_formador_cngpe1_curso': assoc.dt_formador_cngpe1_curso,
    'dt_formador_cngpe2_curso': assoc.dt_formador_cngpe2_curso,
    'dt_formador_cngi1_curso': assoc.dt_formador_cngi1_curso,
    'dt_formador_cngi2_curso': assoc.dt_formador_cngi2_curso
  };

  for (const [milestone, dateStr] of Object.entries(milestones)) {
    const milestoneDateIso = parseDateToIso(dateStr);
    if (milestoneDateIso) {
      await sql`
        INSERT INTO progressao_legado (id_associado, milestone, data_conclusao)
        VALUES (${id}, ${milestone}, ${milestoneDateIso})
        ON CONFLICT (id_associado, milestone) DO UPDATE SET
          data_conclusao = EXCLUDED.data_conclusao;
      `;
    }
  }

  // 3. Salvar especialidades
  for (const spec of assoc.especialidades) {
    const specDateIso = parseDateToIso(spec.dt_nivel);
    const nivelInt = parseInt(spec.nr_nivel, 10) || 1;
    const itensInt = parseInt(spec.itens, 10) || null;

    if (specDateIso) {
      await sql`
        INSERT INTO especialidades_legado (id_associado, cd_especialidade, ds_especialidade, nivel, data_conclusao, itens_concluidos)
        VALUES (${id}, ${spec.cd_especialidade}, ${spec.ds_especialidade}, ${nivelInt}, ${specDateIso}, ${itensInt})
        ON CONFLICT (id_associado, cd_especialidade) DO UPDATE SET
          ds_especialidade = EXCLUDED.ds_especialidade,
          nivel = EXCLUDED.nivel,
          data_conclusao = EXCLUDED.data_conclusao,
          itens_concluidos = EXCLUDED.itens_concluidos;
      `;
    }
  }

  // 4. Salvar atividades
  const confirmadas = assoc.atividades.filter(a => a.dtAtividade && a.checkEscotista === 'confirmadoEscotista');
  for (const ativ of confirmadas) {
    const ativDateIso = parseDateToIso(ativ.dtAtividade);
    await sql`
      INSERT INTO atividades_legado (id_associado, cd_ueb, ds_atividade, data_conclusao, check_escotista)
      VALUES (${id}, ${ativ.cdUeb}, ${ativ.dsAtividade}, ${ativDateIso}, ${ativ.checkEscotista})
      ON CONFLICT (id_associado, cd_ueb) DO UPDATE SET
        ds_atividade = EXCLUDED.ds_atividade,
        data_conclusao = EXCLUDED.data_conclusao,
        check_escotista = EXCLUDED.check_escotista;
    `;
  }
}

async function runExtractor() {
  const startTime = Date.now();
  console.log('================================================');
  console.log('   INICIANDO EXTRATOR DE DADOS PAXTU LEGADO     ');
  console.log('================================================');

  try {
    const cookies = await getSessionCookies();

    const headers = {
      'content-type': 'text/x-gwt-rpc; charset=UTF-8',
      'x-gwt-permutation': 'E0CAF052CC10CF07C17AA5F96BCD3E44',
      'x-gwt-module-base': 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/',
      'referer': 'https://paxtu.escoteiros.org.br/paxtu/main.do',
      'cookie': cookies,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    console.log('\n[2/5] Buscando lista de associados...');
    await updateProgress('running', 25, 'Buscando lista de associados...');
    const listUrl = 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.EntryPointPrincipal/rpc/associadoservice';
    const listPayload = '7|0|9|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|FF5CB9852330EB11461971E09407D0D9|br.com.wallis.sgg.client.rpc.AssociadoService|pesquisaAssociadosMinMax|br.com.wallis.sgg.shared.beans.associado.PesquisaAssociadosMinMaxParameter/1272958102||S|java.lang.Boolean/476441737|java.lang.Integer/3438268394|1|2|3|4|1|5|5|0|6|6|6|-1|0|-1|6|-1|6|6|6|6|0|-1|0|6|0|0|0|0|0|0|0|7|6|8|0|6|20|0|6|6|-1|9|0|';

    const listRes = await axios.post(listUrl, listPayload, { headers });
    const associatesList = parseGwtRpc(listRes.data);

    if (!associatesList || !associatesList.data || associatesList.data.length === 0) {
      console.log('Nenhum associado encontrado.');
      await updateProgress('completed', 100, 'Nenhum associado encontrado.');
      return;
    }

    const totalAssociados = associatesList.data.length;
    console.log(`[2/5] Total de associados encontrados: ${totalAssociados}`);
    await updateProgress('running', 30, `Encontrados ${totalAssociados} associados. Iniciando extração...`);

    console.log('\n[3/5] Extraindo detalhes, especialidades e progressões para cada associado...');
    
    let processed = 0;
    const detailsList = [];

    // Extrair dados com concorrência limitada para evitar instabilidade/bloqueio
    await mapLimit(associatesList.data, 2, async (associado) => {
      const idx = ++processed;
      const id = associado.cd_associado;
      const nome = associado.nm_associado;
      console.log(`   [${idx}/${totalAssociados}] Processando: ${nome} (ID: ${id})`);
      
      const currentProgress = 30 + Math.floor((idx / totalAssociados) * 60);
      await updateProgress('running', currentProgress, `Processando: ${nome} (${idx}/${totalAssociados})`);

      try {
        // 1. Obter Detalhes do Associado (Progressões básicas)
        const detailsPayload = `7|0|8|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|FF5CB9852330EB11461971E09407D0D9|br.com.wallis.sgg.client.rpc.AssociadoService|getAssociado|java.lang.String/2004016611|Z|${id}|114049121784077528231|1|2|3|4|3|5|6|5|7|1|8|`;
        const detailsRes = await axios.post(listUrl, detailsPayload, { headers });
        const details = parseGwtRpc(detailsRes.data) || {};

        // 2. Obter Especialidades
        const specUrl = 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.EntryPointPrincipal/rpc/especialidadeitemassociadoservice';
        const specHeaders = {
          ...headers,
          'x-gwt-permutation': '2A60FE1D79751ABBA940A75E669C617F'
        };
        const specPayload = `7|0|7|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|2A60FE1D79751ABBA940A75E669C617F|br.com.wallis.sgg.client.rpc.EspecialidadeItemAssociadoService|getEspecialidadesAssociado|I|java.lang.String/2004016611|114049091784077357204|1|2|3|4|2|5|6|${id}|7|`;
        const specRes = await axios.post(specUrl, specPayload, { headers: specHeaders });
        const specs = parseGwtRpc(specRes.data) || { data: [] };

        // 3. Obter Atividades do Ramo Lobinho
        const progUrl = 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.EntryPointPrincipal/rpc/progressaoservice';
        const progPayload = `7|0|6|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|7B80C4FAD4E58D53CB6773CC004DD479|br.com.wallis.sgg.client.rpc.ProgressaoService|getCaminhos|S|java.lang.Integer/3438268394|1|2|3|4|2|5|6|2|6|${id}|`;
        const progRes = await axios.post(progUrl, progPayload, { headers });
        const prog = parseGwtRpc(progRes.data) || { atividades: [] };

        const assocObj = {
          id,
          nome,
          registro: associado.nr_registro,
          categoria: details.dsCategoria || associado.dsCategoria || null,
          ramo: details.dsRamo || associado.dsRamo || null,
          dataNascimento: details.dt_nascimento || null,
          sexo: details.ds_sexo || null,
          ativo: details.fl_ativo || null,
          grupo: details.nr_grupo || null,
          secao: details.nmSecao || null,
          pataTenra: details.PATA_TENRA || '',
          saltador: details.SALTADOR || '',
          rastreador: details.RASTREADOR || '',
          cacador: details.CACADOR || '',
          investidura: details.INVESTIDURA || '',
          promessaLobinho: details.PROMESSA_ESCOTEIRA_LOBINHO || '',
          cruzeiroDoSul: details.CRUZEIRO_SUL || '',
          especialidades: specs.data || [],
          atividades: prog.atividades || [],
          
          // Adult leader training milestones
          dt_escotista_preliminar_curso: details.dt_escotista_preliminar_curso || '',
          dt_escotista_preliminar_nivel: details.dt_escotista_preliminar_nivel || '',
          dt_escotista_basico_curso: details.dt_escotista_basico_curso || '',
          dt_escotista_basico_nivel: details.dt_escotista_basico_nivel || '',
          dt_escotista_avancado_curso: details.dt_escotista_avancado_curso || '',
          dt_escotista_avancado_nivel: details.dt_escotista_avancado_nivel || '',
          dt_dirigente_preliminar_curso: details.dt_dirigente_preliminar_curso || '',
          dt_dirigente_preliminar_nivel: details.dt_dirigente_preliminar_nivel || '',
          dt_dirigente_basico_curso: details.dt_dirigente_basico_curso || '',
          dt_dirigente_basico_nivel: details.dt_dirigente_basico_nivel || '',
          dt_dirigente_avancado_curso: details.dt_dirigente_avancado_curso || '',
          dt_dirigente_avancado_nivel: details.dt_dirigente_avancado_nivel || '',
          dt_formador_cf1_curso: details.dt_formador_cf1_curso || '',
          dt_formador_cf2_curso: details.dt_formador_cf2_curso || '',
          dt_formador_cngpe1_curso: details.dt_formador_cngpe1_curso || '',
          dt_formador_cngpe2_curso: details.dt_formador_cngpe2_curso || '',
          dt_formador_cngi1_curso: details.dt_formador_cngi1_curso || '',
          dt_formador_cngi2_curso: details.dt_formador_cngi2_curso || ''
        };

        detailsList.push(assocObj);

        // Salvar imediatamente no banco de dados Neon DB
        console.log(`      -> Salvando ${nome} no Neon DB...`);
        await saveToDatabase(assocObj);

        // Adicionar um delay suave de 500ms entre as requisições de associados
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`   [ERRO] Falha ao extrair/salvar dados de ${nome}: ${err.message}`);
      }
    });

    console.log('\n[4/5] Gerando arquivo Excel (.xlsx) local de backup...');
    await updateProgress('running', 95, 'Gerando relatório Excel de backup...');
    
    const workbook = new ExcelJS.Workbook();
    
    // Aba 1: Resumo
    const sheetResumo = workbook.addWorksheet('Resumo Associados');
    sheetResumo.columns = [
      { header: 'Registro', key: 'registro', width: 15 },
      { header: 'Nome do Associado', key: 'nome', width: 35 },
      { header: 'Investidura', key: 'investidura', width: 15 },
      { header: 'Promessa Lobinho', key: 'promessaLobinho', width: 18 },
      { header: 'Pata Tenra', key: 'pataTenra', width: 15 },
      { header: 'Saltador', key: 'saltador', width: 15 },
      { header: 'Rastreador', key: 'rastreador', width: 15 },
      { header: 'Caçador', key: 'cacador', width: 15 },
      { header: 'Cruzeiro do Sul', key: 'cruzeiroDoSul', width: 18 },
      { header: 'Qtd Especialidades', key: 'qtdSpecs', width: 20 },
      { header: 'Atividades Lobinho Concluídas', key: 'qtdAtividades', width: 28 }
    ];

    sheetResumo.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetResumo.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF008080' }
    };

    // Aba 2: Detalhes das Atividades
    const sheetAtividades = workbook.addWorksheet('Atividades Lobinho');
    sheetAtividades.columns = [
      { header: 'Registro', key: 'registro', width: 15 },
      { header: 'Nome do Associado', key: 'nome', width: 35 },
      { header: 'Código Atividade', key: 'cdUeb', width: 15 },
      { header: 'Descrição da Atividade', key: 'dsAtividade', width: 70 },
      { header: 'Data Conclusão', key: 'dtAtividade', width: 15 }
    ];

    sheetAtividades.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetAtividades.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E8B57' }
    };

    // Aba 3: Especialidades
    const sheetSpecs = workbook.addWorksheet('Especialidades');
    sheetSpecs.columns = [
      { header: 'Registro', key: 'registro', width: 15 },
      { header: 'Nome do Associado', key: 'nome', width: 35 },
      { header: 'Especialidade', key: 'ds_especialidade', width: 30 },
      { header: 'Nível', key: 'nr_nivel', width: 10 },
      { header: 'Data Conclusão', key: 'dt_nivel', width: 15 }
    ];

    sheetSpecs.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetSpecs.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4682B4' }
    };

    // Alimentar as planilhas
    detailsList.forEach(assoc => {
      const realizadas = assoc.atividades.filter(a => a.dtAtividade && a.checkEscotista === 'confirmadoEscotista');
      sheetResumo.addRow({
        registro: assoc.registro,
        nome: assoc.nome,
        investidura: assoc.investidura,
        promessaLobinho: assoc.promessaLobinho,
        pataTenra: assoc.pataTenra,
        saltador: assoc.saltador,
        rastreador: assoc.rastreador,
        cacador: assoc.cacador,
        cruzeiroDoSul: assoc.cruzeiroDoSul,
        qtdSpecs: assoc.especialidades.length,
        qtdAtividades: realizadas.length
      });

      realizadas.forEach(ativ => {
        sheetAtividades.addRow({
          registro: assoc.registro,
          nome: assoc.nome,
          cdUeb: ativ.cdUeb,
          dsAtividade: ativ.dsAtividade,
          dtAtividade: ativ.dtAtividade
        });
      });

      assoc.especialidades.forEach(spec => {
        sheetSpecs.addRow({
          registro: assoc.registro,
          nome: assoc.nome,
          ds_especialidade: spec.ds_especialidade,
          nr_nivel: spec.nr_nivel,
          dt_nivel: spec.dt_nivel
        });
      });
    });

    const outputPath = path.join(__dirname, 'relatorio_paxtu_legado.xlsx');
    await workbook.xlsx.writeFile(outputPath);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('================================================');
    console.log(`[5/5] PROCESSO CONCLUÍDO COM SUCESSO EM ${duration}s!`);
    console.log(`   Dados salvos no Neon DB com sucesso.`);
    console.log(`   Planilha de backup salva em: ${outputPath}`);
    console.log('================================================');
    await updateProgress('completed', 100, 'Sincronização do Paxtu Legado concluída com sucesso!');

  } catch (err) {
    console.error('Erro crítico no processo do extrator:', err.message);
    await updateProgress('failed', 100, 'Erro crítico no processo do extrator legado', err.message);
  }
}

runExtractor();
