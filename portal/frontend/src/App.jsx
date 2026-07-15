import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Award, 
  Compass, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  FileText, 
  Plus, 
  Minus, 
  X, 
  MessageSquare, 
  Send,
  HelpCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// Fallback Mock Data in case API is unavailable or database is empty
const MOCK_LOBINHOS_FALLBACK = [
  {
    registro: '1549536',
    nome: 'Alice Calabró Portugal',
    idade: 10.6,
    data_nascimento: '2015-11-20',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'F',
    distintivoLegado: 'Caçador',
    distintivoAtual: 'Caçador',
    blocosCompletos: 18,
    planoAcompanhamento: false,
    cruzeiro: { blocosCompletos: true, reflexao: true, roca: true, caminho: true, apto: true },
    caminhoTropa: { percent: 100, status: 'Apto para Passagem', visitas: 4, familiarizacao: true, prontidao: true }
  },
  {
    registro: '1565924',
    nome: 'Amanda De Faria Leite Vivacqua',
    idade: 10.2,
    data_nascimento: '2016-04-10',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'F',
    distintivoLegado: 'Caçador',
    distintivoAtual: 'Rastreador',
    blocosCompletos: 11,
    planoAcompanhamento: true, // Downgrade math logic
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 70, status: 'Em Transição', visitas: 4, familiarizacao: true, prontidao: false }
  },
  {
    registro: '1672764',
    nome: 'Anna Livia Sá Bernardes',
    idade: 8.4,
    data_nascimento: '2018-02-15',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'F',
    distintivoLegado: 'Saltador',
    distintivoAtual: 'Saltador',
    blocosCompletos: 5,
    planoAcompanhamento: false,
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 0, status: 'Aguardando Idade', visitas: 0, familiarizacao: false, prontidao: false }
  },
  {
    registro: '1573267',
    nome: 'Daniel Leal Ferreira De Andrade',
    idade: 10.7,
    data_nascimento: '2015-10-05',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'M',
    distintivoLegado: 'Caçador',
    distintivoAtual: 'Caçador',
    blocosCompletos: 15,
    planoAcompanhamento: false,
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 40, status: 'Atrasado - Passagem Imediata', visitas: 1, familiarizacao: true, prontidao: false } // Critical
  },
  {
    registro: '1565936',
    nome: 'Enzo De Faria Leite Vivacqua',
    idade: 10.3,
    data_nascimento: '2016-03-12',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'M',
    distintivoLegado: 'Saltador',
    distintivoAtual: 'Saltador',
    blocosCompletos: 6,
    planoAcompanhamento: false,
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 40, status: 'Em Transição', visitas: 4, familiarizacao: false, prontidao: false }
  },
  {
    registro: '1623521',
    nome: 'Fernanda Camilo Da Silva',
    idade: 9.6,
    data_nascimento: '2016-11-01',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'F',
    distintivoLegado: 'Caçador',
    distintivoAtual: 'Caçador',
    blocosCompletos: 14,
    planoAcompanhamento: false,
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 0, status: 'Não Iniciado - Atenção', visitas: 0, familiarizacao: false, prontidao: false }
  },
  {
    registro: '1672807',
    nome: 'Francisco Ramos Dos Santos',
    idade: 7.9,
    data_nascimento: '2018-08-20',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'M',
    distintivoLegado: 'Pata-Tenra',
    distintivoAtual: 'Pata-Tenra',
    blocosCompletos: 2,
    planoAcompanhamento: false,
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 0, status: 'Aguardando Idade', visitas: 0, familiarizacao: false, prontidao: false }
  },
  {
    registro: '1623500',
    nome: 'Maria Antônia Vieira Castillo',
    idade: 9.8,
    data_nascimento: '2016-09-08',
    secao: 'Alcateia Waingunga',
    ramo: 'Lobinho',
    ativo: true,
    sexo: 'F',
    distintivoLegado: 'Rastreador',
    distintivoAtual: 'Saltador',
    blocosCompletos: 6,
    planoAcompanhamento: true, // Downgrade math logic
    cruzeiro: { blocosCompletos: false, reflexao: false, roca: false, caminho: false, apto: false },
    caminhoTropa: { percent: 30, status: 'Em Transição', visitas: 0, familiarizacao: true, prontidao: false }
  }
];

