const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

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


async function getAuthDetails() {
  console.log('[1/5] Iniciando o Puppeteer para autenticação no Paxtu 100...');
  await updateProgress('running', 5, 'Iniciando Puppeteer para Paxtu 100...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targetUrl = 'https://paxtu100.escoteiros.org.br/';
  console.log(`[1/5] Navegando para: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Keycloak login
  console.log('[1/5] Efetuando login no Keycloak...');
  await updateProgress('running', 10, 'Autenticando no Paxtu 100...');
  await page.waitForSelector('#kc-form-login', { timeout: 15000 });
  await page.type('#username', process.env.paxtu100_user);
  await page.type('#password', process.env.paxtu100_pass);
  await page.click('#kc-login');

  console.log('[1/5] Aguardando redirecionamento para o dashboard...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('[1/5] Navegando para a lista de associados para obter cookies e token...');
  await page.goto('https://paxtu100.escoteiros.org.br/associado/lista', { waitUntil: 'networkidle2' });

  const csrfToken = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : null;
  });

  const cookies = await page.cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  await browser.close();
  console.log('[1/5] Autenticação concluída e credenciais obtidas.');
  await updateProgress('running', 20, 'Autenticado no Paxtu 100 com sucesso.');
  return { csrfToken, cookieString };
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
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

const milestoneMap = {
  'Pata Tenra': 'PATA_TENRA',
  'Saltador': 'SALTADOR',
  'Rastreador': 'RASTREADOR',
  'Caçador': 'CACADOR',
  'Passagem Escoteiro': 'PASSAGEM_ESCOTEIRO',
  'Passagem Sênior': 'PASSAGEM_SENIOR',
  'Passagem Pioneiro': 'PASSAGEM_PIONEIRO'
};

async function saveToDatabase(data) {
  const { basic, progressions, activities } = data;
  const id = parseInt(basic.id, 10);
  const cleanRegistro = basic.registro.split('-')[0].trim();

  // 1. Salvar associado
  await sql`
    INSERT INTO associados_paxtu100 (id_associado, registro, nome, categoria, ramo, data_nascimento, sexo, secao)
    VALUES (${id}, ${cleanRegistro}, ${basic.nome}, ${basic.categoria || null}, ${basic.ramo || null}, ${basic.nascimento || null}, ${basic.sexo || null}, ${basic.secao || null})
    ON CONFLICT (id_associado) DO UPDATE SET
      registro = EXCLUDED.registro,
      nome = EXCLUDED.nome,
      categoria = EXCLUDED.categoria,
      ramo = EXCLUDED.ramo,
      data_nascimento = EXCLUDED.data_nascimento,
      sexo = EXCLUDED.sexo,
      secao = EXCLUDED.secao;
  `;

  // 2. Salvar progressões
  for (const prog of progressions) {
    const dbMilestone = milestoneMap[prog.milestone] || prog.milestone.toUpperCase().replace(/\s+/g, '_');
    const isoDate = parseDateToIso(prog.dateStr);
    if (isoDate) {
      await sql`
        INSERT INTO progressao_paxtu100 (id_associado, milestone, data_conclusao)
        VALUES (${id}, ${dbMilestone}, ${isoDate})
        ON CONFLICT (id_associado, milestone) DO UPDATE SET
          data_conclusao = EXCLUDED.data_conclusao;
      `;
    }
  }

  // 3. Salvar atividades
  for (const act of activities) {
    const startIso = parseDateToIso(act.startDate);
    const endIso = parseDateToIso(act.endDate) || startIso; // Default end to start if not available
    
    if (startIso) {
      await sql`
        INSERT INTO atividades_paxtu100 (id_associado, data_inicio, data_fim, ds_atividade, localidade)
        VALUES (${id}, ${startIso}, ${endIso}, ${act.description}, ${act.location || null})
        ON CONFLICT (id_associado, data_inicio, ds_atividade) DO UPDATE SET
          data_fim = EXCLUDED.data_fim,
          localidade = EXCLUDED.localidade;
      `;
    }
  }
}

async function run() {
  const startTime = Date.now();
  console.log('================================================');
  console.log('   INICIANDO EXTRATOR DE DADOS PAXTU 100       ');
  console.log('================================================');

  try {
    const sectionId = process.env.SYNC_SECAO_ID || '11009';
    const sectionNome = process.env.SYNC_SECAO_NOME || 'Alcateia Waingunga';

    const { csrfToken, cookieString } = await getAuthDetails();

    const headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'cookie': cookieString,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'origin': 'https://paxtu100.escoteiros.org.br',
      'referer': 'https://paxtu100.escoteiros.org.br/associado/lista'
    };

    console.log(`[2/5] Buscando lista de associados da seção ID ${sectionId} (${sectionNome})...`);
    await updateProgress('running', 25, `Buscando lista de associados da seção ${sectionNome}...`);
    const listHeaders = {
      ...headers,
      'x-requested-with': 'XMLHttpRequest',
      'accept': '*/*'
    };

    const associates = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`  [+] Buscando página ${page}...`);
      const listUrl = `https://paxtu100.escoteiros.org.br/associado/associado/lista/carregar?branch_id=Selecione&name=&registration=&category=Selecione&function=Selecione&section=${sectionId}&status=S&page=${page}`;
      const listRes = await axios.get(listUrl, { headers: listHeaders });

      const listHtml = listRes.data.html;
      if (!listHtml) {
        break;
      }

      const $list = cheerio.load(listHtml);
      const pageAssociatesCountBefore = associates.length;

      $list('.paxtu-table-row').each((i, el) => {
        const id = $list(el).attr('data-bs-associate');
        const name = $list(el).find('.paxtu-info h3').text().trim();
        const regText = $list(el).find('.paxtu-info p').text().trim();
        const regMatch = regText.match(/Registro:\s*(\d+)/i);
        const registration = regMatch ? regMatch[1] : '';

        if (id && name) {
          if (!associates.some(a => a.id === id)) {
            associates.push({ id, name, registration });
          }
        }
      });

      if (associates.length === pageAssociatesCountBefore) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`[2/5] Total de associados localizados: ${associates.length}`);
    await updateProgress('running', 35, `Encontrados ${associates.length} associados no Paxtu 100. Iniciando extração...`);
    associates.forEach((a, idx) => {
      console.log(`  ${idx + 1}. ID: ${a.id} | ${a.name} (Reg: ${a.registration})`);
    });

    console.log('[3/5] Iniciando extração dos perfis em lote (concorrência: 2)...');
    let processedCount = 0;

    await mapLimit(associates, 2, async (assoc) => {
      const assocId = assoc.id;
      console.log(`  [+] Extraindo perfil do associado ${assoc.name} (ID: ${assocId})...`);
      
      const currentProgress = 35 + Math.floor((processedCount / associates.length) * 60);
      await updateProgress('running', currentProgress, `Processando no Paxtu 100: ${assoc.name} (${processedCount + 1}/${associates.length})`);

      try {
        const payload = `associate_code=${assocId}&_token=${csrfToken}`;
        const res = await axios.post('https://paxtu100.escoteiros.org.br/associado/perfil', payload, { headers });
        
        const $ = cheerio.load(res.data);

        // 1. Dados Básicos
        const nome = $('#associate-name').val();
        const registro = $('#associate-register-number').val();
        const nascimento = $('#birthdate').val();
        const sexo = $('#gender option[selected]').val() || $('#gender').val();
        
        // Parse Appointment
        const appointmentText = $('#Appointment').text().replace(/\s+/g, ' ').trim();
        const isLobinho = appointmentText.toLowerCase().includes('lobinho');
        const isEscotista = appointmentText.toLowerCase().includes('escotista');
        
        const basic = {
          id: assocId,
          nome,
          registro,
          nascimento,
          sexo,
          categoria: isEscotista ? 'Escotista' : (isLobinho ? 'Lobinho' : 'Outro'),
          ramo: isLobinho ? 'Lobinho' : null,
          secao: sectionNome
        };

        // 2. Progressões
        const progressions = [];
        // Mapear progressões de Lobinho (Ramo 2) e Cursos de Adultos (Ramo 5)
        $('.progression-card').each((i, el) => {
          const milestone = $(el).find('p.h6.fw-bold').text().trim();
          const statusText = $(el).find('p.h6').last().text().trim();
          const badgeText = $(el).find('span.badge').text().trim();
          
          if (badgeText.includes('Conquistado') && statusText && statusText.includes('/')) {
            progressions.push({
              milestone,
              dateStr: statusText
            });
          }
        });

        // 3. Histórico de Atividades
        const activities = [];
        $('.activity-item').each((i, el) => {
          const startDate = $(el).find('.start-date').text().trim();
          const endDate = $(el).find('.end-date').text().trim();
          const description = $(el).find('.activity-description').text().trim();
          const location = $(el).find('td').eq(3).text().trim();
          
          if (startDate && startDate.includes('/')) {
            activities.push({ startDate, endDate, description, location });
          }
        });

        // 4. Salvar no Banco Neon
        await saveToDatabase({ basic, progressions, activities });
        processedCount++;
        console.log(`  [✓] Salvo no banco: ${basic.nome} (${progressions.length} progressões, ${activities.length} atividades)`);
        
        // Pequena pausa entre requisições
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`  [✗] Erro ao extrair associado ${assoc.name}:`, err.message);
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n================================================');
    console.log(`   MIGRAÇÃO PAXTU 100 CONCLUÍDA EM ${duration}s`);
    console.log(`   Associados Processados: ${processedCount}/${associates.length}`);
    console.log('================================================');
    await updateProgress('completed', 100, 'Sincronização do Paxtu 100 concluída com sucesso!');

  } catch (err) {
    console.error('Erro crítico no extrator Paxtu 100:', err.message);
    await updateProgress('failed', 100, 'Erro crítico no extrator Paxtu 100', err.message);
  }
}

run();
