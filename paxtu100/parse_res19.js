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
  console.log('JSON parsed successfully. HTML length:', data.html ? data.html.length : 0);
  
  if (data.html) {
    const $ = cheerio.load(data.html);
    
    // Find all associate buttons or rows
    const associates = [];
    $('.associateButton, tr[data-bs-associate], [data-bs-associate]').each((i, el) => {
      const id = $(el).attr('data-bs-associate');
      // Find name inside this element
      const name = $(el).find('h3, td, .paxtu-info h3, span').first().text().trim();
      // Let's also extract text to see if we can find other elements
      if (id && !associates.some(a => a.id === id)) {
        associates.push({ id, name });
      }
    });

    console.log(`Found ${associates.length} associates:`);
    associates.forEach((a, index) => {
      console.log(`${index + 1}. ID: ${a.id} - Name: ${a.name}`);
    });

    console.log('\n--- Detalhamento das tags com data-bs-associate ---');
    $('[data-bs-associate]').each((i, el) => {
      const tag = el.tagName;
      const id = $(el).attr('data-bs-associate');
      const className = $(el).attr('class');
      console.log(`Tag: ${tag} | ID: ${id} | Class: ${className}`);
    });
  }
} catch (err) {
  console.error('Error parsing JSON:', err.message);
}
