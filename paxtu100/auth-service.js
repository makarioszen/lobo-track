const axios = require('axios');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url');

async function authenticate(username, password) {
  const instance = axios.create({
    timeout: 10000,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  try {
    // 1. GET initial page to get cookies and the action URL
    const initialResponse = await instance.get('https://paxtu100.escoteiros.org.br/');
    
    // The response might be a redirect to Keycloak. Axios follows redirects by default.
    // Let's ensure we are at the login page.
    const html = initialResponse.data;
    const $ = cheerio.load(html);
    
    const actionUrl = $('#kc-form-login').attr('action');
    
    if (!actionUrl) {
      throw new Error('Could not find login form action URL');
    }

    // 2. Prepare POST data
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('credentialId', '');
    params.append('login', 'Entrar');

    // 3. POST credentials
    // We need to keep the cookies from the initial request
    const cookieHeader = initialResponse.headers['set-cookie'];
    
    const loginResponse = await instance.post(actionUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader ? cookieHeader.map(c => c.split(';')[0]).join('; ') : '',
      },
      maxRedirects: 0, // We want to catch the 302
      validateStatus: (status) => status === 302 || status === 200,
    });

    if (loginResponse.status === 302) {
      // Success! Keycloak redirects on successful login.
      return {
        success: true,
        message: 'Autenticado com sucesso',
        location: loginResponse.headers.location,
      };
    } else {
      // Status 200 usually means invalid credentials (re-renders the login page with error)
      return {
        success: false,
        message: 'Falha na autenticação: Credenciais inválidas ou erro no portal',
      };
    }
  } catch (error) {
    console.error('Auth error:', error.message);
    return {
      success: false,
      message: `Erro interno: ${error.message}`,
    };
  }
}

module.exports = { authenticate };