export default function App() {
  const [lobinhos, setLobinhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visao_geral');
  const [isUsingMocks, setIsUsingMocks] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLobinho, setSelectedLobinho] = useState(null);
  const [modalTab, setModalTab] = useState('fixas');

  // Akela Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  // Load data
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/equivalencia/lobinhos`);
      if (!response.ok) throw new Error('API server unavailable');
      const data = await response.json();
      
      if (data.length === 0) {
        // Fallback if DB is empty
        setLobinhos(MOCK_LOBINHOS_FALLBACK);
        setIsUsingMocks(true);
      } else {
        setLobinhos(data);
        setIsUsingMocks(false);
      }
    } catch (err) {
      console.warn('Backend unavailable, falling back to mock data:', err.message);
      setLobinhos(MOCK_LOBINHOS_FALLBACK);
      setIsUsingMocks(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger Akela IA notifications when data is loaded
  useEffect(() => {
    if (lobinhos.length > 0) {
      const planoAcompanhamentoCount = lobinhos.filter(l => l.planoAcompanhamento).length;
      const atrasadosTropaCount = lobinhos.filter(l => l.caminhoTropa.status === 'Atrasado - Passagem Imediata').length;
      const aptosCruzeiroCount = lobinhos.filter(l => l.cruzeiro.apto).length;

      let welcomeMsg = 'Melhor Possível, Escotista! 🐺 Bem-vindo ao LoboTrack: Focado no rastreamento da progressão. ';
      
      if (planoAcompanhamentoCount > 0 || atrasadosTropaCount > 0) {
        welcomeMsg += `Identifiquei alguns pontos de atenção no seu bando:\n\n`;
        if (planoAcompanhamentoCount > 0) {
          welcomeMsg += `- ⚠️ ${planoAcompanhamentoCount} lobinho(s) com alerta de **Plano de Acompanhamento** para evitar regressão de distintivo.\n`;
        }
        if (atrasadosTropaCount > 0) {
          welcomeMsg += `- 🚨 ${atrasadosTropaCount} lobinho(s) com **passagem atrasada** para a Tropa Escoteira (idade >= 10.5 anos).\n`;
        }
        welcomeMsg += `\nVamos revisar os apontamentos destes lobinhos para ajudá-los na jângal?`;
        setHasNewAlert(true);
      } else {
        welcomeMsg += `Tudo parece em ordem no seu bando! Todos os lobinhos estão caminhando conforme a trilha pedagógica.`;
      }

      setMessages([
        {
          id: 1,
          sender: 'akela',
          text: welcomeMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [lobinhos]);

  // Handle saving adjustments from modal or quick views
  const handleSaveAdjustment = async (registro, chave, valor) => {
    try {
      if (isUsingMocks) {
        // Local state update if using mocks
        setLobinhos(prev => prev.map(l => {
          if (l.registro !== registro) return l;
          
          const updated = { ...l };
          
          // Apply changes locally to mock data
          if (chave.startsWith('bloco_')) {
            const parts = chave.split('_');
            const blocoId = parseInt(parts[1]);
            const type = parts[2]; // fixas or variaveis
            
            updated.blocos = updated.blocos.map(b => {
              if (b.id !== blocoId) return b;
              
              if (type === 'fixas') {
                const idx = parseInt(parts[3]);
                const newFixas = [...b.fixas];
                newFixas[idx].completado = valor === 'true' || valor === true;
                const fixasCompletas = newFixas.every(f => f.completado);
                const completado = fixasCompletas && b.variaveisContagem >= b.variaveisAlvo;
                return { ...b, fixas: newFixas, fixasCompletas, completado };
              } else {
                const overrideVal = parseInt(valor, 10) || 0;
                const totalVariaveis = b.legacyCount + b.specsCount + overrideVal;
                const completado = b.fixasCompletas && totalVariaveis >= b.variaveisAlvo;
                return { ...b, overrideCount: overrideVal, variaveisContagem: totalVariaveis, completado };
              }
            });
            
            updated.blocosCompletos = updated.blocos.filter(b => b.completado).length;
            const MathBadge = getBadgeByBlocksCount(updated.blocosCompletos);
            const legOrder = MILESTONE_ORDER[updated.distintivoLegado.toUpperCase().replace('-', '_')] || 0;
            const matOrder = MILESTONE_ORDER[MathBadge] || 0;
            
            if (legOrder > matOrder) {
              updated.distintivoAtual = updated.distintivoLegado;
              updated.planoAcompanhamento = true;
            } else {
              updated.distintivoAtual = getMilestoneReadable(MathBadge);
              updated.planoAcompanhamento = false;
            }
          } else if (chave.startsWith('cruzeiro_')) {
            const field = chave.split('_')[1];
            updated.cruzeiro = { ...updated.cruzeiro, [field]: valor === 'true' || valor === true };
            updated.cruzeiro.apto = updated.blocosCompletos === 18 && updated.cruzeiro.reflexao && updated.cruzeiro.roca && updated.cruzeiro.caminho;
          } else if (chave.startsWith('tropa_')) {
            const field = chave.split('_')[1];
            const t = { ...updated.caminhoTropa };
            if (field === 'visitas') {
              t.visitas = parseInt(valor, 10) || 0;
            } else {
              t[field] = valor === 'true' || valor === true;
            }
            
            let percent = 0;
            percent += Math.min(4, t.visitas) * 10;
            if (t.familiarizacao) percent += 30;
            if (t.prontidao) percent += 30;
            t.percent = percent;
            
            if (updated.idade >= 9.5) {
              if (percent === 100) t.status = 'Apto para Passagem';
              else if (updated.idade >= 10.5) t.status = 'Atrasado - Passagem Imediata';
              else if (percent > 0) t.status = 'Em Transição';
              else t.status = 'Não Iniciado - Atenção';
            }
            updated.caminhoTropa = t;
          }
          
          return updated;
        }));
      } else {
        // Save to backend
        const res = await fetch(`${API_BASE}/apontamentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registro, chave, valor })
        });
        if (!res.ok) throw new Error('Failed to save adjustment');
        // Refresh data
        await fetchData();
      }
    } catch (e) {
      alert('Erro ao salvar apontamento: ' + e.message);
    }
  };

  // KPIs
  const kpiTotal = lobinhos.length;
  const kpiPlano = lobinhos.filter(l => l.planoAcompanhamento).length;
  const kpiAptosCruzeiro = lobinhos.filter(l => l.cruzeiro.apto).length;
  const kpiAtrasadosTropa = lobinhos.filter(l => l.caminhoTropa.status === 'Atrasado - Passagem Imediata').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-16">
      {/* Banner / Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Compass className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
                LoboTrack
              </h1>
              <p className="text-xs text-slate-400">Focado no rastreamento da progressão</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isUsingMocks && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Modo Demo (Dados Mocks)
              </span>
            )}
            <button 
              onClick={fetchData} 
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* TOP KPIs PANEL */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="w-16 h-16" />
            </div>
            <p className="text-sm font-medium text-slate-400">Lobinhos Ativos</p>
            <h3 className="text-3xl font-extrabold mt-2 text-white">{loading ? '...' : kpiTotal}</h3>
            <p className="text-xs text-slate-500 mt-1">Alcateia Waingunga</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText className="w-16 h-16 text-yellow-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Planos de Acompanhamento</p>
            <h3 className="text-3xl font-extrabold mt-2 text-yellow-500">{loading ? '...' : kpiPlano}</h3>
            <p className="text-xs text-slate-500 mt-1">Evita a regressão pedagógica</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Award className="w-16 h-16 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Aptos ao Cruzeiro do Sul</p>
            <h3 className="text-3xl font-extrabold mt-2 text-emerald-400">{loading ? '...' : kpiAptosCruzeiro}</h3>
            <p className="text-xs text-slate-500 mt-1">Insígnia Máxima da Alcateia</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Atrasados na Passagem</p>
            <h3 className="text-3xl font-extrabold mt-2 text-red-500">{loading ? '...' : kpiAtrasadosTropa}</h3>
            <p className="text-xs text-slate-500 mt-1">Idade limite (10.5+ anos) estourada</p>
          </div>
        </section>

        {/* TABS SELECTOR */}
        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('visao_geral')}
            className={`py-3.5 px-6 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'visao_geral' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>
          <button 
            onClick={() => setActiveTab('equivalencia')}
            className={`py-3.5 px-6 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'equivalencia' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Painel de Equivalência</span>
          </button>
          <button 
            onClick={() => setActiveTab('cruzeiro')}
            className={`py-3.5 px-6 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'cruzeiro' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Cruzeiro do Sul</span>
          </button>
          <button 
            onClick={() => setActiveTab('tropa')}
            className={`py-3.5 px-6 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'tropa' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Caminho da Tropa</span>
          </button>
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">Carregando dados da Alcateia...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">

            {/* TAB CONTENT: VISÃO GERAL */}
            {activeTab === 'visao_geral' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Side: Summary / Alerts */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-base font-bold text-white mb-4">Lobinhos que Requerem Ação</h4>
                    
                    <div className="space-y-4">
                      {/* Critical list */}
                      {lobinhos.filter(l => l.planoAcompanhamento || l.caminhoTropa.status === 'Atrasado - Passagem Imediata').map(l => (
                        <div key={l.registro} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-900 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${l.caminhoTropa.status.includes('Atrasado') ? 'bg-red-500 animate-ping' : 'bg-yellow-500'}`} />
                            <div>
                              <p className="text-sm font-semibold text-white">{l.nome}</p>
                              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                                <span>Reg. {l.registro}</span>
                                <span>•</span>
                                <span>{l.idade} anos</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {l.planoAcompanhamento && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                Plano Acompanhamento
                              </span>
                            )}
                            {l.caminhoTropa.status.includes('Atrasado') && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                Passagem Atrasada
                              </span>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedLobinho(l);
                                setIsModalOpen(true);
                                setModalTab('fixas');
                              }}
                              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
                            >
                              Apontar
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {lobinhos.filter(l => l.planoAcompanhamento || l.caminhoTropa.status === 'Atrasado - Passagem Imediata').length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <CheckCircle className="w-12 h-12 text-emerald-500/30 mx-auto mb-2" />
                          <p className="text-sm">Nenhum lobinho com alertas críticos no momento.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-base font-bold text-white mb-4">Quadro de Progressão (Novo Programa)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {['Pata-Tenra', 'Saltador', 'Rastreador', 'Caçador'].map(dist => {
                        const count = lobinhos.filter(l => l.distintivoAtual === dist).length;
                        return (
                          <div key={dist} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                            <p className="text-xs font-medium text-slate-400 uppercase">{dist}</p>
                            <p className="text-2xl font-bold mt-1 text-white">{count}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side: Informational / Tutorial */}
                <div className="space-y-6">
                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span>Equivalência e Não-Regressão</span>
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-400">
                      O Novo Programa Educativo organiza a progressão em **18 Blocos de Aprendizagem**. 
                      A equivalência migra os indicadores legados automaticamente. 
                      <br /><br />
                      Se a pontuação resultar em um distintivo inferior ao do antigo sistema, aciona-se o **Plano de Acompanhamento**. O jovem retém o distintivo antigo e a chefia traça metas específicas para cobrir a diferença.
                    </p>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <span>Passagem para a Tropa</span>
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-400">
                      Ao atingir **9,5 anos**, o lobinho entra na fase de transição. 
                      O cálculo é feito por:
                      <br />
                      - **Pontes (visitas à Tropa)**: 40% (10% por visita, max 4)
                      <br />
                      - **Familiarização (Promessa/Lei)**: 30%
                      <br />
                      - **Avaliação de Prontidão (Roca)**: 30%
                      <br /><br />
                      Ao completar **10,5 anos**, a passagem torna-se crítica (alerta vermelho).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PAINEL DE EQUIVALÊNCIA */}
            {activeTab === 'equivalencia' && (
              <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Nome do Lobinho</th>
                        <th className="py-4 px-6">Registro</th>
                        <th className="py-4 px-6 text-center">Idade</th>
                        <th className="py-4 px-6">Distintivo Legado</th>
                        <th className="py-4 px-6">Distintivo Atual</th>
                        <th className="py-4 px-6">Progresso (18 Blocos)</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {lobinhos.map(l => (
                        <tr key={l.registro} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-white">{l.nome}</td>
                          <td className="py-4 px-6 text-slate-400">{l.registro}</td>
                          <td className="py-4 px-6 text-center text-slate-300">{l.idade} anos</td>
                          <td className="py-4 px-6 text-slate-400">{l.distintivoLegado}</td>
                          <td className="py-4 px-6 text-blue-300 font-medium">{l.distintivoAtual}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-slate-400 w-8">{l.blocosCompletos}/18</span>
                              <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden w-24">
                                <div 
                                  className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${(l.blocosCompletos / 18) * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {l.planoAcompanhamento ? (
                              <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                Plano Acompanhamento
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Regular
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedLobinho(l);
                                setIsModalOpen(true);
                                setModalTab('fixas');
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                            >
                              Apontar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CRUZEIRO DO SUL */}
            {activeTab === 'cruzeiro' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lobinhos.filter(l => l.distintivoAtual === 'Caçador' || l.distintivoLegado === 'Caçador' || l.distintivoAtual === 'Cruzeiro do Sul').map(l => (
                  <div key={l.registro} className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h4 className="font-bold text-white text-base">{l.nome}</h4>
                        <p className="text-xs text-slate-400">Registro: {l.registro} • {l.idade} anos</p>
                      </div>
                      <div>
                        {l.cruzeiro.apto ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Apto ao Cruzeiro
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                            Requisitos Pendentes
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilares do Cruzeiro do Sul</p>
                      
                      {/* Req 1: 18 blocks */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className={`w-5 h-5 ${l.cruzeiro.blocosCompletos ? 'text-emerald-500' : 'text-slate-600'}`} />
                          <span className="text-sm font-medium text-slate-200">18 Blocos de Aprendizagem Completos</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{l.blocosCompletos}/18</span>
                      </div>

                      {/* Req 2: Reflexão */}
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-900/30 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            checked={l.cruzeiro.reflexao}
                            onChange={(e) => handleSaveAdjustment(l.registro, 'cruzeiro_reflexao', e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-200">1. Autoconhecimento e Reflexão (Jovem)</span>
                        </div>
                        <span className="text-xs text-slate-500">Autoavaliação</span>
                      </label>

                      {/* Req 3: Roca */}
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-900/30 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            checked={l.cruzeiro.roca}
                            onChange={(e) => handleSaveAdjustment(l.registro, 'cruzeiro_roca', e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-200">2. Reconhecimento Coletivo (Alcateia/Roca)</span>
                        </div>
                        <span className="text-xs text-slate-500">Validação Coletiva</span>
                      </label>

                      {/* Req 4: Caminho do Caçador */}
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-900/30 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            checked={l.cruzeiro.caminho}
                            onChange={(e) => handleSaveAdjustment(l.registro, 'cruzeiro_caminho', e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-200">3. Caminho do Caçador (Aventura de 1 dia)</span>
                        </div>
                        <span className="text-xs text-slate-500">Atividade Outdoor</span>
                      </label>
                    </div>
                  </div>
                ))}

                {lobinhos.filter(l => l.distintivoAtual === 'Caçador' || l.distintivoLegado === 'Caçador' || l.distintivoAtual === 'Cruzeiro do Sul').length === 0 && (
                  <div className="col-span-2 text-center py-16 text-slate-500 bg-slate-900/10 border border-slate-800 rounded-2xl">
                    <Award className="w-12 h-12 text-slate-650 mx-auto mb-2" />
                    <p className="text-sm">Nenhum lobinho elegível para o Cruzeiro do Sul (necessário ser Caçador).</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CAMINHO DA TROPA */}
            {activeTab === 'tropa' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lobinhos.filter(l => l.idade >= 9.5).map(l => {
                  let statusBg = 'bg-slate-900/40 text-slate-400 border-slate-800';
                  let statusText = l.caminhoTropa.status;
                  
                  if (statusText === 'Apto para Passagem') {
                    statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else if (statusText === 'Atrasado - Passagem Imediata') {
                    statusBg = 'bg-red-500/10 text-red-400 border-red-500/20';
                  } else if (statusText === 'Em Transição') {
                    statusBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  } else if (statusText === 'Não Iniciado - Atenção') {
                    statusBg = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                  }

                  return (
                    <div key={l.registro} className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                          <div>
                            <h4 className="font-bold text-white text-base">{l.nome}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Registro: {l.registro} • {l.idade} anos</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${statusBg}`}>
                            {statusText}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-6 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-400">Progresso da Passagem</span>
                            <span className="font-bold text-white">{l.caminhoTropa.percent}%</span>
                          </div>
                          <div className="bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                l.caminhoTropa.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} 
                              style={{ width: `${l.caminhoTropa.percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Specific parameters */}
                        <div className="mt-6 space-y-3.5">
                          {/* Visits */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                            <div>
                              <p className="text-sm font-medium text-slate-200">Pontes (Visitas à Tropa)</p>
                              <p className="text-xs text-slate-400 mt-0.5">Visitas realizadas (ideal: 4 visitas, 10% cada)</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSaveAdjustment(l.registro, 'tropa_visitas', Math.max(0, l.caminhoTropa.visitas - 1))}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-bold text-white text-sm">{l.caminhoTropa.visitas}</span>
                              <button
                                onClick={() => handleSaveAdjustment(l.registro, 'tropa_visitas', Math.min(4, l.caminhoTropa.visitas + 1))}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Familiarização */}
                          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:bg-slate-900/30 cursor-pointer">
                            <div>
                              <p className="text-sm font-medium text-slate-200">Familiarização (Promessa/Lei)</p>
                              <p className="text-xs text-slate-400 mt-0.5">Vale 30% do total</p>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={l.caminhoTropa.familiarizacao}
                              onChange={(e) => handleSaveAdjustment(l.registro, 'tropa_familiarizacao', e.target.checked)}
                              className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                            />
                          </label>

                          {/* Prontidão */}
                          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:bg-slate-900/30 cursor-pointer">
                            <div>
                              <p className="text-sm font-medium text-slate-200">Avaliação de Prontidão (Roca final)</p>
                              <p className="text-xs text-slate-400 mt-0.5">Vale 30% do total</p>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={l.caminhoTropa.prontidao}
                              onChange={(e) => handleSaveAdjustment(l.registro, 'tropa_prontidao', e.target.checked)}
                              className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {lobinhos.filter(l => l.idade >= 9.5).length === 0 && (
                  <div className="col-span-2 text-center py-16 text-slate-500 bg-slate-900/10 border border-slate-800 rounded-2xl">
                    <Compass className="w-12 h-12 text-slate-655 mx-auto mb-2" />
                    <p className="text-sm">Nenhum lobinho na idade de transição (idade &gt;= 9.5 anos).</p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* APONTAMENTO MODAL */}
      {isModalOpen && selectedLobinho && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950/50">
              <div>
                <h3 className="text-lg font-bold text-white">Apontamentos de Chefia</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Lobinho: <span className="text-slate-200 font-semibold">{selectedLobinho.nome}</span> (Reg. {selectedLobinho.registro})
                </p>
                {selectedLobinho.planoAcompanhamento && (
                  <div className="mt-2.5 p-3 rounded-lg bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      **Alerta de Plano de Acompanhamento ativo!** A conversão gerou pontuação inferior ao distintivo legado de **{selectedLobinho.distintivoLegado}**. O distintivo foi mantido e o lobo está sinalizado para recuperação.
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Selector */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-900">
              <button
                onClick={() => setModalTab('fixas')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 ${
                  modalTab === 'fixas' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Ações Educativas Fixas (Checklist)
              </button>
              <button
                onClick={() => setModalTab('variaveis')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 ${
                  modalTab === 'variaveis' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Ações Educativas Variáveis (Valores)
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-950/20">
              
              {/* TAB: FIXAS */}
              {modalTab === 'fixas' && (
                <div className="space-y-4">
                  {selectedLobinho.blocos.filter(b => b.fixas.length > 0).map(b => (
                    <div key={b.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Bloco {b.id} - {b.eixo}</span>
                        <h5 className="text-sm font-bold text-white">{b.nome}</h5>
                      </div>
                      
                      <div className="space-y-2">
                        {b.fixas.map((f, idx) => (
                          <label key={idx} className="flex items-start space-x-3 p-2 rounded hover:bg-slate-950 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={f.completado}
                              onChange={(e) => handleSaveAdjustment(selectedLobinho.registro, `bloco_${b.id}_fixas_${idx}`, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 mt-0.5"
                            />
                            <span className="text-xs text-slate-200 leading-normal">{f.descricao}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: VARIÁVEIS */}
              {modalTab === 'variaveis' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedLobinho.blocos.map(b => (
                    <div key={b.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div className="pr-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Bloco {b.id}</span>
                        <h5 className="text-xs font-bold text-white truncate max-w-[220px]">{b.nome}</h5>
                        <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                          <span>Legado: {b.legacyCount}</span>
                          <span>•</span>
                          <span>Specs: {b.specsCount}</span>
                          <span>•</span>
                          <span>Manual: {b.overrideCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSaveAdjustment(selectedLobinho.registro, `bloco_${b.id}_variaveis`, Math.max(0, b.overrideCount - 1))}
                          className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-white text-xs">{b.variaveisContagem}</span>
                        <button
                          onClick={() => handleSaveAdjustment(selectedLobinho.registro, `bloco_${b.id}_variaveis`, b.overrideCount + 1)}
                          className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-slate-500">/ {b.variaveisAlvo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING AKELA CHAT AGENT */}
      <div className="fixed bottom-6 right-6 z-40">
        
        {/* Toggle Button */}
        <button
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            setHasNewAlert(false);
          }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 hover:scale-105 transition-all"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {hasNewAlert && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-slate-950 animate-pulse" />
          )}
        </button>

        {/* Chat window */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[480px]">
            
            {/* Chat Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 border-b border-blue-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  🐺
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Akela IA</h4>
                  <p className="text-[10px] text-blue-200">Especialista no Programa Educativo</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Online
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40 text-xs">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] whitespace-pre-line leading-relaxed ${
                    m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Presets / Suggestions */}
            <div className="p-2 border-t border-slate-800/60 bg-slate-900/60 flex flex-wrap gap-1.5 justify-center">
              <button 
                onClick={() => {
                  const q = "Quem precisa de atenção?";
                  const a = `Lobinhos com alertas ativos:\n\n` + 
                    lobinhos.map(l => {
                      let alerts = [];
                      if (l.planoAcompanhamento) alerts.push("Plano de Acompanhamento (Downgrade)");
                      if (l.caminhoTropa.status === 'Atrasado - Passagem Imediata') alerts.push("Tropa Atrasado (10.5+ anos)");
                      return alerts.length > 0 ? `- **${l.nome}**: ${alerts.join(", ")}` : null;
                    }).filter(Boolean).join("\n") || "Nenhum lobinho necessitando de atenção especial!";
                  
                  setMessages(prev => [
                    ...prev, 
                    { id: prev.length + 1, sender: 'user', text: q },
                    { id: prev.length + 2, sender: 'akela', text: a + "\n\nMelhor Possível, Escotista!" }
                  ]);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 transition-colors border border-slate-700/50"
              >
                Quem precisa de atenção?
              </button>
              <button 
                onClick={() => {
                  const q = "Como funciona o Cruzeiro do Sul?";
                  const a = `O distintivo de **Cruzeiro do Sul** é o reconhecimento máximo do Ramo Lobinho. Para conquistá-lo, o Caçador precisa cumprir 4 pilares:\n\n` +
                    `1. **18 Blocos de Aprendizagem**: Completar todos os blocos no Painel.\n` +
                    `2. **Reflexão**: Autoavaliação do jovem.\n` +
                    `3. **Roca de Conselho**: Validação pelos Velhos Lobos e Alcateia.\n` +
                    `4. **Caminho do Caçador**: Uma aventura outdoor de 1 dia.\n\n` +
                    `Você pode marcar estes pilares na aba correspondente do portal.\n\nMelhor Possível!`;
                  setMessages(prev => [
                    ...prev, 
                    { id: prev.length + 1, sender: 'user', text: q },
                    { id: prev.length + 2, sender: 'akela', text: a }
                  ]);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 transition-colors border border-slate-700/50"
              >
                Como funciona o Cruzeiro?
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
