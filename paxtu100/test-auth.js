const axios = require('axios');

async function testLogin() {
    console.log('--- Testando Credenciais Inválidas ---');
    try {
        const response = await axios.post('http://localhost:3000/login', {
            usuario: '1234567',
            senha: 'wrong_password'
        });
        console.log('Resposta inesperada (sucesso):', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Status de Erro Esperado:', error.response.status);
            console.log('Mensagem de Erro:', error.response.data.message);
        } else {
            console.error('Erro ao conectar ao servidor:', error.message);
        }
    }

    console.log('\n--- Testando Campos Faltando ---');
    try {
        const response = await axios.post('http://localhost:3000/login', {
            usuario: '1234567'
        });
    } catch (error) {
        if (error.response) {
            console.log('Status de Erro:', error.response.status);
            console.log('Dados:', error.response.data);
        }
    }
}

// Nota: Para testar com sucesso real, seria necessário um login e senha válidos.
testLogin();
