import express from "express";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

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
let lastImageService = "Nenhum";

// ... [existing app setup] ...

app.get('/api/unsplash', async (req, res) => {
  try {
    const q = req.query.q || 'abstract';
    const apiKey = process.env.VITE_UNSPLASH_API_KEY || process.env.UNSPLASH_API_KEY;

    if (!apiKey) {
      lastImageService = "Pollinations (Fallback)";
      return res.redirect(`https://image.pollinations.ai/prompt/${encodeURIComponent(q as string)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`);
    }

    const unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(q as string)}&client_id=${apiKey}`);
    if (unsplashRes.ok) {
      const data = await unsplashRes.json();
      if (data && data.urls && data.urls.regular) {
        lastImageService = "Unsplash";
        return res.redirect(data.urls.regular);
      }
    }
    
    lastImageService = "Pollinations (Fallback - Unsplash Fail)";
    res.redirect(`https://image.pollinations.ai/prompt/${encodeURIComponent(q as string)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`);
  } catch (e) {
    lastImageService = "Pollinations (Fallback - Internal Error)";
    res.redirect(`https://image.pollinations.ai/prompt/${encodeURIComponent(req.query.q as string || 'abstract')}?width=800&height=600&nologo=true`);
  }
});

app.get('/api/image-service', (req, res) => {
  res.json({ service: lastImageService });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, hasImages, useWebSearch, images } = req.body;
    
    let openRouterClient: Groq | null = null;
    if (model === "nvidia/nemotron-3-super-120b-a12b:free") {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set in environment variables");
      }
      openRouterClient = new Groq({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" });
    }

    const groqClient = getGroq();
    
    const imageList = images || [];
    // Check history for images too to ensure model consistency
    const historyHasImages = messages.some((m: any) => 
      (Array.isArray(m.content) && m.content.some((part: any) => part.type === "image_url")) ||
      (m.images && m.images.length > 0)
    );
    const containsImages = imageList.length > 0 || hasImages || historyHasImages;

    let clientToUse = groqClient;
    if (model === "nvidia/nemotron-3-super-120b-a12b:free") {
      clientToUse = openRouterClient!;
    }

    const selectedModel = model === "nvidia/nemotron-3-super-120b-a12b:free" ? model : (containsImages ? "gemma-3-12b-it" : (model || "llama-3.1-8b-instant"));
    const supportsTools = !containsImages && selectedModel !== "nvidia/nemotron-3-super-120b-a12b:free"; 

    const systemPrompt = `Você é a **Milly AI 1.1 Gold**, um sistema de inteligência de elite focado em lógica, eficiência e clareza, mas com um tom amigável, moderno e humano.

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

### ARTIFACTS INTERATIVOS DE SIMULAÇÃO (html_slider) - REGRA ABSOLUTA:
- Você POSSUI o poder de injetar "Simulações Interativas" no meio da sua resposta quando achar ÚTIL mostrar uma variável mudando e suas consequências em tempo real.
- Diferente de outros artifacts dependentes do classificador, ESTE VOCÊ MESMO DECIDE SE QUER USAR e quantos quer usar (pode ser mais de 1 por resposta).
- OBRIGATÓRIO: Ao lado ou acima do Slider, mostre claramente o VALOR ATUAL (o número exato) da variável controlada, atualizando em tempo real. O usuário precisa ver o número atual do lado/cima do controle mudando enquanto arrasta.
- Além do destaque do número, atualize: um texto explicativo das consequências, e um snippet de código/exemplo prático refletindo a alteração.
- ATENÇÃO MÁXIMA À PRECISÃO CIENTÍFICA E MATEMÁTICA: Se a simulação envolver cálculos (ex: física, matemática, finanças), você DEVE usar as fórmulas reais e precisas no código JavaScript. Exemplo: cálculo de distância de frenagem deve usar a equação correta de Torricelli considerando tempo de reação e atrito (d = v*t + v²/(2*u*g)), convertendo km/h para m/s. Nunca invente dados ou proporções falsas/lineares quando a relação for exponencial/quadrática.
- Use APENAS HTML, CSS e JS puro.
- Englobe o seu código do artifact DENTRO de um bloco de código markdown com a linguagem "html_slider". IMPORTANTE: USE SEMPRE \`\`\`html_slider e feche com \`\`\`. NAO USE as tags <controle>! Apenas o markdow \`\`\`html_slider.
Exemplo prático de estrutura que funciona e é bonita:
\`\`\`html_slider
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; }
        .container { max-width: 100%; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .label { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: block; color: #333; }
        .value { font-size: 24px; font-weight: 700; color: #0969da; margin-bottom: 20px; font-family: monospace; }
        input[type="range"] { width: 100%; height: 8px; border-radius: 5px; background: linear-gradient(to right, #0969da, #1f6feb); outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: white; border: 3px solid #0969da; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        .consequencia { margin-top: 20px; padding: 15px; background: #f8f9fa; border-left: 4px solid #0969da; border-radius: 4px; font-size: 14px; color: #444; }
        .codigo { margin-top: 15px; background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; font-size: 13px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <label class="label" style="margin: 0;">Velocidade do Carro</label>
        <div class="value" style="font-size: 24px; font-weight: bold; color: #0969da;"><span id="display-num">80</span> <span style="font-size: 16px; color: #666;">km/h</span></div>
    </div>
    <input type="range" id="slider" min="10" max="200" step="1" value="80" oninput="updateValue(this.value)">
    <div class="consequencia" id="consequencia">A distância de frenagem aumenta.</div>
    <div class="codigo" id="codigo">distancia = calcular(80)</div>
</div>
<script>
    function updateValue(val) {
        document.getElementById('display-num').textContent = val;
        
        // Conversão para metros por segundo (m/s)
        const velocidadeMs = val / 3.6;
        
        // Distância de reação (1 segundo de tempo de reação)
        const tempoReacao = 1.0;
        const distReacao = velocidadeMs * tempoReacao;
        
        // Distância de frenagem (Física: d = v² / 2ug)
        // u = coeficiente de atrito (aprox 0.7 para asfalto seco)
        // g = gravidade (9.81 m/s²)
        const distFrenagem = (velocidadeMs * velocidadeMs) / (2 * 0.7 * 9.81);
        
        // Distância total
        const distTotal = distReacao + distFrenagem;
        
        document.getElementById('consequencia').textContent = "Distância total de parada: " + distTotal.toFixed(1) + " metros (Reação: " + distReacao.toFixed(1) + "m + Frenagem: " + distFrenagem.toFixed(1) + "m).";
        document.getElementById('codigo').innerHTML = "v_ms = " + val + " / 3.6<br/>d_parada = (v_ms * 1.0) + (v_ms**2 / (2 * 0.7 * 9.81))";
    }
</script>
</body>
</html>
\`\`\`

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

    const groqClientForClassifier = getGroq();
    
    let currentSystemPrompt = systemPrompt;

    if (containsImages) {
      currentSystemPrompt += `\n\n### AVISO IMPORTANTE (VISÃO - GEMMA 3):
Você está recebendo imagens anexadas. Ao analisar imagens com o modelo gemma-3-12b-it, você NÃO POSSUI a capacidade de gerar Artifacts (como gráficos, mapas, códigos interativos ou diagramas mermaid). Se o usuário solicitar a criação de algum desses elementos enquanto houver imagens anexadas, você deve gentilmente informar que não consegue gerar artefatos visuais ou códigos interativos quando está analisando imagens, e deve responder apenas em texto baseando-se no que vê.`;
    }

    let finalMessages: any[] = [];
    
    // Process messages and include images if it is the vision model
    if (containsImages && selectedModel === "gemma-3-12b-it") {
      finalMessages = [
        { role: "system", content: currentSystemPrompt },
        ...messages.map((m: any, idx: number) => {
          if (m.role === "user" && idx === messages.length - 1) {
            const contentParts: any[] = [{ type: "text", text: m.content || "Analise esta imagem." }];
            imageList.forEach((img: string) => {
              // Ensure we have only the base64 part if it's a data URL
              const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
              contentParts.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Data}` }
              });
            });
            return { role: "user", content: contentParts };
          }
          return m;
        })
      ];
    } else {
      finalMessages = [
        { role: "system", content: currentSystemPrompt },
        ...messages
      ];
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === "user";
    const userText = typeof lastMessage?.content === "string" ? lastMessage.content : "";

    let shouldSearch = false;

    let isEditorVisual = false;
    
    if (isUserMessage && userText && supportsTools) {
      res.write(`data: ${JSON.stringify({ type: 'classifier_start' })}\n\n`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const classifierRes = await groqClient.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `Você é um classificador de intenções extremamente inteligente. Sua tarefa é analisar a pergunta do usuário e responder APENAS com as palavras permitidas.

Vocabulário permitido:
- "SIM": Faça busca na web! Use "SIM" agressivamente. Se a pergunta depender de dados exatos, faturamento de empresas, números, atualizações, notícias, fatos do mundo real, comparações baseadas em dados ou se for necessário preencher um GRÁFICO, TIMELINE ou GERAL com COTAÇÕES reais, dados atuais ou NÚMEROS reais... RESPONDA "SIM". A pesquisa fará com que o artifact entregue resultados precisos de hoje.
- "NÃO": APENAS se a pergunta for puramente filosófica, teórica de base (fórmulas matemáticas), casual (Oi, tudo bem?) ou criativa/ficção, onde os dados de conhecimento geral da IA (treinamento até o momento atual) bastam.
- "CLIMA: [Nome da Cidade]": se o usuário estiver perguntando sobre o clima ou previsão do tempo de uma cidade específica.
- "MAPA: [Local corrigido para busca]": se o usuário pedir para ver um local no mapa, ver onde fica algo, localizar museus, restaurantes, cidades, ou passeios. VOCÊ DEVE corrigir e melhorar o termo para que a busca em serviços de mapas funcione bem (ex: "mapa da paulista" -> MAPA: Avenida Paulista, São Paulo).
- "MUSICA: [Termo exato de busca limpo]": se o usuário estiver perguntando sobre uma música específica, quem canta, ou pedir para ouvir/tocar uma música e seu preview. VOCÊ DEVE extrair APENAS o nome da música e, se mencionado, o artista. NÃO inclua palavras como "música", "ouvir", "toque". Ex: "toque a música ilusão de ótica" -> MUSICA: Ilusão de Ótica. Isso garante que a API da Deezer retorne resultados exatos.
- "TIMELINE": se o usuário pedir a história de algo, biografia de uma pessoa, evolução de uma empresa ou uma linha do tempo de eventos chronológicos.
- "EDITOR": se o usuário pedir um trecho de HTML, CSS, Javascript de UI, uma interface, ou falar para criar um design front-end no código com live editor.
- "MERMAID": se o usuário pedir para visualizar um processo, fluxograma, árvore de decisão, jornada do usuário, diagrama de sequência ou mapa mental em formato de gráfico. Use para fluxo passo-a-passo.
- "GERAL": USE PARA EDUCAÇÃO, ESTUDO E ENTENDIMENTO. Se o usuário pedir um resumo de estudos, não entender uma matéria, pedir uma "analogia visual", ou explicação de um sistema complexo (que não seja um diagrama/fluxo).
- "GRÁFICO_LINHAS": se o usuário pedir um gráfico ou for ideal mostrar evolução no tempo/tendências.
- "GRÁFICO_VERTICAL": se o usuário pedir um gráfico ou for ideal comparar categorias (barras em pé).
- "GRÁFICO_PIZZA": se o usuário pedir um gráfico ou for ideal mostrar divisões de um todo.
- "GRÁFICO_HORIZONTAL": se o usuário pedir um gráfico ou for ideal comparar itens (barras deitadas).
- "GRÁFICO_ROSCA": se o usuário pedir um gráfico ou for ideal mostrar divisões (doughnut).

PRIORIDADES E REGRAS:
1. Gráficos (GRÁFICO_[TIPO]) devem ser usados para DADOS.
2. Mapas (MAPA: [Local]) para LOCALIZAÇÃO GEOGRÁFICA.
3. Músicas (MUSICA: [Nome]) para ÁUDIO/ARTISTAS/MÚSICAS.
4. Códigos Visuais (EDITOR) para pedidos de layout, HTML, CSS, front-end visual.
5. Linhas do Tempo (TIMELINE) para HISTÓRIA e CRONOLOGIAS (anos, meses, biografias).
6. Fluxogramas (MERMAID) para processos corporativos ou algoritmos.
7. O Artifact (GERAL) deve ser a ÚLTIMA OPÇÃO visual, destinado apenas a infográficos puramente didáticos abundantes em texto.
8. Se gerar um artefato com base no mundo atual, acople com o "SIM". Ex: "História da Apple" -> "SIM, TIMELINE".
9. NUNCA misture dois tipos de visuais maiores.

Exemplos de raciocínio:
"Quem canta a música houdini?" -> NÃO, MUSICA: Houdini - Dua Lipa
"Faz um botão de login vermelho" -> NÃO, EDITOR
"Mostra a história do Brasil" -> SIM, TIMELINE
"Onde fica o coliseu?" -> NÃO, MAPA: Coliseu, Roma
"Como é o funil de vendas?" -> NÃO, MERMAID
"Faz um mapa mental sobre biologia" -> NÃO, MERMAID
"Comparativo de PIB Brasil vs EUA" -> SIM, GRÁFICO_VERTICAL
"Notícias de IA hoje e um resumo disso" -> SIM, GERAL
"Como tá o tempo no Rio?" -> NÃO, CLIMA: Rio de Janeiro

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

        const mapaMatch = answer.match(/MAPA:\s*([^,\n]+)/i);
        if (mapaMatch) {
          const location = mapaMatch[1].trim();
          res.write(`data: ${JSON.stringify({ type: 'map_start', location })}\n\n`);
        }

        const musicaMatch = answer.match(/^MUSICA:\s*([^,\n]+)/i);
        if (musicaMatch) {
          const query = musicaMatch[1].trim();
          res.write(`data: ${JSON.stringify({ type: 'music_start', query })}\n\n`);
        }
        
        const mermaidMatch = answer.match(/MERMAID/i);
        const timelineMatch = answer.match(/TIMELINE/i);
        const editorMatch = answer.match(/EDITOR/i);

        const graficoMatch = answer.match(/GRÁFICO_([A-Z]+)/i);
        
        if (graficoMatch && !climaMatch && !mapaMatch && !mermaidMatch && !timelineMatch && !editorMatch) {
          const tipo = graficoMatch[1].toUpperCase();
          const templates: Record<string, string> = {
            LINHAS: `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }
        .chart-container { width: 100%; max-width: 600px; padding: 20px; }
    </style>
</head>
<body>
    <div class="chart-container">
        <canvas id="lineChart"></canvas>
    </div>
    <script>
        const ctx = document.getElementById('lineChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan 2026', 'Fev 2026', 'Mar 2026', 'Abr 2026', 'Mai 2026', 'Jun 2026', 'Jul 2026'], // Eixo X (Editável)
                datasets: [{
                    label: 'Crescimento de Usuários (Milly AI)', // Nome da série (Editável)
                    data: [120, 190, 150, 250, 320, 410, 480], // Valores (Editável)
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: true } } }
        });
    </script>
