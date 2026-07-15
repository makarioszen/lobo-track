const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('https://paxtu100.escoteiros.org.br/', { waitUntil: 'networkidle2' });
  await page.type('#username', process.env.paxtu100_user);
  await page.type('#password', process.env.paxtu100_pass);
  await page.click('#kc-login');

  await new Promise(resolve => setTimeout(resolve, 8000));

  await page.goto('https://paxtu100.escoteiros.org.br/paineis/programa-educativo', { waitUntil: 'networkidle2' });
  
  const html = await page.content();
  fs.writeFileSync(path.join(__dirname, 'programa_educativo.html'), html);
  
  console.log('Salvo programa_educativo.html');
  await browser.close();
}
run();
