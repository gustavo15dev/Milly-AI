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
    
    const systemPrompt = `Você é um sistema de inteligência de elite, focado em lógica pura, eficiência e profundidade analítica.

### DIRETRIZES DE PERSONALIDADE:
1. **Sem "Encheção de Linguiça":** Não peça desculpas, não use frases de transição inúteis (ex: "Entendo sua pergunta", "Aqui está o que você pediu") e não dê avisos éticos óbvios a menos que seja estritamente necessário.
2. **Nível Intelectual:** Comunique-se como um especialista sênior. Se o usuário fizer uma pergunta complexa, responda com profundidade técnica. Se a pergunta for simples, seja ultra-conciso.
3. **Senso Crítico:** Não aceite premissas erradas do usuário. Se o usuário disser algo factualmente incorreto, corrija-o de forma direta e educada, explicando o porquê.
4. **Verborragia Zero:** Se uma resposta pode ser dada em uma frase, não use um parágrafo. Use listas e negrito para facilitar a leitura.
5. **Autenticidade:** Tenha uma opinião técnica fundamentada. Não seja "em cima do muro". Se houver uma solução melhor para o que o usuário quer fazer, sugira-a imediatamente.

### RESTRIÇÕES CRÍTICAS DE OUTPUT:
- PROIBIDO: Iniciar a resposta confirmando que entendeu as instruções ou que vai seguir o novo estilo.
- PROIBIDO: Frases como "Entendido", "Vou começar agora", "Como você pediu" ou "Seguindo suas diretrizes".
- AÇÃO: Comece diretamente na solução. Se o usuário te der um comando, execute. Se te der uma pergunta, responda. 
- META: Se eu te der o prompt, sua primeira palavra deve ser o conteúdo da resposta, nunca um comentário sobre o seu próprio comportamento.

### REGRAS DE RESPOSTA:
- Use Markdown para estruturar a resposta (negrito, itálico, listas, parágrafos).
- Para informações MUITO importantes que devem ser "grifadas" (highlight), use a tag HTML <mark>texto aqui</mark>. Isso criará um fundo azul claro no texto, destacando-o.
- Se for código, escreva apenas o código e breves comentários essenciais.
- Se for uma análise, use o raciocínio "Chain of Thought" internamente para entregar apenas a conclusão mais lógica.

### ARTIFACTS (INFOGRÁFICOS E RESUMOS VISUAIS) - REGRA ABSOLUTA:
- Se o usuário pedir um resumo complexo, mapa mental, linha do tempo, tabela comparativa, ou algo que se beneficie MUITO de uma visualização estruturada e colorida, você DEVE gerar um Artifact.
- REGRAS DO ARTIFACT:
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

    const tools = (useWebSearch && supportsTools) ? [
      {
        type: "function" as const,
        function: {
          name: "web_search",
          description: "Pesquisa na internet por informações atualizadas, notícias ou fatos recentes.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "A consulta de pesquisa para enviar ao buscador."
              }
            },
            required: ["query"]
          }
        }
      }
    ] : undefined;

    let currentMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    let completion = await groqClient.chat.completions.create({
      messages: currentMessages,
      model: selectedModel,
      tools: tools,
      tool_choice: tools ? "auto" : "none",
    });

    let responseMessage = completion.choices[0]?.message;
    let sources: any[] = [];
    let searchImages: any[] = [];
    let searchFollowUps: string[] = [];
    let searchAnswer: string = "";

    if (responseMessage?.tool_calls) {
      currentMessages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "web_search") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const query = args.query;

            const tavilyApiKey = process.env.TAVILY_API_KEY;
            if (!tavilyApiKey) {
              throw new Error("TAVILY_API_KEY is not set");
            }

            const tavilyRes = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                api_key: tavilyApiKey,
                query: query,
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
              sources = tavilyData.results || [];
              searchImages = tavilyData.images || [];
              searchFollowUps = tavilyData.follow_up_questions || [];
              searchAnswer = tavilyData.answer || "";
              
              currentMessages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: "web_search",
                content: JSON.stringify({
                  results: sources.map((s: any) => ({ title: s.title, content: s.content, url: s.url })),
                  answer: searchAnswer
                })
              });
            } else {
              currentMessages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: "web_search",
                content: "Erro ao realizar a busca na web."
              });
            }
          } catch (err) {
            console.error("Tavily Search Error:", err);
            currentMessages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: "web_search",
              content: "Falha na integração com o buscador."
            });
          }
        }
      }

      completion = await groqClient.chat.completions.create({
        messages: currentMessages,
        model: selectedModel,
      });
      responseMessage = completion.choices[0]?.message;
      
      res.json({ 
        content: responseMessage?.content || "",
        sources: sources.length > 0 ? sources : undefined,
        images: searchImages.length > 0 ? searchImages : undefined,
        followUpQuestions: searchFollowUps.length > 0 ? searchFollowUps : undefined,
        searchAnswer: searchAnswer || undefined
      });
      return;
    }

    res.json({ 
      content: responseMessage?.content || "",
      sources: sources.length > 0 ? sources : undefined
    });
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
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
