const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

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
app.get('/api/equivalencia/lobinhos', async (req, res) => {
  try {
    // 1. Fetch data from Neon DB
    const associadosLegado = await sql`
      SELECT id_associado, registro, nome, data_nascimento, secao, ramo, sexo, ativo, categoria
      FROM associados_legado
      WHERE (ramo = 'Lobinho' OR secao ILIKE '%Alcateia%' OR secao ILIKE '%Lobo%')
        AND (categoria IS NULL OR categoria <> 'Escotista');
    `;

    const progressaoLegado = await sql`SELECT id_associado, milestone, data_conclusao FROM progressao_legado`;
    const atividadesLegado = await sql`SELECT id_associado, cd_ueb, ds_atividade FROM atividades_legado`;
    const especialidadesLegado = await sql`SELECT id_associado, cd_especialidade, ds_especialidade, nivel FROM especialidades_legado`;

    const associadosP100 = await sql`
      SELECT id_associado, registro, nome, data_nascimento, secao, ramo, categoria
      FROM associados_paxtu100
      WHERE (categoria IS NULL OR categoria <> 'Escotista');
    `;
    const progressaoP100 = await sql`SELECT id_associado, milestone, data_conclusao FROM progressao_paxtu100`;
    const atividadesP100 = await sql`SELECT id_associado, ds_atividade FROM atividades_paxtu100`;

    const todosAjustes = await sql`SELECT registro, chave, valor FROM ajustes_chefia`;

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
        sexo: null,
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

      // Determine Legacy Badge
      const legacyHighest = getHighestMilestone(myProgLeg);

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
      // Compare: legacy badge vs mathematical badge
      const legOrder = MILESTONE_ORDER[legacyHighest] || 0;
      const matOrder = MILESTONE_ORDER[distintivoMatematico] || 0;

      let distintivoFinal = distintivoMatematico;
      let planoAcompanhamento = false;

      // If legacy had a higher badge, preserve it (except if math is Caçador and they had Caçador, which is equal)
      // Note: we only check lobinho progression badges PATA_TENRA, SALTADOR, RASTREADOR, CACADOR
      const legacyIsProgBadge = ['PATA_TENRA', 'SALTADOR', 'RASTREADOR', 'CACADOR'].includes(legacyHighest);
      
      if (legacyIsProgBadge && legOrder > matOrder) {
        distintivoFinal = legacyHighest;
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
app.post('/api/apontamentos', async (req, res) => {
  const { registro, chave, valor } = req.body;

  if (!registro || !chave || valor === undefined) {
    return res.status(400).json({ error: 'Registro, chave e valor são obrigatórios.' });
  }

  try {
    // Upsert adjustment
    await sql`
      INSERT INTO ajustes_chefia (registro, chave, valor)
      VALUES (${registro}, ${chave}, ${String(valor)})
      ON CONFLICT (registro, chave) DO UPDATE SET
        valor = EXCLUDED.valor,
        data_apontamento = CURRENT_TIMESTAMP;
    `;

    res.json({ success: true, message: 'Apontamento salvo com sucesso!' });
  } catch (err) {
    console.error('Error saving adjustments:', err);
    res.status(500).json({ error: 'Erro ao salvar apontamento', details: err.message });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Backend server is running on port ${PORT}`);
  await initDb();
});