</body>
</html>`,
            VERTICAL: `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }
        .chart-container { width: 100%; max-width: 600px; padding: 20px; }
    </style>
</head>
<body>
    <div class="chart-container">
        <canvas id="barChart"></canvas>
    </div>
    <script>
        const ctx = document.getElementById('barChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Milly AI 1.1', 'GPT-4o', 'Claude 3.5', 'Gemini 1.5 Pro', 'Llama 3.1'], 
                datasets: [{
                    label: 'Velocidade de Resposta (tokens/s)',
                    data: [95, 80, 75, 88, 70],
                    backgroundColor: '#10b981',
                    borderRadius: 8
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    </script>
</body>
</html>`,
            PIZZA: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 400px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="pieChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('pieChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'pie',\n            data: {\n                labels: ['Eletrônicos', 'Moda', 'Alimentos'],\n                datasets: [{\n                    data: [45, 25, 30],\n                    backgroundColor: ['#6366f1', '#f43f5e', '#f59e0b']\n                }]\n            },\n            options: { plugins: { legend: { position: 'bottom' } } }\n        });\n    </script>\n</body>\n</html>`,
            HORIZONTAL: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 600px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="horizBarChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('horizBarChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'bar',\n            data: {\n                labels: ['Produto A', 'Produto B', 'Produto C', 'Produto D'],\n                datasets: [{\n                    label: 'Estoque Atual',\n                    data: [120, 190, 30, 85],\n                    backgroundColor: '#8b5cf6',\n                    borderRadius: 5\n                }]\n            },\n            options: { indexAxis: 'y', responsive: true }\n        });\n    </script>\n</body>\n</html>`,
            ROSCA: `<!DOCTYPE html>\n<html>\n<head>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">\n    <style>\n        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: transparent; margin: 0; }\n        .chart-container { width: 100%; max-width: 400px; padding: 20px; }\n    </style>\n</head>\n<body>\n    <div class="chart-container">\n        <canvas id="doughnutChart"></canvas>\n    </div>\n    <script>\n        const ctx = document.getElementById('doughnutChart').getContext('2d');\n        new Chart(ctx, {\n            type: 'doughnut',\n            data: {\n                labels: ['Concluído', 'Em Andamento', 'Pendente'],\n                datasets: [{\n                    data: [70, 20, 10],\n                    backgroundColor: ['#22c55e', '#3b82f6', '#e2e8f0'],\n                    borderWidth: 0,\n                    hoverOffset: 10\n                }]\n            },\n            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }\n        });\n    </script>\n</body>\n</html>`
          };
          const template = templates[tipo] || templates.LINHAS;
          finalMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ DEVE GERAR UM GRÁFICO DO TIPO ${tipo}. É OBRIGATÓRIO incluir o gráfico em qualquer lugar da sua resposta usando um bloco de código markdown com a linguagem "html_chart". Você DEVE usar o template HTML base abaixo, mas alterando APENAS os dados (labels e data) e os textos para refletir a sua resposta. USE OS DADOS DA BUSCA NA WEB (se existirem nos resultados de busca abaixo) para colocar valores REAIS E PRECISOS no gráfico.\n\nTemplate a ser usado dentro do bloco \`\`\`html_chart\n${template}\n\`\`\``;
        } else if (timelineMatch && !climaMatch && !mapaMatch && !mermaidMatch && !editorMatch) {
          const timelineTemplate = `<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n    <meta charset="UTF-8">\n    <style>\n        body { margin: 0; padding: 20px 0; font-family: 'Inter', sans-serif; background: transparent; }\n        .timeline { position: relative; max-width: 800px; margin: 0 auto; }\n        .timeline::after { content: ''; position: absolute; width: 4px; background: #e2e8f0; top: 0; bottom: 0; left: 50%; margin-left: -2px; border-radius: 2px; }\n        .container { padding: 10px 40px; position: relative; background-color: inherit; width: 50%; box-sizing: border-box; }\n        .left { left: 0; }\n        .right { left: 50%; }\n        .container::after { content: ''; position: absolute; width: 16px; height: 16px; right: -10px; background-color: white; border: 4px solid #3b82f6; top: 15px; border-radius: 50%; z-index: 1; }\n        .right::after { left: -10px; }\n        .content { padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; position: relative; }\n        .date { color: #3b82f6; font-weight: bold; font-size: 14px; margin-bottom: 8px; }\n        .title { font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 8px; margin-top: 0; }\n        .desc { color: #475569; font-size: 14px; line-height: 1.5; margin: 0; }\n        .img-container { width: 100%; height: 160px; border-radius: 8px; overflow: hidden; margin-top: 12px; display: none; background: #f1f5f9; }\n        .img-container img { width: 100%; height: 100%; object-fit: cover; }\n        @media screen and (max-width: 600px) {\n            .timeline::after { left: 31px; }\n            .container { width: 100%; padding-left: 70px; padding-right: 25px; }\n            .container::after { left: 21px; }\n            .right { left: 0%; }\n        }\n    </style>\n</head>\n<body>\n    <div class="timeline" id="timeline">\n        <!-- SUBSTITUA ESTE CONTEÚDO PELOS SEUS EVENTOS (ALTERNE ENTRE class="container left" E class="container right") -->\n        <div class="container left">\n            <!-- \`data-wiki\` SERVE PARA O ARTIFACT BUSCAR A FOTO NA WIKIPEDIA AUTOMATICAMENTE. COLOQUE O NOME MAIS FAMOSO POSSÍVEL DAQUELE ITEM. -->\n            <div class="content" data-wiki="Steve Jobs">\n                <div class="date">1976</div>\n                <h2 class="title">Fundação da Apple</h2>\n                <p class="desc">Steve Jobs e Steve Wozniak fundam a Apple Computer Inc.</p>\n            </div>\n        </div>\n    </div>\n    <script>\n        const observer = new ResizeObserver(() => {\n            window.parent.postMessage({ type: 'resize_timeline', id: '__UUID__', height: document.documentElement.scrollHeight }, '*');\n        });\n        observer.observe(document.body);\n        document.querySelectorAll('.content').forEach(async (el) => {\n            const wikiQuery = el.getAttribute('data-wiki');\n            if(wikiQuery) {\n                try {\n                    const searchRes = await fetch(\`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=\${encodeURIComponent(wikiQuery)}&utf8=&format=json&origin=*\`);\n                    const searchData = await searchRes.json();\n                    if(searchData.query.search.length > 0) {\n                        const pageTitle = searchData.query.search[0].title;\n                        const summaryRes = await fetch(\`https://pt.wikipedia.org/api/rest_v1/page/summary/\${encodeURIComponent(pageTitle.replace(/ /g, "_"))}\`);\n                        const summaryData = await summaryRes.json();\n                        if(summaryData.thumbnail) {\n                            const imgDiv = document.createElement('div');\n                            imgDiv.className = 'img-container';\n                            imgDiv.style.display = 'block';\n                            imgDiv.innerHTML = \`<img src="\${summaryData.thumbnail.source}" alt="\${wikiQuery}">\`;\n                            el.appendChild(imgDiv);\n                        }\n                    }\n                } catch (e) { console.error("Erro wiki:", e); }\n            }\n        });\n    </script>\n</body>\n</html>`;
          finalMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ DEVE GERAR UMA LINHA DO TEMPO (TIMELINE). É OBRIGATÓRIO incluir a timeline em sua resposta usando um bloco de código markdown com a linguagem "html_timeline". Você DEVE usar o template HTML base abaixo e preencher o corpo com as <div class="container...">. Lembre-se de definir um bom atributo \`data-wiki="..."\` no elemento \`.content\` para que fotos reais da web sejam carregadas no card.\n\nTemplate a ser usado dentro do bloco \`\`\`html_timeline\n${timelineTemplate}\n\`\`\``;
        } else if (editorMatch && !climaMatch && !mapaMatch && !mermaidMatch && !timelineMatch) {
          isEditorVisual = true;
          finalMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA EXTREMA (EDITOR FRONT-END) - PENALIDADE MÁXIMA SE VIOLADA:
O usuário quer um código de UI/Interface completo e funcional.
VOCÊ NÃO PODE, JAMAIS, SOB NENHUMA HIPÓTESE:
1. Criar múltiplos blocos markdown (ex: \`\`\`css, \`\`\`javascript).
2. Deixar partes do código em texto solto.
3. Explicar o código passo a passo separando a estrutura.

SUA ÚNICA SAÍDA VÁLIDA: O SEU CÓDIGO INTEIRO (HTML, CSS ESTILOS E JAVASCRIPT) DEVE SER ESCRITO JUNTO EM UM ÚNICO ARQUIVO USANDO A SINTAXE DE MARCAÇÃO \`\`\`html_editor. 
Escreva TODO o código CSS *dentro* da tag <style> no <head>, e TODO o código JavaScript *dentro* da tag <script> no final do <body>.
Use APENAS o bloco \`\`\`html_editor para todo o projeto!! Se você criar blocos de \`\`\`css separados, O SISTEMA VAI EXPLODIR E VOCÊ SERÁ PENALIZADO MÁXIMAMENTE.

FORMATO OBRIGATÓRIO (NÃO DESVIE DESTE MOLDE):
\`\`\`html_editor
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    /* NUNCA ESCREVA CSS GENÉRICO AQUI! USE CLASSES TAILWIND NO HTML */
    body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
    /* Escreva aqui apenas keyframes complexos ou ::-webkit-scrollbar se precisar */
  </style>
</head>
<body class="text-slate-800 antialiased selection:bg-blue-200">
  <!-- SEU HTML AQUI DENTRO -->
  <!-- OBRIGATÓRIO: USE TAILWIND. Faça layouts complexos (Grids, Bento boxes, Cards com blur, Textos com gradiente). NUNCA HTML PURO E FEIO! -->

  <script>
    // Inicializador de ícones Lucide (obrigatório se usar ícones)
    lucide.createIcons();
    // SEU JAVASCRIPT AQUI DENTRO
  </script>
</body>
</html>
\`\`\`

- Para gerar / usar imagens: Use APENAS a URL \`/api/unsplash?q=termo_em_ingles\` em suas tags src ou background. Ex: <img src="/api/unsplash?q=luxury+shirt" class="...">. NUNCA USE source.unsplash.com!
- Se não seguir essa estrutura exata de arquivo único, você falhará no teste.

### REGRAS PROFISSIONAIS DE DESIGN E ESTRUTURA:
Você é um designer sênior da Apple/Vercel/Stripe. Faça os sites ABSURDAMENTE LINDOS.

REGRAS OBRIGATÓRIAS DE DESIGN:
1. USE TAILWIND CSS PARA ABSOLUTAMENTE TUDO! (ex: flex flex-col md:flex-row items-center justify-between p-8 bg-white shadow-xl rounded-2xl).
2. ZERO EMOJIS - Use APENAS a biblioteca Lucide (ex: <i data-lucide="shopping-cart"></i>).
3. ESPAÇAMENTO E TIPOGRAFIA DE LUXO: Use Gaps grandes (gap-8, gap-12), paddings maciços em seções (py-20, px-6), e tipografia elegante (text-5xl font-extrabold tracking-tight).
4. OBRIGATÓRIO TER IMAGENS DE ALTA QUALIDADE: Não deixe o site vazio de mídia.
5. DESTAQUE VISUAL: Use gradientes (bg-gradient-to-r), bordas translúcidas (border border-white/20), efeito de vidro (backdrop-blur-md bg-white/30).
6. ANIMAÇÕES: transition-all duration-300 hover:scale-105 hover:-translate-y-1 etc.
7. CRIE PELO MENOS 3 SEÇÕES COMPLETAS NA PÁGINA (Hero com Call-to-action gigante, Seção de Funcionalidades/Produtos em Grid/Bento Box, e Footer rico).
8. NÃO FAÇA HTML FEIO/BRUTO! Faça uma interface deslumbrante de arrancar suspiros.`;
        } else if (mermaidMatch && !climaMatch && !mapaMatch && !timelineMatch && !editorMatch) {
          const mermaidTemplate = `<!DOCTYPE html>\n<html>\n<head>\n    <script type="module">\n        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';\n        mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { primaryColor: '#f1f5f9', primaryTextColor: '#0f172a', primaryBorderColor: '#cbd5e1', lineColor: '#334155', secondaryColor: '#e2e8f0', tertiaryColor: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif' } });\n        const observer = new ResizeObserver(entries => {\n            for (let entry of entries) {\n                window.parent.postMessage({ type: 'resize_mermaid', id: '__UUID__', height: document.documentElement.scrollHeight }, '*');\n            }\n        });\n        window.addEventListener('load', () => setTimeout(() => observer.observe(document.documentElement), 100));\n    </script>\n    <style>body { margin:0; padding:24px; font-family:'Inter',sans-serif; background:#fff; display:flex; justify-content:center; } .mermaid { width:100%; max-width:800px; overflow:visible; display:block; text-align:center; }</style>\n</head>\n<body>\n    <div class="mermaid">\n        %% substitua com seu código mermaid abaixo\n        graph TD\n        A[Base] --> B[Processo]\n    </div>\n</body>\n</html>`;
          finalMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ DEVE GERAR UM DIAGRAMA MERMAID (fluxograma/sequência). É OBRIGATÓRIO incluir o diagrama em qualquer lugar da sua resposta (de preferência após a introdução) usando um bloco de código markdown com a linguagem "html_mermaid". Você DEVE usar o template HTML base abaixo, mas substituindo o código na div class="mermaid" pela sua própria sintaxe Mermaid.js estruturando o assunto pedido.\n\nTemplate a ser usado dentro do bloco \`\`\`html_mermaid\n${mermaidTemplate}\n\`\`\``;
        } else if (answer.includes("GERAL") && !climaMatch && !mapaMatch && !mermaidMatch && !timelineMatch && !editorMatch) {
          finalMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ DEVE GERAR UM ARTIFACT (GERAL). O objetivo deste artefato explícito é EDUCAÇÃO, RESUMO DIDÁTICO ou COMPREENSÃO VISUAL. Entregue um mapa mental, infográfico ou resumo esquemático estruturado usando as DICAS DA WEB (se existirem na busca) para que os dados ensinados sejam super atualizados. É OBRIGATÓRIO incluir a tag <artifact> no final da sua resposta com o prompt para o gerador visual.`;
        } else {
          finalMessages[0].content += `\n\n### INSTRUÇÃO CRÍTICA DO CLASSIFICADOR:\nO classificador determinou que VOCÊ NÃO DEVE GERAR UM ARTIFACT para esta resposta. É PROIBIDO usar a tag <artifact> ou blocos de código html_chart nesta resposta. Apenas responda em texto.`;
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
          
          finalMessages[finalMessages.length - 1].content += searchContext;
        } else {
          res.write(`data: ${JSON.stringify({ type: 'search_complete', query: userText, sources: [] })}\n\n`);
        }
      } catch (err) {
        console.error("Tavily Search Error:", err);
        res.write(`data: ${JSON.stringify({ type: 'search_complete', query: userText, sources: [] })}\n\n`);
      }
    }

    if (isEditorVisual) {
      finalMessages.push({
        role: "system",
        content: "LEMBRETE OBRIGATÓRIO E FINAL (CRÍTICO ANTES DE GERAR SEU OUTPUT): ENTREGUE ABSOLUTAMENTE TUDOOO O CÓDIGO INTEIRO (HTML E CSS E JS) JUNTO, EMBUTIDO NUM ARQUIVO ÚNICO DO TIPO DENTRO DE ```html_editor. É SEVERAMENTE PROIBIDO sob qualquer circunstância escrever e gerar blocos soltos/separados apenas para css ou javascript. Use: <style> seu css... </style> no head!"
      });
    }

    if (containsImages) {
      const sambaApiKey = process.env.SAMBANOVA_API_KEY;
      if (!sambaApiKey) throw new Error("SAMBANOVA_API_KEY is não configurada.");

      const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sambaApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: finalMessages,
          model: selectedModel,
          stream: true,
          max_tokens: 2048,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`SambaNova API Error: ${response.status} ${errText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Falha ao abrir stream da SambaNova.");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || "";
            const reasoning = json.choices[0]?.delta?.reasoning_content || json.choices[0]?.delta?.reasoning || "";
            
            if (reasoning) {
              res.write(`data: ${JSON.stringify({ type: 'thought', content: reasoning })}\n\n`);
            }
            if (content) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
            }
          } catch (e) {
            // Ignorar chunks mal formatados
          }
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    // No tool calls, just stream the response (Groq/OpenRouter)
    const stream = await clientToUse.chat.completions.create({
      messages: finalMessages,
      model: selectedModel,
      stream: true,
      max_tokens: 2048,
      temperature: 0.2
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || (chunk.choices[0]?.delta as any)?.reasoning || "";

      if (reasoning) {
        res.write(`data: ${JSON.stringify({ type: 'thought', content: reasoning })}\n\n`);
      }
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
      console.log("Gerando artifact: Tentando gemini-1.5-flash...");
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nSolicitação: " + prompt }] }],
        config: {
          temperature: 0.5,
        }
      });
      htmlContent = response.text;
    } catch (e1: any) {
      console.warn("gemini-1.5-flash falhou:", e1.message);
      try {
        console.log("Gerando artifact: Tentando gemini-1.5-flash-8b...");
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash-8b',
          contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nSolicitação: " + prompt }] }],
          config: {
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

app.get('/api/unsplash', async (req, res) => {
  try {
    const q = req.query.q || 'abstract';
    const apiKey = process.env.VITE_UNSPLASH_API_KEY || process.env.UNSPLASH_API_KEY;

    if (!apiKey) {
      // Fallback if no key is provided
      return res.redirect(`https://image.pollinations.ai/prompt/${encodeURIComponent(q as string)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`);
    }

    const unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(q as string)}&client_id=${apiKey}`);
    if (unsplashRes.ok) {
      const data = await unsplashRes.json();
      if (data && data.urls && data.urls.regular) {
        return res.redirect(data.urls.regular);
      }
    }
    
    // Fallback if Unsplash fails (e.g., rate limit)
    res.redirect(`https://image.pollinations.ai/prompt/${encodeURIComponent(q as string)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`);
  } catch (e) {
    res.redirect(`https://image.pollinations.ai/prompt/${encodeURIComponent(req.query.q as string || 'abstract')}?width=800&height=600&nologo=true`);
  }
});

export default app;
