const fs = require('fs');
const path = require('path');
const { parseGwtRpc } = require('./parser');

const LOGS_DIR = path.join(__dirname, 'logs_interceptados');

function runTest() {
  console.log('--- TESTANDO PARSER GWT RPC ---');

  // 1. Testar lista de associados
  const res33Path = path.join(LOGS_DIR, 'res_33_associadoservice.txt');
  if (fs.existsSync(res33Path)) {
    const raw33 = fs.readFileSync(res33Path, 'utf8');
    const parsed33 = parseGwtRpc(raw33);
    console.log('\n1. Listagem de Associados:');
    console.log(`Sucesso! Total de associados: ${parsed33.totalCount}`);
    console.log('Primeiro Associado:', parsed33.data[0].nm_associado, `(ID: ${parsed33.data[0].cd_associado})`);
    console.log('Segundo Associado:', parsed33.data[1].nm_associado, `(ID: ${parsed33.data[1].cd_associado})`);
  } else {
    console.log('res_33_associadoservice.txt não encontrado.');
  }

  // 2. Testar detalhes do associado (Alice)
  const res37Path = path.join(LOGS_DIR, 'res_37_associadoservice.txt');
  if (fs.existsSync(res37Path)) {
    const raw37 = fs.readFileSync(res37Path, 'utf8');
    const parsed37 = parseGwtRpc(raw37);
    console.log('\n2. Detalhes de Alice (getAssociado):');
    console.log(JSON.stringify(parsed37, null, 2));
  } else {
    console.log('res_37_associadoservice.txt não encontrado.');
  }

  // 3. Testar especialidades
  const res102Path = path.join(LOGS_DIR, 'res_102_especialidadeitemassociadoservice.txt');
  if (fs.existsSync(res102Path)) {
    const raw102 = fs.readFileSync(res102Path, 'utf8');
    const parsed102 = parseGwtRpc(raw102);
    console.log('\n3. Especialidades de Alice:');
    console.log(JSON.stringify(parsed102, null, 2));
  } else {
    console.log('res_102_especialidadeitemassociadoservice.txt não encontrado.');
  }

  // 4. Testar atividades de progressão
  const res110Path = path.join(LOGS_DIR, 'res_110_progressaoservice.txt');
  if (fs.existsSync(res110Path)) {
    const raw110 = fs.readFileSync(res110Path, 'utf8');
    const parsed110 = parseGwtRpc(raw110);
    console.log('\n4. Atividades de Progressão de Alice (getCaminhos):');
    console.log(`Sucesso! Total de atividades extraídas: ${parsed110.atividades ? parsed110.atividades.length : 0}`);
    if (parsed110.atividades && parsed110.atividades.length > 0) {
      console.log('Primeiras 3 Atividades:');
      console.log(parsed110.atividades.slice(0, 3).map(a => `- [${a.cdUeb}] ${a.dsAtividade.substring(0, 80)}... (Data: ${a.dtAtividade})`).join('\n'));
    }
  } else {
    console.log('res_110_progressaoservice.txt não encontrado.');
  }
}

runTest();
