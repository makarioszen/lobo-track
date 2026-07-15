const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');
const { parseGwtRpc } = require('./parser');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const targetUrl = process.env.paxtu_old_url || 'https://paxtu.escoteiros.org.br/paxtu/';

async function getSessionCookies() {
  console.log('Iniciando o Puppeteer para obter os cookies de sessão...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log(`Navegando para: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  const user = process.env.paxtu_old_user;
  const pass = process.env.paxtu_old_pass;

  console.log('Preenchendo login...');
  await page.waitForSelector('input[name="dsLogin"]', { timeout: 15000 });
  await page.type('input[name="dsLogin"]', user, { delay: 50 });
  await page.type('input[name="dsSenha"]', pass, { delay: 50 });

  console.log('Clicando no botão de login...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Login' || b.className.includes('x-btn-text'));
    if (btn) btn.click();
  });

  console.log('Aguardando painel principal...');
  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log('Obtendo cookies da sessão...');
  const cookies = await page.cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  await browser.close();
  console.log('Puppeteer finalizado com sucesso.');
  return cookieString;
}

async function testExtraction() {
  try {
    const cookies = await getSessionCookies();
    console.log(`Cookie de sessão obtido: ${cookies}`);

    // Configuração dos headers HTTP para chamadas GWT RPC
    const headers = {
      'content-type': 'text/x-gwt-rpc; charset=UTF-8',
      'x-gwt-permutation': 'E0CAF052CC10CF07C17AA5F96BCD3E44',
      'x-gwt-module-base': 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/',
      'referer': 'https://paxtu.escoteiros.org.br/paxtu/main.do',
      'cookie': cookies,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    console.log('\n--- Passo 1: Listar Associados (rpc/associadoservice) ---');
    const listUrl = 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.EntryPointPrincipal/rpc/associadoservice';
    // Payload capturado para pesquisaAssociadosMinMax
    const listPayload = '7|0|9|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|FF5CB9852330EB11461971E09407D0D9|br.com.wallis.sgg.client.rpc.AssociadoService|pesquisaAssociadosMinMax|br.com.wallis.sgg.shared.beans.associado.PesquisaAssociadosMinMaxParameter/1272958102||S|java.lang.Boolean/476441737|java.lang.Integer/3438268394|1|2|3|4|1|5|5|0|6|6|6|-1|0|-1|6|-1|6|6|6|6|0|-1|0|6|0|0|0|0|0|0|0|7|6|8|0|6|20|0|6|6|-1|9|0|';

    const listRes = await axios.post(listUrl, listPayload, { headers });
    const associatesList = parseGwtRpc(listRes.data);

    console.log(`Total de Associados: ${associatesList.totalCount}`);
    
    // Encontrar "ALICE CALABRÓ PORTUGAL"
    const alice = associatesList.data.find(a => a.nm_associado.includes('ALICE CALABRÓ PORTUGAL'));
    if (!alice) {
      console.log('Alice não encontrada na listagem.');
      return;
    }
    const aliceId = alice.cd_associado;
    console.log(`Alice encontrada! ID: ${aliceId}, Registro: ${alice.nr_registro}`);

    console.log('\n--- Passo 2: Obter Detalhes do Associado (getAssociado) ---');
    // Payload para getAssociado
    // Substituindo o ID de associado de teste de forma dinâmica no payload
    const detailsPayload = `7|0|8|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|FF5CB9852330EB11461971E09407D0D9|br.com.wallis.sgg.client.rpc.AssociadoService|getAssociado|java.lang.String/2004016611|Z|${aliceId}|114049121784077528231|1|2|3|4|3|5|6|5|7|1|8|`;
    const detailsRes = await axios.post(listUrl, detailsPayload, { headers });
    const aliceDetails = parseGwtRpc(detailsRes.data);

    console.log('Detalhes Básicos e Progressões extraídos:');
    console.log(JSON.stringify(aliceDetails, null, 2));

    console.log('\n--- Passo 3: Obter Especialidades do Associado ---');
    const specUrl = 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.EntryPointPrincipal/rpc/especialidadeitemassociadoservice';
    
    // Note: especialidadeitemassociadoservice usa uma permutação x-gwt-permutation diferente!
    const specHeaders = {
      ...headers,
      'x-gwt-permutation': '2A60FE1D79751ABBA940A75E669C617F'
    };
    
    const specPayload = `7|0|7|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|2A60FE1D79751ABBA940A75E669C617F|br.com.wallis.sgg.client.rpc.EspecialidadeItemAssociadoService|getEspecialidadesAssociado|I|java.lang.String/2004016611|114049091784077357204|1|2|3|4|2|5|6|${aliceId}|7|`;
    
    const specRes = await axios.post(specUrl, specPayload, { headers: specHeaders });
    const aliceSpecs = parseGwtRpc(specRes.data);

    console.log('Especialidades extraídas:');
    console.log(JSON.stringify(aliceSpecs, null, 2));

    console.log('\n--- Passo 4: Obter Atividades de Progressão (getCaminhos) ---');
    const progUrl = 'https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.EntryPointPrincipal/rpc/progressaoservice';
    
    const progHeaders = {
      ...headers,
      'x-gwt-permutation': 'E0CAF052CC10CF07C17AA5F96BCD3E44'
    };

    // cd_ramo = 2 para lobinho
    const progPayload = `7|0|6|https://paxtu.escoteiros.org.br/paxtu/br.com.wallis.sgg.Sgg/|7B80C4FAD4E58D53CB6773CC004DD479|br.com.wallis.sgg.client.rpc.ProgressaoService|getCaminhos|S|java.lang.Integer/3438268394|1|2|3|4|2|5|6|2|6|${aliceId}|`;

    const progRes = await axios.post(progUrl, progPayload, { headers: progHeaders });
    const aliceProg = parseGwtRpc(progRes.data);

    console.log(`Atividades de Progressão extraídas! Total: ${aliceProg.atividades ? aliceProg.atividades.length : 0}`);
    if (aliceProg.atividades && aliceProg.atividades.length > 0) {
      const realizadas = aliceProg.atividades.filter(a => a.dtAtividade && a.checkEscotista === 'confirmadoEscotista');
      console.log(`Total de Atividades Confirmadas/Realizadas: ${realizadas.length}`);
      console.log('Primeiras 5 Atividades Realizadas:');
      realizadas.slice(0, 5).forEach(a => {
        console.log(`- [${a.cdUeb}] ${a.dsAtividade.substring(0, 65)}... (Concluído em: ${a.dtAtividade})`);
      });
    }

  } catch (err) {
    console.error('Erro na extração de teste:', err.message);
    if (err.response) {
      console.error('Status do Erro:', err.response.status);
      console.error('Dados do Erro:', err.response.data);
    }
  }
}

testExtraction();
