const express = require('express');
const cors = require('cors');
const { neon, Pool } = require('@neondatabase/serverless');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runInSecaoTransaction(secaoNome, runQueriesFn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_secao_nome', $1, true)", [secaoNome]);
    const result = await runQueriesFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// --- CRYPTOGRAPHY & AUTH HELPERS ---
const JWT_SECRET = process.env.JWT_SECRET || 'secret-lobo-track';
const PAXTU_KEY = crypto.scryptSync(process.env.PAXTU_ENCRYPTION_KEY || 'default-encryption-key-lobo-track', 'salt', 32);
const IV_LENGTH = 16;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verifyHash;
}

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', PAXTU_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', PAXTU_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error('Decryption failed:', e.message);
    return null;
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  const user = verifyToken(token);
  if (!user) return res.status(403).json({ error: 'Token inválido ou expirado.' });

  req.user = user;
  next();
}

const SECTION_MAP = {
  559: 'Alcatéia Francisco de Assis',
  558: 'Alcatéia Seeonee',
  11009: 'Alcateia Waingunga',
  3031: 'Clã Ibirapitanga',
  7145: 'Tropa Curupaiti',
  12076: 'Tropa Orion',
  2986: 'Tropa Senior Panará',
  5164: 'Tropa Senior Uatumã',
  2984: 'Tropa Tuiuti'
};

