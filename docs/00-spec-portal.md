Atue como um Desenvolvedor Front-end Sênior especialista em React, Tailwind CSS e UX/UI Design, com profundo conhecimento das regras de progressão do Escotismo (Escoteiros do Brasil). 

Seu objetivo é criar um "Portal de Acompanhamento - Transição da Alcateia", uma aplicação React em arquivo único (Single-File Component) para auxiliar os escotistas a migrarem os dados do antigo sistema (Paxtu Legado) para o Novo Programa Educativo (Paxtu 100).

O código deve ser limpo, componentizado, utilizar ícones (lucide-react) e ter um visual moderno, responsivo e amigável (tons de azul, amarelo, verde e vermelho para alertas).

Aqui estão as ESPECIFICAÇÕES RIGOROSAS e REGRAS DE NEGÓCIO que o sistema deve implementar:

### 1. REGRAS DE PROGRESSÃO E EQUIVALÊNCIA
A nova progressão é baseada em 18 Blocos de Aprendizagem.
- **Pata-Tenra:** 0 a 3 blocos.
- **Saltador:** 4 a 7 blocos.
- **Rastreador:** 8 a 12 blocos.
- **Caçador:** 13 a 18 blocos.
*Regra de Não-Regressão:* Se a conversão matemática dos itens antigos para os novos blocos resultar em um distintivo inferior ao que o lobinho já tinha no sistema legado, o sistema deve acionar um alerta de "Plano de Acompanhamento". O distintivo legado é mantido (intencionalidade educativa), mas o lobo fica sinalizado.

### 2. REGRA DO CRUZEIRO DO SUL (Distintivo Máximo)
Não basta ter os 18 blocos. O sistema deve cobrar 3 pilares adicionais:
1. Reflexão (Autoavaliação).
2. Roca de Conselho (Validação coletiva).
3. Caminho do Caçador (Atividade outdoor específica de um dia).

### 3. CÁLCULO DE STATUS DO CAMINHO DA TROPA (Transição)
Crie uma função para calcular o status da transição da Alcateia para a Tropa. As regras matemáticas são:
- **Idade Alvo:** Inicia aos 9,5 anos. Limite crítico aos 10,5 anos. Menores que 9,5 recebem status "Aguardando Idade".
- **Composição da Nota (0 a 100%):**
  - **Pontes (Visitas à Tropa):** Vale 40% (O ideal são 4 visitas, logo, cada visita vale 10%).
  - **Familiarização (Promessa/Lei):** Vale 30% (Booleano: fez ou não fez).
  - **Avaliação de Prontidão (Roca final):** Vale 30% (Booleano: fez ou não fez).
- **Status resultantes:**
  - `100%`: "Apto para Passagem" (Verde).
  - `> 0% e < 100%`: "Em Transição" (Azul).
  - `0%` (após 9,5 anos): "Não Iniciado - Atenção" (Amarelo).
  - Idade `>= 10.5` e percentual `< 100%`: "Atrasado - Passagem Imediata" (Vermelho crítico).

### 4. TELAS E VISÕES EXIGIDAS
O Dashboard deve ter navegação por abas contendo:
- **Visão Geral:** KPIs de lobinhos ativos, total em plano de acompanhamento, total apto ao cruzeiro e lobinhos atrasados na passagem.
- **Painel de Equivalência:** Tabela comparando o legado com o novo. Mostrar visualmente a barra de progresso dos 18 blocos e um botão em cada linha com regressão para abrir a "Tela de Apontamento".
- **Cruzeiro do Sul:** Cards dos lobinhos elegíveis (Caçadores), mostrando um checklist visual dos 4 requisitos (18 blocos + os 3 pilares).
- **Caminho da Tropa:** Timeline ou cards mostrando a idade atual, a barra de progresso (0-100% calculada na regra 3) e o status das pontes e aprovações.

### 5. TELA DE APONTAMENTO (Modal de Interação)
Crie um Componente Modal de Apontamento. Ele deve simular a interface onde o Escotista fará "De-Para" da equivalência. 
- Deve ter abas ou seções para: "Ações Educativas Fixas" (checkboxes simulando itens de saúde, segurança) e "Ações Educativas Variáveis" (inputs numéricos para especialidades e atividades de seção).
- Deve exibir no cabeçalho o nome do lobinho e o distintivo que ele corre o risco de perder (foco na recuperação).

### 6. AGENTE DE IA EMBARCADO (Assistente "Akela")
Implemente um componente de chat flutuante no canto da tela (estilo widget de suporte).
- **Role-Person:** O bot deve se apresentar como "Akela IA - Especialista no Programa Educativo Atualizado". O tom deve ser escoteiro ("Melhor Possível, Escotista!").
- **Gatilho de Validação Guiada:** O `useEffect` do componente deve ler os Mocks. Se detectar lobinhos com regressão de distintivo ou estourando a idade de 10.5 anos, a Akela deve mandar uma mensagem automática (ex: *"Atenção! Identifiquei 2 lobinhos necessitando de Plano de Acompanhamento e 1 atrasado na Tropa. Vamos revisar os apontamentos do Joãozinho?"*).

### 7. DADOS MOCKADOS
Gere um array `MOCK_LOBINHOS` rico, com pelo menos 8 crianças em estados variados (alguns certinhos, alguns com regressão, alguns estourando a idade da tropa, e pelo menos um pronto para o Cruzeiro do Sul) para que todas as regras de negócio possam ser visualizadas imediatamente.

Gere todo o código React em um único bloco, garantindo que seja "runnable" e "copy-pasteable".