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
  
  // Intercept network requests
  const requests = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') || url.includes('carregar') || url.includes('json') || url.includes('programa')) {
        try {
            const status = response.status();
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json') || contentType.includes('text/html')) {
                // we don't need to read all bodies, just URLs for now
                requests.push(`${status} ${contentType} ${url}`);
            }
        } catch (e) {}
    }
  });

  await page.goto('https://paxtu100.escoteiros.org.br/', { waitUntil: 'networkidle2' });
  await page.type('#username', process.env.paxtu100_user);
  await page.type('#password', process.env.paxtu100_pass);
  await page.click('#kc-login');

  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log("Navigating to Programa Educativo...");
  await page.goto('https://paxtu100.escoteiros.org.br/paineis/programa-educativo', { waitUntil: 'networkidle2' });
  
  await new Promise(resolve => setTimeout(resolve, 5000)); // wait for ajax

  fs.writeFileSync(path.join(__dirname, 'programa_network.txt'), requests.join('\n'));
  
  console.log('Salvo programa_network.txt');
  await browser.close();
}
run();
