const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LOG_DIR = path.join(__dirname, 'logs_interceptados');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} else {
  fs.readdirSync(LOG_DIR).forEach(file => {
    try {
      fs.unlinkSync(path.join(LOG_DIR, file));
    } catch (e) {}
  });
}

const requestMap = new Map();
let globalCounter = 0;

async function setupInterception(page) {
  page.on('request', request => {
    const url = request.url();
    // Intercept requests to APIs or backend
    if (url.includes('escoteiros.org.br') && !url.match(/\.(png|jpg|jpeg|gif|css|js|woff2|woff|ttf|svg|ico)$/)) {
      const method = request.method();
      const headers = request.headers();
      const postData = request.postData();
      
      const id = ++globalCounter;
      requestMap.set(request, id);

      const parsedUrl = new URL(url);
      const logName = `${parsedUrl.pathname.replace(/\//g, '_')}_${parsedUrl.search.replace(/\?/g, '')}`.substring(0, 100);
      
      console.log(`[REQ #${id}] [${method}] ${url}`);
      
      const logData = {
        id,
        timestamp: new Date().toISOString(),
        url,
        method,
        headers,
        postData
      };
      
      fs.writeFileSync(
        path.join(LOG_DIR, `req_${id}_${logName}.json`),
        JSON.stringify(logData, null, 2)
      );
    }
  });

  page.on('response', async response => {
    const request = response.request();
    if (requestMap.has(request)) {
      const id = requestMap.get(request);
      const url = response.url();
      const status = response.status();
      const parsedUrl = new URL(url);
      const logName = `${parsedUrl.pathname.replace(/\//g, '_')}_${parsedUrl.search.replace(/\?/g, '')}`.substring(0, 100);
      
      console.log(`[RES #${id}] [${status}] ${url}`);
      
      try {
        const text = await response.text();
        fs.writeFileSync(
          path.join(LOG_DIR, `res_${id}_${logName}.txt`),
          text
        );
      } catch (err) {
        console.error(`Erro ao ler resposta #${id}:`, err.message);
      }
    }
  });
}

async function run() {
  console.log('Iniciando Puppeteer para Paxtu 100...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await setupInterception(page);

  const targetUrl = 'https://paxtu100.escoteiros.org.br/';
  console.log(`Navegando para: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Keycloak login
  console.log('Aguardando formulário do Keycloak...');
  await page.waitForSelector('#kc-form-login', { timeout: 15000 });

  const user = process.env.paxtu100_user;
  const pass = process.env.paxtu100_pass;

  console.log('Preenchendo credenciais...');
  await page.type('#username', user);
  await page.type('#password', pass);
  await page.screenshot({ path: path.join(__dirname, 'login_preenchido.png') });

  console.log('Clicando em Entrar...');
  await page.click('#kc-login');

  console.log('Aguardando redirecionamento após login (10 segundos)...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  await page.screenshot({ path: path.join(__dirname, 'dashboard.png') });

  console.log('Navegando para a listagem de associados...');
  await page.goto('https://paxtu100.escoteiros.org.br/associado/lista', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(__dirname, 'lista_inicial.png') });

  // Fechar modal de atualização ou aviso se houver
  await page.evaluate(() => {
    // Tentar fechar qualquer modal clicando no botão de fechar ou dismiss
    const dismissBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Entendi') || b.textContent.includes('Fechar') || b.className.includes('close'));
    if (dismissBtn) dismissBtn.click();
    
    // Aceitar cookies
    const cookieBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.toLowerCase().includes('aceitar') || b.textContent.toLowerCase().includes('concordo'));
    if (cookieBtn) cookieBtn.click();
  });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Localizando o filtro de seção...');
  await page.waitForSelector('#search_section', { timeout: 15000 });

  const sectionOptionValue = await page.evaluate(() => {
    const select = document.querySelector('#search_section');
    if (!select) return null;
    const option = Array.from(select.options).find(o => o.text.includes('Waingunga'));
    return option ? option.value : null;
  });
  console.log('Valor da opção Waingunga:', sectionOptionValue);

  if (sectionOptionValue) {
    console.log('Selecionando a Alcateia Waingunga...');
    await page.select('#search_section', sectionOptionValue);
    await page.evaluate((val) => {
      const select = document.querySelector('#search_section');
      select.value = val;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, sectionOptionValue);
  } else {
    console.log('Opção Waingunga não encontrada no select.');
  }

  console.log('Aguardando filtragem dos associados...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await page.screenshot({ path: path.join(__dirname, 'lista_filtrada.png') });

  console.log('Clicando no primeiro associado da lista...');
  const clickedAssociado = await page.evaluate(() => {
    const cards = document.querySelectorAll('.associateButton.paxtu-table-row');
    for (const card of cards) {
      if (card.offsetHeight > 0 && card.textContent.trim().length > 0) {
        card.click();
        return true;
      }
    }
    return false;
  });
  console.log('Associado clicado:', clickedAssociado);

  console.log('Aguardando redirecionamento para o perfil (5 segundos)...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await page.screenshot({ path: path.join(__dirname, 'perfil_associado.png') });

  // Clicar em "Conquistas e certificações"
  console.log('Acessando aba Conquistas e certificações...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('Conquistas e certificações') && el.offsetHeight > 0);
    if (tab) tab.click();
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: path.join(__dirname, 'perfil_conquistas.png') });

  // Expandir "Progressão"
  console.log('Expandindo sanfona de Progressão...');
  await page.evaluate(() => {
    const acc = Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('Progressão') && el.offsetHeight > 0);
    if (acc) acc.click();
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: path.join(__dirname, 'perfil_progressao.png') });

  // Clicar em "Vida Escoteira"
  console.log('Acessando aba Vida Escoteira...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('Vida Escoteira') && el.offsetHeight > 0);
    if (tab) tab.click();
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: path.join(__dirname, 'perfil_vida_escoteira.png') });

  await browser.close();
  console.log('Descoberta do Paxtu 100 concluída.');
}

run().catch(err => {
  console.error('Erro geral no script:', err);
});