// Database initialization
async function initDb() {
  try {
    console.log('Initializing database settings...');
    await sql`
      CREATE TABLE IF NOT EXISTS ajustes_chefia (
        id SERIAL PRIMARY KEY,
        registro VARCHAR(50) NOT NULL,
        chave VARCHAR(100) NOT NULL,
        valor VARCHAR(255) NOT NULL,
        data_apontamento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        origem VARCHAR(100) DEFAULT 'Apontamento Manual Chefia',
        UNIQUE (registro, chave)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS usuarios_sistema (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        cargo VARCHAR(50) NOT NULL DEFAULT 'chefe',
        secao_id INT NOT NULL DEFAULT 11009,
        secao_nome VARCHAR(255) NOT NULL DEFAULT 'Alcateia Waingunga',
        aprovado BOOLEAN NOT NULL DEFAULT FALSE,
        paxtu_legado_user VARCHAR(255),
        paxtu_legado_password_encrypted TEXT,
        paxtu100_user VARCHAR(255),
        paxtu100_password_encrypted TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sync_status (
        email VARCHAR(255) PRIMARY KEY REFERENCES usuarios_sistema(email) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'idle',
        progress INTEGER NOT NULL DEFAULT 0,
        step VARCHAR(255),
        error TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default admin if none exists
    const usersCount = await sql`SELECT COUNT(*) FROM usuarios_sistema`;
    if (parseInt(usersCount[0].count, 10) === 0) {
      console.log('Seeding default Akela account...');
      const defaultHash = hashPassword('akela123');
      await sql`
        INSERT INTO usuarios_sistema (nome, email, senha_hash, cargo, secao_id, secao_nome, aprovado)
        VALUES ('Akela', 'akela@lobotrack.com', ${defaultHash}, 'chefe', 11009, 'Alcateia Waingunga', true);
      `;
    }

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database table:', err);
  }
}

// Structuring the blocks metadata
const BLOCOS_METADATA = [
  {
    id: 1,
    nome: 'Aprendizagem Contínua e Desenvolv. Vocacional',
    eixo: 'Habilidades para a Vida',
    atividades_fixas: ['Conquistar 1 especialidade de um campo de conhecimento inédito para a criança.'],
    atividades_antigas: ['I1', 'I2', 'I3', 'I4', 'I5', 'I7', 'I8', 'I9', 'I22', 'I23', 'I24', 'I25', 'I26', 'I27', 'I28', 'I29', 'C5', 'C6'],
    especialidades: ['Insígnia do Aprender', 'Aprender'],
    target_variaveis: 2
  },
  {
    id: 2,
    nome: 'Autonomia e Liderança',
    eixo: 'Habilidades para a Vida',
    atividades_fixas: ['Preparar e organizar sua mochila e kit individual para um acampamento real.'],
    atividades_antigas: ['I15', 'I16'],
    especialidades: ['Administração', 'Educação Financeira', 'Empreendedorismo', 'Oratória', 'Reparos Domésticos'],
    target_variaveis: 2
  },
  {
    id: 3,
    nome: 'Criatividade e Inovação',
    eixo: 'Habilidades para a Vida',
    atividades_fixas: ['Projetar e construir uma engenhoca manual simples (varal rústico, suporte de panela).'],
    atividades_antigas: ['I10', 'I11', 'I12'],
    especialidades: ['Arte Digital', 'Artes Visuais', 'Artesanato', 'Fotografia', 'Pintura', 'Robótica', 'Origami'],
    target_variaveis: 2
  },
  {
    id: 4,
    nome: 'Inteligência Emocional',
    eixo: 'Habilidades para a Vida',
    atividades_fixas: [], // Subjetivo
    atividades_antigas: ['C8', 'C9', 'C10', 'C15', 'C16', 'I17', 'I18', 'I19', 'I20', 'I21', 'A17'],
    especialidades: [],
    target_variaveis: 2
  },
  {
    id: 5,
    nome: 'Consumo Responsável',
    eixo: 'Meio Ambiente',
    atividades_fixas: ['Executar saída de campo (piquenique ou excursão) sem consumo de plásticos descartáveis.'],
    atividades_antigas: ['S16', 'S17', 'S18'],
    especialidades: ['Horticultura', 'Reduzir, Reciclar, Reutilizar', 'Reduzir/Reciclar/Reutilizar'],
    target_variaveis: 2
  },
  {
    id: 6,
    nome: 'Mudanças Climáticas',
    eixo: 'Meio Ambiente',
    atividades_fixas: [],
    atividades_antigas: ['S25'],
    especialidades: ['Meteorologia', 'Escoteiros pela Energia Solar', 'Energia Solar'],
    target_variaveis: 2
  },
  {
    id: 7,
    nome: 'Preservação da Biodiversidade',
    eixo: 'Meio Ambiente',
    atividades_fixas: ['Incursão exploratória com a alcateia com foco exclusivo de estudo de preservação local.'],
    atividades_antigas: ['S22', 'S26'],
    especialidades: ['Botânica', 'Oceanologia', 'Zoologia', 'Campeões da Natureza'],
    target_variaveis: 2
  },
  {
    id: 8,
    nome: 'Vida ao Ar Livre',
    eixo: 'Meio Ambiente',
    atividades_fixas: [
      'Dominar 5 nós elementares (Direito, Escota, etc.).',
      'Armar e desarmar barraca.',
      'Prática de segurança com fogueiras.',
      'Orientação estelar (Cruzeiro) e bússola (Rosa dos Ventos).',
      'Participar em 2 pernoites outdoor.',
      'Culinária mateira.'
    ],
    atividades_antigas: ['F10', 'F20', 'I6', 'I13', 'I14'],
    especialidades: ['Acampamento', 'Excursões', 'Montanhismo', 'Pioneiria', 'Sobrevivência', 'Rastreamento'],
    target_variaveis: 2
  },
  {
    id: 9,
    nome: 'Comunidade',
    eixo: 'Paz e Desenvolvimento',
    atividades_fixas: [
      'Liderar com a seção um mutirão de melhoria contínua das instalações do grupo (UEL).',
      'Mapeamento de contatos hospitalares/193 locais.'
    ],
    atividades_antigas: ['S9', 'S27', 'S28', 'E9', 'E10'],
    especialidades: ['Defesa Civil', 'Mensageiros da Paz', 'Boa Ação', 'Insígnia da Boa Ação'],
    target_variaveis: 2
  },
  {
    id: 10,
    nome: 'Democracia',
    eixo: 'Paz e Desenvolvimento',
    atividades_fixas: [
      'Debates em Roca de Conselho.',
      'Análise ética do episódio "Caçadas de Kaa".',
      'Participar de eleições para Primo de matilha.'
    ],
    atividades_antigas: ['S5', 'S6', 'S7', 'S8', 'S21'],
    especialidades: [],
    target_variaveis: 2
  },
  {
    id: 11,
    nome: 'Herança Cultural',
    eixo: 'Paz e Desenvolvimento',
    atividades_fixas: ['Protagonizar protocolo cerimonial de hasteamento/arriamento da Bandeira Nacional.'],
    atividades_antigas: ['S10', 'S11', 'S12', 'S23'],
    especialidades: ['Brasilidades', 'Genealogia', 'Informações Turísticas', 'Povos Originários'],
    target_variaveis: 2
  },
  {
    id: 12,
    nome: 'Promoção da Paz',
    eixo: 'Paz e Desenvolvimento',
    atividades_fixas: ['Análise profunda e debate dos contos "Flor Vermelha" e "Irmãos de Mowgli".'],
    atividades_antigas: ['A10', 'A11', 'A12', 'A13', 'S29', 'S30', 'S31', 'E7', 'E8', 'E15', 'E16'],
    especialidades: ['Insígnia da Lusofonia', 'Lusofonia', 'Insígnia do Cone Sul', 'Cone Sul'],
    target_variaveis: 2
  },
  {
    id: 13,
    nome: 'Valores',
    eixo: 'Paz e Desenvolvimento',
    atividades_fixas: ['Estudo de caso do episódio "Tigre! Tigre!" como metáfora da assunção da Promessa.'],
    atividades_antigas: ['C1', 'C2', 'C3', 'C4', 'C13', 'C14', 'A8', 'A9', 'S19', 'S20', 'E13', 'E14'],
    especialidades: ['Escotismo Mundial'],
    target_variaveis: 2
  },
  {
    id: 14,
    nome: 'Cuidado com o Corpo',
    eixo: 'Saúde e Bem-Estar',
    atividades_fixas: [
      'Assepsia e socorros a escoriações/queimaduras.',
      'Imobilizações em tipoia.',
      'Triagem de febre via termômetro.',
      'Adesão a protocolos de segurança da chefia.'
    ],
    atividades_antigas: ['F7', 'F8', 'F12', 'F13', 'F14', 'F17', 'F18', 'F19', 'F21', 'F22'],
    especialidades: ['Anatomia Humana', 'Prevenção em Saúde', 'Primeiros Socorros'],
    target_variaveis: 2
  },
  {
    id: 15,
    nome: 'Espiritualidade',
    eixo: 'Saúde e Bem-Estar',
    atividades_fixas: [],
    atividades_antigas: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E11', 'E12'],
    especialidades: ['Yoga', 'Práticas de contemplação'],
    target_variaveis: 2
  },
  {
    id: 16,
    nome: 'Hábitos Saudáveis',
    eixo: 'Saúde e Bem-Estar',
    atividades_fixas: [
      'Manipular/cozinhar pratos saudáveis na base.',
      'Gestão de macronutrientes (legumes/frutas).',
      'Trekking lúdico documentado de 3 km.'
    ],
    atividades_antigas: ['F1', 'F2', 'F3', 'F4', 'F5', 'F9', 'F11', 'F23', 'F24'],
    especialidades: ['Nutrição funcional', 'Confeitaria'],
    target_variaveis: 2
  },
  {
    id: 17,
    nome: 'Saúde Mental',
    eixo: 'Saúde e Bem-Estar',
    atividades_fixas: [],
    atividades_antigas: ['A6', 'A7', 'F15', 'F16'],
    especialidades: [],
    target_variaveis: 2
  },
  {
    id: 18,
    nome: 'Vínculos Saudáveis',
    eixo: 'Saúde e Bem-Estar',
    atividades_fixas: [
      'Conduta relacional zelosa com matilhas/chefes.',
      'Postura e saudação perante visitantes.'
    ],
    atividades_antigas: ['A1', 'A2', 'A3', 'A4', 'A5', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'S1', 'S2', 'S3', 'S4', 'S13', 'S14', 'S15', 'C11', 'C12'],
    especialidades: [],
    target_variaveis: 2
  }
];

// Helper to determine the badge level from number of completed blocks
function getBadgeByBlocksCount(count) {
  if (count <= 3) return 'PATA_TENRA';
  if (count <= 7) return 'SALTADOR';
  if (count <= 12) return 'RASTREADOR';
  return 'CACADOR';
}

// Convert milestone code to human readable name
function getMilestoneReadable(m) {
  switch (m) {
    case 'PATA_TENRA': return 'Pata-Tenra';
    case 'SALTADOR': return 'Saltador';
    case 'RASTREADOR': return 'Rastreador';
    case 'CACADOR': return 'Caçador';
    case 'CRUZEIRO_SUL': return 'Cruzeiro do Sul';
    default: return m;
  }
}

// Milestone ordering for hierarchy
const MILESTONE_ORDER = {
  'NENHUM': 0,
  'PATA_TENRA': 1,
  'SALTADOR': 2,
  'RASTREADOR': 3,
  'CACADOR': 4,
  'CRUZEIRO_SUL': 5
};

function getHighestMilestone(milestones) {
  let highest = 'NENHUM';
  milestones.forEach(m => {
    const key = m.milestone;
    if (MILESTONE_ORDER[key] && MILESTONE_ORDER[key] > MILESTONE_ORDER[highest]) {
      highest = key;
    }
  });
  return highest;
}

// Helper to calculate exact age in years
function calculateAge(birthDateStr) {
  if (!birthDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  // Calculate precise age with decimal
  const diffTime = Math.abs(today - birthDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return parseFloat((diffDays / 365.25).toFixed(1));
}

// API endpoint to fetch consolidated equivalency data
app.get('/api/equivalencia/lobinhos', authenticateToken, async (req, res) => {
  try {
    // 1. Fetch data from Neon DB under RLS Transaction
    const dbData = await runInSecaoTransaction(req.user.secao_nome, async (client) => {
      const associadosLegado = (await client.query(`
        SELECT id_associado, registro, nome, data_nascimento, secao, ramo, sexo, ativo, categoria
        FROM associados_legado
        WHERE (ramo = 'Lobinho' OR secao ILIKE '%Alcateia%' OR secao ILIKE '%Lobo%')
          AND (categoria IS NULL OR categoria <> 'Escotista')
      `)).rows;

      const progressaoLegado = (await client.query(`SELECT id_associado, milestone, data_conclusao FROM progressao_legado`)).rows;
      const atividadesLegado = (await client.query(`SELECT id_associado, cd_ueb, ds_atividade FROM atividades_legado`)).rows;
      const especialidadesLegado = (await client.query(`SELECT id_associado, cd_especialidade, ds_especialidade, nivel FROM especialidades_legado`)).rows;

      const associadosP100 = (await client.query(`
        SELECT id_associado, registro, nome, data_nascimento, secao, ramo, sexo, categoria
        FROM associados_paxtu100
        WHERE (categoria IS NULL OR categoria <> 'Escotista')
      `)).rows;
      const progressaoP100 = (await client.query(`SELECT id_associado, milestone, data_conclusao FROM progressao_paxtu100`)).rows;
      const atividadesP100 = (await client.query(`SELECT id_associado, ds_atividade FROM atividades_paxtu100`)).rows;

      const todosAjustes = (await client.query(`SELECT registro, chave, valor FROM ajustes_chefia`)).rows;

      return {
        associadosLegado,
        progressaoLegado,
        atividadesLegado,
        especialidadesLegado,
        associadosP100,
        progressaoP100,
        atividadesP100,
        todosAjustes
      };
    });

    const {
      associadosLegado,
      progressaoLegado,
      atividadesLegado,
      especialidadesLegado,
      associadosP100,
      progressaoP100,
      atividadesP100,
      todosAjustes
    } = dbData;

    // Index DB records by id_associado or registro for fast retrieval
    const progLegMap = {};
    progressaoLegado.forEach(p => {
      if (!progLegMap[p.id_associado]) progLegMap[p.id_associado] = [];
      progLegMap[p.id_associado].push(p);
    });

    const ativLegMap = {};
    atividadesLegado.forEach(a => {
      if (!ativLegMap[a.id_associado]) ativLegMap[a.id_associado] = [];
      ativLegMap[a.id_associado].push(a);
    });

    const specLegMap = {};
    especialidadesLegado.forEach(e => {
      if (!specLegMap[e.id_associado]) specLegMap[e.id_associado] = [];
      specLegMap[e.id_associado].push(e);
    });

    const progP100Map = {};
    progressaoP100.forEach(p => {
      if (!progP100Map[p.id_associado]) progP100Map[p.id_associado] = [];
      progP100Map[p.id_associado].push(p);
    });

    const ativP100Map = {};
    atividadesP100.forEach(a => {
      if (!ativP100Map[a.id_associado]) ativP100Map[a.id_associado] = [];
      ativP100Map[a.id_associado].push(a);
    });

    const ajustesMap = {};
    todosAjustes.forEach(aj => {
      if (!ajustesMap[aj.registro]) ajustesMap[aj.registro] = {};
      ajustesMap[aj.registro][aj.chave] = aj.valor;
    });

    // We build the list of all unique children (using registro as the identifier)
    const registrosUnicos = new Set();
    const mapAssociados = {};

    // Load from Paxtu 100 first (modern source of truth)
    associadosP100.forEach(a => {
      registrosUnicos.add(a.registro);
      mapAssociados[a.registro] = {
        registro: a.registro,
        id_p100: a.id_associado,
        id_legado: null,
        nome: a.nome,
        data_nascimento: a.data_nascimento,
        secao: a.secao,
        ramo: a.ramo,
        sexo: a.sexo,
        ativo: true,
        categoria: a.categoria
      };
    });

    // Load from legacy (for fallbacks and additions)
    associadosLegado.forEach(a => {
      if (registrosUnicos.has(a.registro)) {
        mapAssociados[a.registro].id_legado = a.id_associado;
        mapAssociados[a.registro].sexo = a.sexo;
        mapAssociados[a.registro].ativo = a.ativo;
        // Fallback to legacy date of birth if missing in P100
        if (!mapAssociados[a.registro].data_nascimento) {
          mapAssociados[a.registro].data_nascimento = a.data_nascimento;
        }
        if (!mapAssociados[a.registro].categoria) {
          mapAssociados[a.registro].categoria = a.categoria;
        }
      } else {
        registrosUnicos.add(a.registro);
        mapAssociados[a.registro] = {
          registro: a.registro,
          id_p100: null,
          id_legado: a.id_associado,
          nome: a.nome,
          data_nascimento: a.data_nascimento,
          secao: a.secao,
          ramo: a.ramo,
          sexo: a.sexo,
          ativo: a.ativo,
          categoria: a.categoria
        };
      }
    });

    // Form consolidated list of lobinhos
    const lobinhosList = [];

    for (const reg of registrosUnicos) {
      const basic = mapAssociados[reg];
      if (basic.categoria === 'Escotista') continue;
      
      // Calculate age
      const idade = calculateAge(basic.data_nascimento);

      // Fetch specific records
      const legId = basic.id_legado;
      const p100Id = basic.id_p100;

      const myProgLeg = legId ? (progLegMap[legId] || []) : [];
      const myAtivLeg = legId ? (ativLegMap[legId] || []) : [];
      const mySpecLeg = legId ? (specLegMap[legId] || []) : [];

      const myProgP100 = p100Id ? (progP100Map[p100Id] || []) : [];
      const myAtivP100 = p100Id ? (ativP100Map[p100Id] || []) : [];

      const myAjustes = ajustesMap[reg] || {};

      // Determine Legacy and Paxtu 100 highest milestone
      const legacyHighest = getHighestMilestone(myProgLeg);
      const p100Highest = getHighestMilestone(myProgP100);

      const legacyHighestOrder = MILESTONE_ORDER[legacyHighest] || 0;
      const p100HighestOrder = MILESTONE_ORDER[p100Highest] || 0;
      const baselineHighestOrder = Math.max(legacyHighestOrder, p100HighestOrder);
      const baselineHighest = baselineHighestOrder === legacyHighestOrder ? legacyHighest : p100Highest;

      // --- CALCULATE BLOCKS PROGRESS ---
      const blocosCalculados = BLOCOS_METADATA.map(bloco => {
        const blocoId = bloco.id;
        
        // 1. Fixed Activities
        const totalFixasCount = bloco.atividades_fixas.length;
        const fixasStatus = bloco.atividades_fixas.map((desc, idx) => {
          const key = `bloco_${blocoId}_fixas_${idx}`;
          // Check manual override first
          if (myAjustes[key] !== undefined) {
            return myAjustes[key] === 'true';
          }
          // Default to false (fixed activities are typically evaluated manually or by chefia check)
          return false;
        });
        const fixasCompletas = totalFixasCount === 0 || fixasStatus.every(s => s === true);

        // 2. Variable Activities (Count)
        // Find matching activities from legacy database
        const matchingLegacyActivities = myAtivLeg.filter(a => bloco.atividades_antigas.includes(a.cd_ueb));
        const legacyCount = matchingLegacyActivities.length;

        // Find matching specialties
        const matchingSpecs = mySpecLeg.filter(sp => {
          const dSpec = sp.ds_especialidade.toLowerCase();
          return bloco.especialidades.some(matchStr => dSpec.includes(matchStr.toLowerCase()));
        });
        const specsCount = matchingSpecs.length;

        // Check manual overrides for variables count
        const keyVarOverride = `bloco_${blocoId}_variaveis`;
        let overrideCount = 0;
        if (myAjustes[keyVarOverride] !== undefined) {
          overrideCount = parseInt(myAjustes[keyVarOverride], 10) || 0;
        }

        const totalVariaveis = legacyCount + specsCount + overrideCount;
        const targetVariaveis = bloco.target_variaveis;
        const variaveisPercent = Math.min(100, Math.round((totalVariaveis / targetVariaveis) * 100));

        // A block is fully complete if fixed activities are done and variables target is reached
        const blocoCompleto = fixasCompletas && totalVariaveis >= targetVariaveis;

        return {
          id: blocoId,
          nome: bloco.nome,
          eixo: bloco.eixo,
          fixas: fixasStatus.map((status, idx) => ({
            descricao: bloco.atividades_fixas[idx],
            completado: status
          })),
          fixasCompletas,
          variaveisContagem: totalVariaveis,
          variaveisAlvo: targetVariaveis,
          variaveisPercent,
          completado: blocoCompleto,
          legacyCount,
          specsCount,
          overrideCount
        };
      });

      const totalBlocosCompletos = blocosCalculados.filter(b => b.completado).length;

      // Mathematical Badge
      const distintivoMatematico = getBadgeByBlocksCount(totalBlocosCompletos);

      // Rule of Non-Regression
      // Compare: baseline badge vs mathematical badge
      const matOrder = MILESTONE_ORDER[distintivoMatematico] || 0;

      let distintivoFinal = distintivoMatematico;
      let planoAcompanhamento = false;

      // If baseline had a higher badge, preserve it
      const baselineIsProgBadge = ['PATA_TENRA', 'SALTADOR', 'RASTREADOR', 'CACADOR'].includes(baselineHighest);
      
      if (baselineIsProgBadge && baselineHighestOrder > matOrder) {
        distintivoFinal = baselineHighest;
        planoAcompanhamento = true;
      }

      // --- CRUZEIRO DO SUL CHECKLIST ---
      // Requisitos: 18 blocos + 3 pilares
      const pilarReflexao = myAjustes['cruzeiro_reflexao'] === 'true';
      const pilarRoca = myAjustes['cruzeiro_roca'] === 'true';
      const pilarCaminho = myAjustes['cruzeiro_caminho'] === 'true';
      
      const aptoCruzeiro = totalBlocosCompletos === 18 && pilarReflexao && pilarRoca && pilarCaminho;

      // --- CAMINHO DA TROPA PROGRESS ---
      // Regras:
      // Idade alvo >= 9.5. Limite crítico >= 10.5. Menores de 9.5 -> Aguardando Idade.
      // Composição:
      // Pontes (visitas): max 4, 10% cada (40% total)
      // Familiarização: 30%
      // Prontidão (Roca): 30%
      const visitasCount = parseInt(myAjustes['tropa_visitas'], 10) || 0; // 0 to 4
      const fezFamiliarizacao = myAjustes['tropa_familiarizacao'] === 'true';
      const fezProntidao = myAjustes['tropa_prontidao'] === 'true';

      let tropaPercent = 0;
      tropaPercent += Math.min(4, visitasCount) * 10;
      if (fezFamiliarizacao) tropaPercent += 30;
      if (fezProntidao) tropaPercent += 30;

      let tropaStatus = 'Aguardando Idade';
      if (idade >= 9.5) {
        if (tropaPercent === 100) {
          tropaStatus = 'Apto para Passagem'; // Verde
        } else if (idade >= 10.5) {
          tropaStatus = 'Atrasado - Passagem Imediata'; // Vermelho
        } else if (tropaPercent > 0) {
          tropaStatus = 'Em Transição'; // Azul
        } else {
          tropaStatus = 'Não Iniciado - Atenção'; // Amarelo
        }
      }

      lobinhosList.push({
        registro: reg,
        nome: basic.nome,
        idade,
        data_nascimento: basic.data_nascimento,
        secao: basic.secao,
        ramo: basic.ramo,
        ativo: basic.ativo,
        sexo: basic.sexo,
        distintivoLegado: legacyHighest !== 'NENHUM' ? getMilestoneReadable(legacyHighest) : 'Nenhum',
        distintivoAtual: getMilestoneReadable(distintivoFinal),
        blocosCompletos: totalBlocosCompletos,
        blocos: blocosCalculados,
        planoAcompanhamento,
        cruzeiro: {
          blocosCompletos: totalBlocosCompletos === 18,
          reflexao: pilarReflexao,
          roca: pilarRoca,
          caminho: pilarCaminho,
          apto: aptoCruzeiro
        },
        caminhoTropa: {
          percent: tropaPercent,
          status: tropaStatus,
          visitas: visitasCount,
          familiarizacao: fezFamiliarizacao,
          prontidao: fezProntidao
        }
      });
    }

    // Sort by name
    lobinhosList.sort((a, b) => a.nome.localeCompare(b.nome));

    res.json(lobinhosList);
  } catch (err) {
    console.error('Error fetching/processing equivalency data:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
});

// API endpoint to save chefia adjustments
app.post('/api/apontamentos', authenticateToken, async (req, res) => {
  const { registro, chave, valor } = req.body;

  if (!registro || !chave || valor === undefined) {
    return res.status(400).json({ error: 'Registro, chave e valor são obrigatórios.' });
  }

  try {
    await runInSecaoTransaction(req.user.secao_nome, async (client) => {
      // Verify if the child is visible under RLS. Since RLS is enabled on the associados tables,
      // this query will only return results if the child belongs to the chefia's active section!
      const matchingAssociados = await client.query(`
        SELECT registro FROM associados_paxtu100 WHERE registro = $1
        UNION
        SELECT registro FROM associados_legado WHERE registro = $1
      `, [registro]);

      if (matchingAssociados.rows.length === 0) {
        throw new Error('RLS_FORBIDDEN');
      }

      // Upsert adjustment
      await client.query(`
        INSERT INTO ajustes_chefia (registro, chave, valor)
        VALUES ($1, $2, $3)
        ON CONFLICT (registro, chave) DO UPDATE SET
          valor = EXCLUDED.valor,
          data_apontamento = CURRENT_TIMESTAMP
      `, [registro, chave, String(valor)]);
    });

    res.json({ success: true, message: 'Apontamento salvo com sucesso!' });
  } catch (err) {
    if (err.message === 'RLS_FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso negado. Este associado não pertence à sua seção ativa.' });
    }
    console.error('Error saving adjustments:', err);
    res.status(500).json({ error: 'Erro ao salvar apontamento', details: err.message });
  }
});

// --- AUTHENTICATION & SYNC ENDPOINTS ---

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, cargo, secao_id } = req.body;
  if (!nome || !email || !senha || !cargo || !secao_id) {
    return res.status(400).json({ error: 'Nome, e-mail, senha, cargo e seção são obrigatórios.' });
  }

  const resolvedSecaoNome = SECTION_MAP[secao_id];
  if (!resolvedSecaoNome) {
    return res.status(400).json({ error: 'Seção selecionada é inválida.' });
  }

  try {
    const existing = await sql`SELECT id FROM usuarios_sistema WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const hash = hashPassword(senha);
    await sql`
      INSERT INTO usuarios_sistema (nome, email, senha_hash, cargo, secao_id, secao_nome, aprovado)
      VALUES (${nome}, ${email}, ${hash}, ${cargo}, ${parseInt(secao_id, 10)}, ${resolvedSecaoNome}, false);
    `;

    res.json({ success: true, message: 'Usuário registrado com sucesso! Pendente de aprovação pelo administrador.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário', details: err.message });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const users = await sql`SELECT id, nome, email, senha_hash, cargo, secao_id, secao_nome, aprovado FROM usuarios_sistema WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = users[0];
    if (!verifyPassword(senha, user.senha_hash)) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    if (!user.aprovado) {
      return res.status(403).json({ error: 'Cadastro pendente de aprovação do administrador.' });
    }

    const token = generateToken({ 
      id: user.id, 
      nome: user.nome, 
      email: user.email,
      cargo: user.cargo,
      secao_id: user.secao_id,
      secao_nome: user.secao_nome
    });
    
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        nome: user.nome, 
        email: user.email, 
        cargo: user.cargo,
        secao_id: user.secao_id,
        secao_nome: user.secao_nome
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro ao realizar login', details: err.message });
  }
});

// Auth: Me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await sql`
      SELECT id, nome, email, cargo, secao_id, secao_nome, aprovado, paxtu_legado_user, paxtu100_user 
      FROM usuarios_sistema 
      WHERE email = ${req.user.email}
    `;
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      secao_id: user.secao_id,
      secao_nome: user.secao_nome,
      aprovado: user.aprovado,
      hasLegadoCreds: !!user.paxtu_legado_user,
      hasP100Creds: !!user.paxtu100_user
    });
  } catch (err) {
    console.error('Error in auth/me:', err);
    res.status(500).json({ error: 'Erro interno', details: err.message });
  }
});

// Profile: Save Credentials
app.post('/api/profile/credentials', authenticateToken, async (req, res) => {
  const { paxtu_legado_user, paxtu_legado_pass, paxtu100_user, paxtu100_pass } = req.body;

  try {
    const encryptedLegadoPass = encrypt(paxtu_legado_pass);
    const encryptedP100Pass = encrypt(paxtu100_pass);

    await sql`
      UPDATE usuarios_sistema
      SET 
        paxtu_legado_user = COALESCE(${paxtu_legado_user || null}, paxtu_legado_user),
        paxtu_legado_password_encrypted = COALESCE(${encryptedLegadoPass || null}, paxtu_legado_password_encrypted),
        paxtu100_user = COALESCE(${paxtu100_user || null}, paxtu100_user),
        paxtu100_password_encrypted = COALESCE(${encryptedP100Pass || null}, paxtu100_password_encrypted)
      WHERE email = ${req.user.email}
    `;

    res.json({ success: true, message: 'Credenciais salvas com sucesso!' });
  } catch (err) {
    console.error('Error saving credentials:', err);
    res.status(500).json({ error: 'Erro ao salvar credenciais', details: err.message });
  }
});

// Profile: Load Credentials Status
app.get('/api/profile/credentials', authenticateToken, async (req, res) => {
  try {
    const users = await sql`
      SELECT paxtu_legado_user, paxtu100_user 
      FROM usuarios_sistema 
      WHERE email = ${req.user.email}
    `;
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = users[0];
    res.json({
      paxtu_legado_user: user.paxtu_legado_user,
      paxtu100_user: user.paxtu100_user
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar status de credenciais', details: err.message });
  }
});

// Sync: Status
app.get('/api/sync/status', authenticateToken, async (req, res) => {
  try {
    const status = await sql`
      SELECT status, progress, step, error, updated_at 
      FROM sync_status 
      WHERE email = ${req.user.email}
    `;
    res.json(status[0] || { status: 'idle', progress: 0, step: 'Pronto para sincronizar.', error: null });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter status de sincronização', details: err.message });
  }
});

// Sync: Trigger
app.post('/api/sync/trigger', authenticateToken, async (req, res) => {
  try {
    const users = await sql`
      SELECT paxtu_legado_user, paxtu_legado_password_encrypted, paxtu100_user, paxtu100_password_encrypted
      FROM usuarios_sistema
      WHERE email = ${req.user.email}
    `;
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    const user = users[0];
    if (!user.paxtu_legado_user || !user.paxtu_legado_password_encrypted || !user.paxtu100_user || !user.paxtu100_password_encrypted) {
      return res.status(400).json({ error: 'Configure as credenciais dos portais Paxtu no seu perfil antes de sincronizar.' });
    }

    // Decrypt credentials
    const decryptedLegadoPass = decrypt(user.paxtu_legado_password_encrypted);
    const decryptedP100Pass = decrypt(user.paxtu100_password_encrypted);

    if (!decryptedLegadoPass || !decryptedP100Pass) {
      return res.status(500).json({ error: 'Falha na decriptação das credenciais salvas. Reconfigure seu perfil.' });
    }

    // Update status to starting
    await sql`
      INSERT INTO sync_status (email, status, progress, step, error, updated_at)
      VALUES (${req.user.email}, 'running', 0, 'Iniciando pipeline de sincronização...', NULL, NOW())
      ON CONFLICT (email) DO UPDATE SET
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        step = EXCLUDED.step,
        error = EXCLUDED.error,
        updated_at = EXCLUDED.updated_at;
    `;

    // Spawn pipeline in background
    const { spawn } = require('child_process');
    const email = req.user.email;

    const runSyncPipeline = async () => {
      try {
        // Step 1: Paxtu Legado
        await new Promise((resolve, reject) => {
          console.log(`[Sync Pipeline] Rodando extrator legado para ${email}`);
          const child = spawn('node', [path.join(__dirname, '../../paxtu_legado/extrator_completo.js')], {
            env: {
              ...process.env,
              paxtu_old_user: user.paxtu_legado_user,
              paxtu_old_pass: decryptedLegadoPass,
              SYNC_USER_EMAIL: email
            }
          });
          child.stdout.on('data', data => console.log(`[Legado stdout] ${data}`));
          child.stderr.on('data', data => console.error(`[Legado stderr] ${data}`));
          child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Extrator Legado falhou com código ${code}`));
          });
        });

        // Step 2: Paxtu 100
        await new Promise((resolve, reject) => {
          console.log(`[Sync Pipeline] Rodando extrator paxtu100 para ${email}`);
          const child = spawn('node', [path.join(__dirname, '../../paxtu100/extrator_completo_paxtu100.js')], {
            env: {
              ...process.env,
              paxtu100_user: user.paxtu100_user,
              paxtu100_pass: decryptedP100Pass,
              SYNC_USER_EMAIL: email,
              SYNC_SECAO_ID: String(req.user.secao_id),
              SYNC_SECAO_NOME: req.user.secao_nome
            }
          });
          child.stdout.on('data', data => console.log(`[Paxtu100 stdout] ${data}`));
          child.stderr.on('data', data => console.error(`[Paxtu100 stderr] ${data}`));
          child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Extrator Paxtu 100 falhou com código ${code}`));
          });
        });

        // Pipeline successful!
        await sql`
          INSERT INTO sync_status (email, status, progress, step, error, updated_at)
          VALUES (${email}, 'completed', 100, 'Sincronização completa de ambos os sistemas finalizada!', NULL, NOW())
          ON CONFLICT (email) DO UPDATE SET
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            step = EXCLUDED.step,
            error = EXCLUDED.error,
            updated_at = EXCLUDED.updated_at;
        `;
      } catch (err) {
        console.error('[Sync Pipeline] Falha no processo assíncrono:', err);
        await sql`
          INSERT INTO sync_status (email, status, progress, step, error, updated_at)
          VALUES (${email}, 'failed', 100, 'Sincronização falhou', ${err.message}, NOW())
          ON CONFLICT (email) DO UPDATE SET
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            step = EXCLUDED.step,
            error = EXCLUDED.error,
            updated_at = EXCLUDED.updated_at;
        `;
      }
    };

    // Run in background without blocking request
    setTimeout(runSyncPipeline, 0);

    res.json({ success: true, message: 'Sincronização iniciada em background.' });
  } catch (err) {
    console.error('Error triggering sync:', err);
    res.status(500).json({ error: 'Erro ao iniciar sincronização', details: err.message });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Backend server is running on port ${PORT}`);
  await initDb();
});
