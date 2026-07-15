const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function getAuthDetails() {
  console.log('Iniciando o Puppeteer para autenticação e coleta de cookies/token...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targetUrl = 'https://paxtu100.escoteiros.org.br/';
  console.log(`Navegando para: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Keycloak login
  console.log('Efetuando login no Keycloak...');
  await page.waitForSelector('#kc-form-login', { timeout: 15000 });
  await page.type('#username', process.env.paxtu100_user);
  await page.type('#password', process.env.paxtu100_pass);
  await page.click('#kc-login');

  console.log('Aguardando redirecionamento para o dashboard...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('Navegando para a lista de associados para extrair o CSRF Token...');
  await page.goto('https://paxtu100.escoteiros.org.br/associado/lista', { waitUntil: 'networkidle2' });

  const csrfToken = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : null;
  });

  const cookies = await page.cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  await browser.close();
  console.log('Autenticação concluída.');
  return { csrfToken, cookieString };
}

async function extractAlice() {
  try {
    const { csrfToken, cookieString } = await getAuthDetails();
    console.log(`CSRF Token: ${csrfToken}`);
    console.log(`Cookies: ${cookieString.substring(0, 100)}...`);

    const headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'cookie': cookieString,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'origin': 'https://paxtu100.escoteiros.org.br',
      'referer': 'https://paxtu100.escoteiros.org.br/associado/lista'
    };

    const aliceId = '1212968'; // Alice Calabró Portugal ID from parse_desktop_res19
    const payload = `associate_code=${aliceId}&_token=${csrfToken}`;

    console.log(`Fazendo requisição POST para o perfil do associado ${aliceId}...`);
    const res = await axios.post('https://paxtu100.escoteiros.org.br/associado/perfil', payload, { headers });

    console.log('Parseando HTML do perfil com Cheerio...');
    const $ = cheerio.load(res.data);

    // 1. Informações Básicas
    const nome = $('#associate-name').val();
    const registro = $('#associate-register-number').val();
    const nascimento = $('#birthdate').val();
    const sexo = $('#gender option[selected]').val() || $('#gender').val();
    const appointment = $('#Appointment').text().replace(/\s+/g, ' ').trim();

    console.log('\n=======================================');
    console.log('DADOS BÁSICOS DO ASSOCIADO (PAXTU 100)');
    console.log('=======================================');
    console.log(`ID Associado (Paxtu 100): ${aliceId}`);
    console.log(`Nome Completo: ${nome}`);
    console.log(`Registro: ${registro}`);
    console.log(`Data de Nascimento: ${nascimento}`);
    console.log(`Sexo: ${sexo}`);
    console.log(`Nomeação/Cargo: ${appointment}`);

    // 2. Progressão (Ramo Lobinho)
    console.log('\n=======================================');
    console.log('PROGRESSÃO DO RAMO LOBINHO');
    console.log('=======================================');
    
    // As progressões estão em cards com classe progression-card
    // data-branch="2" significa Ramo Lobinho
    $('.progression-card[data-branch="2"]').each((i, el) => {
      const milestone = $(el).find('p.h6.fw-bold').text().trim();
      const statusText = $(el).find('p.h6').last().text().trim();
      const badgeText = $(el).find('span.badge').text().trim();
      
      console.log(`- Milestone: ${milestone} | Status: ${statusText} | Badge: ${badgeText}`);
    });

    // 3. Histórico de Atividades
    console.log('\n=======================================');
    console.log('HISTÓRICO DE ATIVIDADES (VIDA ESCOTEIRA)');
    console.log('=======================================');
    
    const activities = [];
    $('.activity-item').each((i, el) => {
      const startDate = $(el).find('.start-date').text().trim();
      const endDate = $(el).find('.end-date').text().trim();
      const description = $(el).find('.activity-description').text().trim();
      const location = $(el).find('td').eq(3).text().trim();
      
      activities.push({ startDate, endDate, description, location });
    });

    console.log(`Total de Atividades no histórico: ${activities.length}`);
    activities.slice(0, 10).forEach((act, idx) => {
      console.log(`${idx + 1}. [${act.startDate} - ${act.endDate}] ${act.description} | Local: ${act.location}`);
    });

  } catch (err) {
    console.error('Erro na extração de teste do Paxtu 100:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Dados:', err.response.data);
    }
  }
}

extractAlice();
