import express from "express";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Groq Client Lazy Initialization
let groq: Groq | null = null;
function getGroq() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

// Google Gen AI Lazy Initialization
let aiImage: GoogleGenAI | null = null;
function getAiImage() {
  if (!aiImage) {
    const apiKey = process.env.VITE_GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    aiImage = new GoogleGenAI({ apiKey });
  }
  return aiImage;
}

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, hasImages, useWebSearch } = req.body;
    
    const groqClient = getGroq();
    
    const systemPrompt = `Você é um sistema de inteligência focado em lógica, eficiência e clareza, mas com um tom amigável e humano.

### DIRETRIZES DE PERSONALIDADE:
1. **Sem Encheção:** Não confirme que entendeu, não peça desculpas, não use transições inúteis ("Entendo que...", "Aqui está"). Exceto: seja caloroso e conversativo em interações casuais.
2. **Nível Intelectual Adaptativo:** Responda no nível da pergunta. "Oi?" → resposta amigável e receptiva. Pergunta técnica complexa → profundidade especializada.
3. **Senso Crítico:** Corrija premissas erradas do usuário de forma direta e educada.
4. **Comunicação Expressiva:** Seja conciso, mas não robótico. Use emojis (👋, 💡, 🚀) naturalmente para dar vida à conversa e torná-la mais leve. Use **negrito** e listas para estruturar a leitura.
5. **Opinião Fundamentada:** Se há solução melhor, sugira. Não fique em cima do muro.

### COMPORTAMENTO POR CONTEXTO:
- **Conversas triviais** ("Oi", "Como vai?"): Responda de forma calorosa, conversativa e use emojis. Mostre entusiasmo em ajudar!
- **Dúvidas técnicas**: Profundidade máxima, mas mantendo a clareza. Código sem comentários óbvios.
- **Análises**: Mostre apenas a conclusão. Raciocínio acontece internamente.
- **Importante destacar**: Use negrito (**assim**), não HTML.

### RESTRIÇÕES DE OUTPUT:
- PROIBIDO: "Entendido", "Sistema Ativado", "Vou começar agora", frases sobre seu próprio comportamento.
- PROIBIDO: Apresentações tipo "Bem-vindo ao meu espaço".
- AÇÃO: Primeira palavra = conteúdo da resposta. Sempre.
- USE: Markdown. Seja estruturado mas natural.

### REGRA DE OURO:
Responda como um especialista conversando com um colega competente. Sem formalidade desnecessária, sem floreios, sem sobre-explicações.

### CONTEXTO DE SAÍDA:
- Se a resposta é em texto puro: use **negrito** e markdown.
- Para informações MUITO importantes que devem ser "grifadas" (highlight), use a tag HTML <mark>texto aqui</mark>. Isso criará um fundo azul claro no texto, destacando-o.

### ARTIFACTS (INFOGRÁFICOS E RESUMOS VISUAIS) - REGRA ABSOLUTA:
- A decisão de gerar um Artifact é tomada pelo classificador. Siga a INSTRUÇÃO CRÍTICA DO CLASSIFICADOR no final deste prompt.
- REGRAS DO ARTIFACT (SE PERMITIDO):
  1. O prompt do Artifact DEVE ficar EXCLUSIVAMENTE dentro das tags <artifact> e </artifact>.
  2. NUNCA escreva instruções de design, gráficos ou mapas mentais em texto puro. O usuário NÃO DEVE LER as instruções que você está passando para o gerador de código.
  3. Coloque a tag <artifact> no FINAL da sua resposta, após todo o texto que o usuário vai ler.
  
EXEMPLO DE ERRO (PROIBIDO - ISSO QUEBRA O SISTEMA):
A filosofia tem vários ramos.
Desenhe um mapa mental com Sócrates e Ética.

EXEMPLO CORRETO (OBRIGATÓRIO):
A filosofia tem vários ramos.
<artifact>Desenhe um mapa mental com Sócrates e Ética.</artifact>`;

    const selectedModel = hasImages ? "llama-3.2-11b-vision-preview" : (model || "llama-3.1-8b-instant");
    const supportsTools = !hasImages;

    let currentMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === "user";
    const userText = typeof lastMessage?.content === "string" ? lastMessage.content : "";

    let shouldSearch = false;

    if (isUserMessage && userText && supportsTools) {
      res.write(`data: ${JSON.stringify({ type: 'classifier_start' })}\n\n`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const classifierRes = await groqClient.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `Você é um classificador de intenções. Sua tarefa é analisar a pergunta do usuário e responder APENAS com as palavras permitidas.
Vocabulário permitido:
- "SIM": se a pergunta requer informações atuais, em tempo real ou que possam ter mudado (notícias, preços, eventos atuais).
- "NÃO": se a pergunta pode ser respondida com conhecimento geral, conceitos, explicações, etc.
- "CLIMA: [Nome da Cidade]": se o usuário estiver perguntando sobre o clima ou previsão do tempo de uma cidade específica.
- "GERAL": se o usuário pedir um resumo complexo, mapa mental, linha do tempo, tabela comparativa, ou algo que se beneficie MUITO de uma visualização estruturada e colorida (Artifact interativo).
- "GRÁFICO_LINHAS": se o usuário pedir um gráfico de linhas.
- "GRÁFICO_VERTICAL": se o usuário pedir um gráfico de barras verticais.
- "GRÁFICO_PIZZA": se o usuário pedir um gráfico de pizza.
- "GRÁFICO_HORIZONTAL": se o usuário pedir um gráfico de barras horizontais.
- "GRÁFICO_ROSCA": se o usuário pedir um gráfico de rosca (doughnut).

Regras de Combinação:
- Você pode combinar "SIM" ou "NÃO" com "CLIMA", "GERAL" ou "GRÁFICO_[TIPO]" separando por vírgula.
- NUNCA combine "CLIMA", "GERAL" e "GRÁFICO_[TIPO]" na mesma resposta. Escolha apenas um deles (ou nenhum).

Exemplos:
"Qual o clima em Campinas?" -> NÃO, CLIMA: Campinas
"Crie um mapa mental sobre a Segunda Guerra Mundial" -> NÃO, GERAL
"Quais as últimas notícias sobre IA? Faça um resumo visual" -> SIM, GERAL
"Me mostre um gráfico de pizza com os maiores países do mundo" -> NÃO, GRÁFICO_PIZZA
"Notícias de hoje e faça um gráfico de linhas das ações da Apple" -> SIM, GRÁFICO_LINHAS

IMPORTANTE: Responda APENAS usando o vocabulário permitido. Nada mais.`
            },
            { role: "user", content: userText }
          ],
          temperature: 0,
          max_tokens: 20,
        }, { signal: controller.signal } as any);

        clearTimeout(timeoutId);

        const answer = classifierRes.choices[0]?.message?.content?.trim().toUpperCase() || "NÃO";
        
        if (answer.includes("SIM")) {
          shouldSearch = true;
        }
        
        const climaMatch = answer.match(/CLIMA:\s*([^,]+)/i);
        if (climaMatch) {
          const city = climaMatch[1].trim();
          res.write(`data: ${JSON.stringify({ type: 'weather_start', city })}\n\n`);
        }

        const graficoMatch = answer.match(/GRÁFICO_([A-Z]+)/i);
        
        if (graficoMatch && !climaMatch) {
          const tipo = graficoMatch[1].toUpperCase();
          const templates: Record<string, string> = {
            LINHAS: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 600px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="lineChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('lineChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'line',\n            data: {\n                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], // Eixo X (Editável)\n                datasets: [{\n                    label: 'Vendas da Semana (Exemplo)', // Nome da série (Editável)\n                    data: [12, 19, 15, 25, 22, 30, 28], // Valores (Editável)\n                    borderColor: '#3b82f6',\n                    backgroundColor: 'rgba(59, 130, 246, 0.1)',\n                    fill: true,\n                    tension: 0.4\n                }]\n            },\n            options: { responsive: true, plugins: { legend: { display: true } } }\n        });\n    </script>\n</body>\n</html>`,
            VERTICAL: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 600px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="barChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('barChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'bar',\n            data: {\n                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'], \n                datasets: [{\n                    label: 'Novos Usuários',\n                    data: [400, 650, 590, 800, 950],\n                    backgroundColor: '#10b981',\n                    borderRadius: 8\n                }]\n            },\n            options: { responsive: true, scales: { y: { beginAtZero: true } } }\n        });\n    </script>\n</body>\n</html>`,
            PIZZA: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 400px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="pieChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('pieChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'pie',\n            data: {\n                labels: ['Eletrônicos', 'Moda', 'Alimentos'],\n                datasets: [{\n                    data: [45, 25, 30],\n                    backgroundColor: ['#6366f1', '#f43f5e', '#f59e0b']\n                }]\n            },\n            options: { plugins: { legend: { position: 'bottom' } } }\n        });\n    </script>\n</body>\n</html>`,
            HORIZONTAL: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 600px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="horizBarChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('horizBarChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'bar',\n            data: {\n                labels: ['Produto A', 'Produto B', 'Produto C', 'Produto D'],\n                datasets: [{\n                    label: 'Estoque Atual',\n                    data: [120, 190, 30, 85],\n                    backgroundColor: '#8b5cf6',\n                    borderRadius: 5\n                }]\n            },\n            options: { indexAxis: 'y', responsive: true }\n        });\n    </script>\n</body>\n</html>`,
            ROSCA: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 400px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="doughnutChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('doughnutChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'doughnut',\n            data: {\n                labels: ['Concluído', 'Em Andamento', 'Pendente'],\n                datasets: [{\n                    data: [70, 20, 10],\n                    backgroundColor: ['#22c55e', '#3b82f6', '#e2e8f0'],\n                    borderWidth: 0,\n                    hoverOffset: 10\n                }]\n            },\n            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }\n        });\n    </script>\n</body>\n</html>`
          };
          const template = templates[tipo] || templates.LINHAS;
          currentMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ DEVE GERAR UM GRÁFICO DO TIPO ${tipo}. É OBRIGATÓRIO incluir o gráfico em qualquer lugar da sua resposta (no início, no meio ou no final) usando um bloco de código markdown com a linguagem "html_chart". Você DEVE usar o seguinte template HTML base, mas alterando APENAS os dados (labels e data) e os textos para refletir a sua resposta. NÃO altere a estrutura do HTML ou CSS.\n\nTemplate a ser usado dentro do bloco \`\`\`html_chart\n${template}\n\`\`\``;
        } else if (answer.includes("GERAL") && !climaMatch) {
          currentMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ DEVE GERAR UM ARTIFACT (GERAL) para esta resposta. É OBRIGATÓRIO incluir a tag <artifact> no final da sua resposta com o prompt para o gerador visual.`;
        } else {
          currentMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ NÃO DEVE GERAR UM ARTIFACT para esta resposta. É PROIBIDO usar a tag <artifact> ou blocos de código html_chart nesta resposta. Apenas responda em texto.`;
        }
      } catch (err) {
        console.error("Classifier error or timeout:", err);
      }
    }

    if (shouldSearch) {
      res.write(`data: ${JSON.stringify({ type: 'search_start', query: userText })}\n\n`);
      try {
        const tavilyApiKey = process.env.TAVILY_API_KEY;
        if (!tavilyApiKey) throw new Error("TAVILY_API_KEY is not set");

        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyApiKey,
            query: userText,
            search_depth: "basic",
            max_results: 10,
            include_images: true,
            include_image_descriptions: true,
            include_answer: true,
            follow_up_questions: true,
            include_usage: true,
            include_domains: [
              "wikipedia.org", "bbc.com", "cnn.com", "nytimes.com", "reuters.com", 
              "bloomberg.com", "forbes.com", "techcrunch.com", "theverge.com", "wired.com", 
              "nature.com", "science.org", "gov.br", "edu.br", "globo.com", "uol.com.br", 
              "estadao.com.br", "folha.uol.com.br", "cnnbrasil.com.br", "g1.globo.com",
              "agenciabrasil.ebc.com.br", "exame.com", "valor.globo.com", "infomoney.com.br"
            ]
          })
        });

        if (tavilyRes.ok) {
          const tavilyData = await tavilyRes.json();
          const sources = tavilyData.results || [];
          const searchImages = tavilyData.images || [];
          const searchFollowUps = tavilyData.follow_up_questions || [];
          const searchAnswer = tavilyData.answer || "";
          
          res.write(`data: ${JSON.stringify({ 
            type: 'search_complete', 
            query: userText, 
            sources, 
            images: searchImages,
            followUpQuestions: searchFollowUps,
            searchAnswer
          })}\n\n`);

          const searchContext = `\n\n### RESULTADOS DA BUSCA NA WEB (Contexto Atualizado - Data Atual: ${new Date().toLocaleDateString('pt-BR')}):\n${sources.slice(0, 5).map((s: any, index: number) => `Fonte: ${s.title}\nURL: ${s.url}\nConteúdo: ${s.content}`).join("\n\n")}\n\nResposta Resumida da Busca: ${searchAnswer}\n\nUse as informações acima para responder à pergunta do usuário de forma natural. Não adicione seções de "Fontes" ou "Referências" no final, apenas incorpore a informação na sua resposta.`;
          
          currentMessages[currentMessages.length - 1].content += searchContext;
        } else {
          res.write(`data: ${JSON.stringify({ type: 'search_complete', query: userText, sources: [] })}\n\n`);
        }
      } catch (err) {
        console.error("Tavily Search Error:", err);
        res.write(`data: ${JSON.stringify({ type: 'search_complete', query: userText, sources: [] })}\n\n`);
      }
    }

    // No tool calls, just stream the response
    const stream = await groqClient.chat.completions.create({
      messages: currentMessages,
      model: selectedModel,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Groq API Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal Server Error" });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    let imageUrl = "";
    
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const safePrompt = encodeURIComponent(prompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
      
      const pollRes = await fetch(pollinationsUrl);
      if (!pollRes.ok) throw new Error("Pollinations API failed");
      
      const arrayBuffer = await pollRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      imageUrl = `data:image/jpeg;base64,${base64}`;
    } catch (pollError: any) {
      console.error("Pollinations generation failed:", pollError);
      throw new Error("Não foi possível gerar a imagem no momento. Tente novamente mais tarde.");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Image Gen Fatal Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/generate-artifact", async (req, res) => {
  try {
    const { prompt } = req.body;
    const ai = getAiImage();
    
    const systemPrompt = `Você é um Engenheiro Front-end Sênior e Expert em UI/UX, especializado em visualização de dados e materiais educacionais.
Sua tarefa é criar infográficos, mapas mentais, linhas do tempo, dashboards ou resumos visuais ricos e detalhados em HTML puro com Tailwind CSS.

DIRETRIZES DE DESIGN E CRIATIVIDADE (CRÍTICO):
1. FUJA DO BÁSICO: Use layouts avançados como Bento Grids, layouts em alvenaria (masonry), grids complexos, e sobreposição de elementos.
2. ESTILIZAÇÃO PREMIUM: Use sombras complexas (shadow-lg, shadow-xl), gradientes sutis (bg-gradient-to-br from-slate-50 to-slate-100), bordas bem arredondadas (rounded-2xl, rounded-3xl), e efeitos de hover.
3. GRÁFICOS VISUAIS REAIS: Crie gráficos de barras simples, linhas do tempo estruturadas e tabelas estilizadas. **PROIBIDO tentar desenhar mapas geográficos, ilustrações complexas ou grafos de nós usando formas CSS (divs sobrepostas, position absolute, etc). Isso sempre quebra o layout.** Para ilustrações, cenários ou mapas, USE APENAS a tag <img> com a Pollinations AI. Não use apenas texto para dados.
   - **REGRA PARA LINHAS DO TEMPO (TIMELINES):** Se você criar uma linha do tempo vertical com uma linha central, você DEVE alternar os cards: um card na esquerda, o próximo na direita, o próximo na esquerda, etc. NUNCA coloque todos os cards de um lado só deixando o outro vazio. Use classes do Tailwind como \`flex-row-reverse\` ou larguras específicas (\`w-1/2\`, \`ml-auto\`, \`mr-auto\`) para garantir a alternância correta.
4. TIPOGRAFIA E HIERARQUIA: Títulos impactantes (text-2xl font-extrabold text-slate-800), subtítulos elegantes (text-base font-medium text-slate-500). **Atenção: Use tamanhos de fonte menores para o corpo do texto (text-sm ou text-xs) para caber mais informações de forma elegante.**
5. IMAGENS GERADAS POR IA: Enriqueça o design com imagens geradas dinamicamente. Use a tag <img> com URLs da Pollinations AI no formato: \`https://image.pollinations.ai/prompt/{descricao_detalhada_da_imagem_em_ingles}?width=800&height=600&nologo=true&seed={NUMERO_ALEATORIO}\`. 
   - **REGRA DE OURO PARA A URL:** A \`{descricao_detalhada_da_imagem_em_ingles}\` DEVE estar 100% em INGLÊS, SEM acentos, SEM cedilha e SEM caracteres especiais. 
   - **PROIBIDO ESPAÇOS E CARACTERES ESPECIAIS:** A URL no atributo \`src\` NÃO PODE TER NENHUM ESPAÇO EM BRANCO. Você DEVE substituir TODOS os espaços por \`%20\`. Além disso, substitua vírgulas por \`%2C\` e aspas por \`%22\`. Se houver um espaço ou caractere não codificado na URL, a imagem vai quebrar.
   - **MUITO IMPORTANTE (PREVENÇÃO DE CACHE):** Se houver mais de uma imagem no mesmo Artifact, você DEVE gerar um número aleatório de 4 a 6 dígitos DIFERENTE para cada imagem e colocá-lo no parâmetro \`&seed=\`. 
   - Exemplo Correto:
     - \`<img src="https://image.pollinations.ai/prompt/ancient%20greek%20philosopher%20thinking?width=800&height=600&nologo=true&seed=4829" alt="Filósofo Grego" referrerpolicy="no-referrer" crossorigin="anonymous" class="w-full h-48 object-cover rounded-t-xl" />\`
     - \`<img src="https://image.pollinations.ai/prompt/abstract%20logic%20gears%20and%20brain?width=800&height=600&nologo=true&seed=9173" alt="Engrenagens da Lógica" referrerpolicy="no-referrer" crossorigin="anonymous" class="w-full h-48 object-cover rounded-t-xl" />\`
   - **NUNCA** use o mesmo seed para imagens diferentes. **NUNCA** use a string literal "{numero_aleatorio}", você deve gerar o número.
   - **CRÍTICO:** Você DEVE adicionar o atributo \`referrerpolicy="no-referrer"\` e \`crossorigin="anonymous"\` em TODAS as tags <img>, senão as imagens não vão carregar no iframe.
   - NUNCA use picsum, wikimedia ou unsplash.
6. ÍCONES: Incorpore SVGs inline (estilo Lucide ou Heroicons) para ilustrar os tópicos.

DIRETRIZES DE CONTEÚDO (CRÍTICO):
1. PROFUNDIDADE: O conteúdo deve ser rico, educacional e aprofundado. Explique os conceitos de forma detalhada, com exemplos práticos.
2. ESTRUTURA: Divida a informação em seções claras (Cabeçalho, Corpo com visualizações, Rodapé).
3. ZERO GENÉRICO: Entregue valor real no conteúdo gerado.

REGRAS TÉCNICAS:
- Retorne APENAS o código HTML válido.
- NÃO use markdown (\`\`\`html). NÃO inclua as tags \`<html>\`, \`<head>\` ou \`<body>\`.
- O container principal deve ser algo como: \`<div class="w-full max-w-5xl mx-auto p-6 bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">\`.
- Use apenas classes utilitárias do Tailwind CSS.`;

    let htmlContent = "";
    let lastError: any = null;

    try {
      console.log("Gerando artifact: Tentando gemini-2.5-flash...");
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
        }
      });
      htmlContent = response.text;
    } catch (e1: any) {
      console.warn("gemini-2.5-flash falhou:", e1.message);
      try {
        console.log("Gerando artifact: Tentando gemini-2.5-flash-lite...");
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.5,
          }
        });
        htmlContent = response.text;
      } catch (e2: any) {
        console.warn("gemini-2.5-flash-lite falhou:", e2.message);
        try {
          console.log("Gerando artifact: Tentando llama-3.3-70b-versatile (Groq)...");
          const groqClient = getGroq();
          const completion = await groqClient.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
          });
          htmlContent = completion.choices[0]?.message?.content || "";
        } catch (e3: any) {
          console.error("Todos os modelos de fallback falharam:", e3.message);
          lastError = e3;
        }
      }
    }

    if (htmlContent) {
      res.json({ htmlContent });
    } else {
      let errorMessage = "Internal Server Error";
      try {
        const parsed = JSON.parse(lastError.message);
        errorMessage = parsed.error?.message || lastError.message;
      } catch (e) {
        errorMessage = lastError?.message || "Erro desconhecido ao gerar artifact.";
      }
      res.status(500).json({ error: errorMessage });
    }
  } catch (error: any) {
    console.error("Artifact Gen Fatal Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export default app;
