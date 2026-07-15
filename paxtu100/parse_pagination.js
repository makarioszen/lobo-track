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
    
    // Print all links in the document
    const allLinks = [];
    $('a').each((i, el) => {
      allLinks.push({
        text: $(el).text().trim(),
        href: $(el).attr('href'),
        class: $(el).attr('class')
      });
    });
    console.log('All links:', allLinks.filter(l => l.text.length > 0 || l.href));

    // Look for button or list elements at the bottom
    console.log('\n--- Button elements ---');
    $('button').each((i, el) => {
      console.log(`Button Text: ${$(el).text().trim()} | Class: ${$(el).attr('class')}`);
    });

    console.log('\n--- Elements containing pagination structure ---');
    // Common pagination patterns
    const pag = $('.pagination, .page-navigation, nav, ul, .pager');
    pag.each((i, el) => {
      console.log(`Tag: ${el.tagName} | Class: ${$(el).attr('class')} | HTML: ${$(el).html().substring(0, 300)}`);
    });

  }
} catch (err) {
  console.error('Error parsing JSON:', err.message);
}
