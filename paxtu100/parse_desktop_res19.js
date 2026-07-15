const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, 'logs_interceptados', 'res_19__associado_associado_lista_carregar_branch_id=Selecione&name=&registration=&category=Selecione&funct.txt');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const fileContent = fs.readFileSync(filePath, 'utf8');
try {
  const data = JSON.parse(fileContent);
  if (data.html) {
    const $ = cheerio.load(data.html);
    
    // Find all desktop rows: div.paxtu-table-row
    const associates = [];
    $('.paxtu-table-row').each((i, el) => {
      const id = $(el).attr('data-bs-associate');
      
      // Inside .paxtu-table-row, find the name
      // Usually there is a div with class paxtu-info containing h3 for name, p for registration etc.
      const name = $(el).find('.paxtu-info h3').text().trim();
      const regText = $(el).find('.paxtu-info p').text().trim(); // e.g. "Registro: 1642378 • 46/SP"
      const regMatch = regText.match(/Registro:\s*(\d+)/i);
      const registration = regMatch ? regMatch[1] : '';
      
      if (id) {
        associates.push({ id, name, registration });
      }
    });

    console.log(`Parsed ${associates.length} desktop associates:`);
    associates.forEach((a, index) => {
      console.log(`${index + 1}. ID: ${a.id} | Name: ${a.name} | Reg: ${a.registration}`);
    });
  }
} catch (err) {
  console.error('Error parsing JSON:', err.message);
}
