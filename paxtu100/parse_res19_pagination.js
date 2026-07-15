const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'logs_interceptados', 'res_19__associado_associado_lista_carregar_branch_id=Selecione&name=&registration=&category=Selecione&funct.txt');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const fileContent = fs.readFileSync(filePath, 'utf8');
try {
  const data = JSON.parse(fileContent);
  console.log('JSON Keys:', Object.keys(data));
  if (data.pagination) {
    console.log('Pagination HTML length:', data.pagination.length);
    console.log('Pagination HTML:', data.pagination);
  } else {
    console.log('No pagination field found in response JSON.');
  }
} catch (err) {
  console.error('Error parsing JSON:', err.message);
}
