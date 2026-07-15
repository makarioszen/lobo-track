const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LOG_DIR = path.join(__dirname, 'logs_interceptados');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} else {
  // Limpar logs antigos para não confundir
  fs.readdirSync(LOG_DIR).forEach(file => {
    fs.unlinkSync(path.join(LOG_DIR, file));
  });
}

// Map to associate requests with responses
const requestMap = new Map();
let globalCounter = 0;

async function setupInterception(page) {
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/rpc/')) {
      const method = request.method();
      const headers = request.headers();
      const postData = request.postData();
      
      const id = ++globalCounter;
      requestMap.set(request, id);

      const serviceName = path.basename(url);
      console.log(`[REQ #${id}] [${method}] ${serviceName}`);
      
      const logData = {
        id,
        timestamp: new Date().toISOString(),
        url,
        method,
        headers,
        postData
      };
      
      fs.writeFileSync(
        path.join(LOG_DIR, `req_${id}_${serviceName}.json`),
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
      const serviceName = path.basename(url);
      console.log(`[RES #${id}] [${status}] ${serviceName}`);
      
      try {
        const text = await response.text();
        fs.writeFileSync(
          path.join(LOG_DIR, `res_${id}_${serviceName}.txt`),
          text
        );
      } catch (err) {
        console.error(`Erro ao ler resposta #${id} de ${serviceName}:`, err.message);
      }
    }
  });
}

async function run() {
  console.log('Iniciando o Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await setupInterception(page);

  const targetUrl = process.env.paxtu_old_url || 'https://paxtu.escoteiros.org.br/paxtu/';
  console.log(`Navegando para: ${targetUrl}`);
  
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  const user = process.env.paxtu_old_user;
  const pass = process.env.paxtu_old_pass;

  console.log('Preenchendo campos de login...');
  await page.waitForSelector('input[name="dsLogin"]', { timeout: 15000 });
  await page.focus('input[name="dsLogin"]');
  await page.type('input[name="dsLogin"]', user, { delay: 50 });
  await page.focus('input[name="dsSenha"]');
  await page.type('input[name="dsSenha"]', pass, { delay: 50 });

  console.log('Clicando no botão de login...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Login' || b.className.includes('x-btn-text'));
    if (btn) btn.click();
  });

  console.log('Aguardando painel principal...');
  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log('Clicando em "Dados dos Associados"...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Dados dos Associados');
    if (btn) btn.click();
  });

  console.log('Aguardando modal de atenção/renovação (8 segundos)...');
  await new Promise(resolve => setTimeout(resolve, 8000));
  await page.screenshot({ path: path.join(__dirname, 'modal_aberto.png') });

  // Remover modal e máscara do DOM
  console.log('Removendo modal e máscaras de fundo do DOM...');
  await page.evaluate(() => {
    const modal1 = document.getElementById('ext-gen746');
    if (modal1) modal1.remove();
    
    // Remover qualquer janela modal do ExtJS
    const windows = document.querySelectorAll('.x-window');
    windows.forEach(w => w.remove());

    // Remover a máscara cinza de fundo
    const masks = document.querySelectorAll('.ext-el-mask, .ext-el-mask-msg');
    masks.forEach(m => m.remove());
  });

  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: path.join(__dirname, 'modal_removido.png') });

  // Agora vamos tentar clicar no primeiro associado da listagem principal (grid)
  console.log('Tentando abrir detalhes clicando no nome do primeiro associado...');
  const nameHandle = await page.evaluateHandle(() => {
    // Acha o primeiro elemento que contém exatamente o nome do primeiro associado beneficiário
    const all = Array.from(document.querySelectorAll('*'));
    return all.find(el => (el.textContent || '').trim().includes('ALICE CALABRÓ PORTUGAL') && el.offsetHeight > 0 && el.children.length === 0);
  });

  let clicked = false;
  if (nameHandle && nameHandle.asElement()) {
    console.log('Nome encontrado! Clicando no elemento nativamente...');
    await nameHandle.asElement().click();
    clicked = true;
  } else {
    console.log('Nome do associado não encontrado na tela.');
  }

  console.log('Clique no associado tentado:', clicked);
  
  console.log('Aguardando botão "Vida escoteira" carregar...');
  await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar carregar detalhes iniciais

  // Esperar o botão "Vida escoteira" aparecer
  const vidaBtnHandle = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('*'))
      .find(el => (el.textContent || '').trim().toLowerCase() === 'vida escoteira' && el.offsetHeight > 0);
  });

  if (vidaBtnHandle && vidaBtnHandle.asElement()) {
    console.log('Clicando no botão "Vida escoteira" nativamente...');
    await page.screenshot({ path: path.join(__dirname, 'detalhes_antes_vida_escoteira.png') });
    await vidaBtnHandle.asElement().click();
    
    console.log('Vida escoteira clicado. Aguardando 15 segundos para carregar dados de progressão/especialidades...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await page.screenshot({ path: path.join(__dirname, 'vida_escoteira.png') });

    console.log('Rolando a página para baixo para visualizar o restante das informações...');
    await page.evaluate(() => {
      window.scrollTo(0, 1000);
      const scrollableDivs = Array.from(document.querySelectorAll('div')).filter(d => d.scrollHeight > d.clientHeight);
      scrollableDivs.forEach(d => {
        d.scrollTop = 1000;
      });
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: path.join(__dirname, 'vida_escoteira_rolado.png') });

    console.log('Clicando no botão "Atividades - Lobinho"...');
    const atividadesBtnHandle = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('*'))
        .find(el => (el.textContent || '').trim().toLowerCase() === 'atividades - lobinho' && el.offsetHeight > 0);
    });

    if (atividadesBtnHandle && atividadesBtnHandle.asElement()) {
      console.log('Botão "Atividades - Lobinho" encontrado! Clicando...');
      await atividadesBtnHandle.asElement().click();
      
      console.log('Aguardando 10 segundos para carregar as atividades e registrar tráfego...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await page.screenshot({ path: path.join(__dirname, 'atividades_lobinho_popup.png') });
    } else {
      console.log('Botão "Atividades - Lobinho" não encontrado na tela.');
    }
  } else {
    console.log('Botão "Vida escoteira" não encontrado na tela.');
    
    // Salvar print do estado atual para ajudar no debug
    await page.screenshot({ path: path.join(__dirname, 'detalhes_vida_escoteira_nao_encontrado.png') });

    const visibleElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, .x-btn-text, span, div, td'))
        .filter(el => el.offsetHeight > 0 && el.textContent.trim().length > 0 && el.textContent.trim().length < 50)
        .map(el => el.textContent.trim());
    });
    console.log('Elementos visíveis na tela no momento (primeiros 100):', visibleElements.slice(0, 100));
  }

  await browser.close();
  console.log('Browser fechado. Descoberta concluída.');
}

run().catch(err => {
  console.error('Erro ao executar:', err);
});
