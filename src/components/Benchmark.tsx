import React from 'react';
import { ArrowLeft, Trophy, Zap, MapPin, Star, Coffee, BookOpen, Search, Image as ImageIcon, Clock, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BenchmarkProps {
  onBack: () => void;
}

export default function Benchmark({ onBack }: BenchmarkProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Desempenho Milly AI 1.0</h1>
          <p className="text-sm text-slate-500">feito em: 11/04/2026</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-12">
        {/* General Analysis */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Análise Geral: Milly AI 1.0
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              A Milly AI 1.0 se destaca como uma assistente extremamente versátil e amigável. Embora não supere modelos gigantes como o GPT-5.4 em raciocínio puro ou programação complexa, ela brilha intensamente em tarefas do dia a dia, criatividade, empatia e custo-benefício. É a escolha ideal para usuários brasileiros que buscam uma IA prática, rápida e com uma personalidade cativante.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100 min-w-[200px]">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Nota Média Geral</span>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">
              8.9<span className="text-2xl text-slate-400 font-bold">/10</span>
            </div>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              <Star className="w-5 h-5 fill-yellow-400/50 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Melhor Desempenho Geral</h3>
            <p className="text-xl font-bold text-slate-900">GPT-5.4</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-2">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Melhor Custo-Benefício</h3>
            <p className="text-xl font-bold text-slate-900">Drekee AI 1.5 Pro</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 mb-2">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Melhor para Brasil</h3>
            <p className="text-xl font-bold text-slate-900">Milly AI 1</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
              <Star className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Talento Emergente</h3>
            <p className="text-xl font-bold text-slate-900">Qwen 3.6 Plus</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-16">
          <CategorySection 
            number={1}
            title="Ciência e Pesquisa"
            description="Quanto cada IA entende de biologia, física, química e essas coisas chatas que a gente aprende na escola?"
            winner="GPT-5.4 (mas Qwen vem crescendo forte)"
            data={[
              { ia: "GPT-5.4", score: "9.8", desc: "Explica como se fosse professor de Harvard" },
              { ia: "Gemini 3.1 Pro", score: "9.5", desc: "Bem preciso, mas um pouco robótico" },
              { ia: "Milly AI 1", score: "8.2", desc: "Entende bem, explica de forma acessível" },
              { ia: "Drekee AI 1.5 Pro", score: "8.0", desc: "Bom, mas às vezes vaga" },
              { ia: "Qwen 3.6 Plus", score: "8.7", desc: "Surpreendentemente bom" },
            ]}
            descLabel="Vibe"
          />

          <CategorySection 
            number={2}
            title="Geografia e Localização"
            description="Sabe aquele jogo de adivinhar países? Testamos isso."
            winner="GPT-5.4 (Perplexity vem logo atrás)"
            data={[
              { ia: "GPT-5.4", score: "9.6", desc: "Conhece até cidades pequenas" },
              { ia: "Gemini 3.1 Pro", score: "9.3", desc: "Muito bom em dados geográficos" },
              { ia: "Milly AI 1", score: "7.8", desc: "Acerta capitais, vaga em detalhes" },
              { ia: "Perplexity Pro", score: "9.1", desc: "Busca na web ajuda muito" },
              { ia: "Kimi K2.5", score: "8.5", desc: "Bom em geral" },
            ]}
            descLabel="O que acertou"
          />

          <CategorySection 
            number={3}
            title="Astronomia e Espaço"
            description="Quanto cada IA sabe sobre planetas, estrelas e aquele buraco negro lá longe?"
            winner="GPT-5.4 (mas Gemini está muito perto)"
            data={[
              { ia: "GPT-5.4", score: "9.7", desc: "Conhece até exoplanetas" },
              { ia: "Gemini 3.1 Pro", score: "9.4", desc: "Muito preciso" },
              { ia: "Qwen 3.6 Plus", score: "8.9", desc: "Surpreendentemente bom" },
              { ia: "Milly AI 1", score: "8.1", desc: "Sabe o básico bem" },
              { ia: "Llama 4", score: "7.6", desc: "Um pouco vago" },
            ]}
            descLabel="Especialidade"
          />

          <CategorySection 
            number={4}
            title="Dia a Dia - Tarefas Cotidianas"
            description='Aquelas perguntas que a gente faz no dia a dia: "Como faço um bolo?" "Qual é a melhor forma de limpar a casa?"'
            winner="Milly AI 1 (finalmente, um ponto para ela! 🎉)"
            data={[
              { ia: "Milly AI 1", score: "9.2", desc: "Super prática e descontraída" },
              { ia: "Drekee AI 1.5 Pro", score: "8.9", desc: "Bem útil" },
              { ia: "GPT-5.4", score: "8.8", desc: "Muito formal às vezes" },
              { ia: "Gemini 3.1 Pro", score: "8.6", desc: "Bom, mas genérico" },
              { ia: "Perplexity Pro", score: "8.7", desc: "Busca ajuda bastante" },
            ]}
            descLabel="Praticidade"
          />

          <CategorySection 
            number={5}
            title="Didática - Explicar Coisas Complicadas"
            description="Qual IA consegue explicar coisas complexas de forma que até uma criança entende?"
            winner="Milly AI 1 (Milly está crescendo!)"
            data={[
              { ia: "Milly AI 1", score: "9.4", desc: "Explica super bem" },
              { ia: "Drekee AI 1.5 Pro", score: "8.8", desc: "Bem didática" },
              { ia: "GPT-5.4", score: "8.5", desc: "Boa, mas às vezes complica" },
              { ia: "Gemini 3.1 Pro", score: "8.3", desc: "Precisa de ajustes" },
              { ia: "Qwen 3.6 Plus", score: "8.1", desc: "Aceitável" },
            ]}
            descLabel="Clareza"
          />

          <CategorySection 
            number={6}
            title="Pesquisa Forense - Investigação Profunda"
            description="Qual IA consegue fazer pesquisa pesada, analisar dados complexos e tirar conclusões?"
            winner="GPT-5.4 (sem discussão)"
            data={[
              { ia: "GPT-5.4", score: "9.9", desc: "Análise de nível profissional" },
              { ia: "Gemini 3.1 Pro", score: "9.6", desc: "Muito bom em análise" },
              { ia: "Perplexity Pro", score: "9.5", desc: "Busca + análise = poderoso" },
              { ia: "Qwen 3.6 Plus", score: "8.8", desc: "Bom, mas não tão profundo" },
              { ia: "Milly AI 1", score: "8.2", desc: "Consegue, mas demora mais" },
            ]}
            descLabel="Profundidade"
          />

          <CategorySection 
            number={7}
            title="Visualização e Criatividade"
            description="Qual IA consegue descrever coisas de forma visual e criativa?"
            winner="Milly AI 1 (Milly é criativa mesmo!)"
            data={[
              { ia: "Milly AI 1", score: "9.3", desc: "Muito criativa" },
              { ia: "Drekee AI 1.5 Pro", score: "8.7", desc: "Bom em descrições" },
              { ia: "GPT-5.4", score: "8.9", desc: "Criativo, mas formal" },
              { ia: "Gemini 3.1 Pro", score: "8.4", desc: "Aceitável" },
              { ia: "Qwen 3.6 Plus", score: "8.2", desc: "Pode melhorar" },
            ]}
            descLabel="Criatividade"
          />

          <CategorySection 
            number={8}
            title="Velocidade - Responde Rápido?"
            description="Qual IA não deixa você esperando?"
            winner="Drekee AI 1.5 Pro (super rápida!)"
            data={[
              { ia: "Drekee AI 1.5 Pro", score: "9.8", desc: "Instantâneo" },
              { ia: "Milly AI 1", score: "9.5", desc: "Muito rápido" },
              { ia: "GPT-5.4", score: "8.9", desc: "Rápido, mas às vezes demora" },
              { ia: "Perplexity Pro", score: "8.2", desc: "Busca na web atrasa um pouco" },
              { ia: "Gemini 3.1 Pro", score: "8.7", desc: "Bom" },
            ]}
            descLabel="Tempo Médio"
          />

          <CategorySection 
            number={9}
            title="Confiabilidade - Não Mente?"
            description="Qual IA você pode confiar que não vai inventar informações?"
            winner="GPT-5.4 (raramente inventa coisas)"
            data={[
              { ia: "GPT-5.4", score: "9.7", desc: "Muito confiável" },
              { ia: "Gemini 3.1 Pro", score: "9.5", desc: "Bem confiável" },
              { ia: "Perplexity Pro", score: "9.6", desc: "Busca verifica tudo" },
              { ia: "Milly AI 1", score: "8.8", desc: "Boa, mas às vezes erra" },
              { ia: "Qwen 3.6 Plus", score: "8.5", desc: "Aceitável" },
            ]}
            descLabel="Honestidade"
          />

          <CategorySection 
            number={10}
            title="Detecção de Fake News"
            description="Qual IA consegue identificar notícias falsas?"
            winner="Perplexity Pro (busca na web é fundamental aqui)"
            data={[
              { ia: "Perplexity Pro", score: "9.4", desc: "Busca ajuda muito" },
              { ia: "GPT-5.4", score: "9.2", desc: "Muito bom" },
              { ia: "Gemini 3.1 Pro", score: "8.9", desc: "Bom" },
              { ia: "Milly AI 1", score: "8.3", desc: "Consegue, mas não é especialista" },
              { ia: "Drekee AI 1.5 Pro", score: "8.1", desc: "Aceitável" },
            ]}
            descLabel="Precisão"
          />

          <CategorySection 
            number={11}
            title="Raciocínio Lógico - Quebra-Cabeças"
            description="Qual IA consegue resolver problemas lógicos complexos?"
            winner="GPT-5.4 (é praticamente um computador)"
            data={[
              { ia: "GPT-5.4", score: "9.8", desc: "Praticamente perfeita" },
              { ia: "Gemini 3.1 Pro", score: "9.5", desc: "Muito bom" },
              { ia: "Qwen 3.6 Plus", score: "9.1", desc: "Surpreendentemente bom" },
              { ia: "Milly AI 1", score: "8.4", desc: "Consegue resolver" },
              { ia: "Llama 4", score: "8.2", desc: "Aceitável" },
            ]}
            descLabel="Lógica"
          />

          <CategorySection 
            number={12}
            title="Programação - Código"
            description="Qual IA escreve código que funciona?"
            winner="GPT-5.4 (os devs confiam nela)"
            data={[
              { ia: "GPT-5.4", score: "9.9", desc: "Código de produção" },
              { ia: "Gemini 3.1 Pro", score: "9.6", desc: "Muito bom" },
              { ia: "Qwen 3.6 Plus", score: "9.3", desc: "Bom" },
              { ia: "Milly AI 1", score: "8.7", desc: "Funciona, mas pode melhorar" },
              { ia: "Llama 4", score: "8.5", desc: "Aceitável" },
            ]}
            descLabel="Qualidade do Código"
          />

          <CategorySection 
            number={13}
            title="Multilíngue - Fala Vários Idiomas?"
            description="Qual IA consegue lidar com português, inglês, espanhol, chinês, tudo?"
            winner="Qwen 3.6 Plus (especialmente para asiáticos)"
            data={[
              { ia: "Gemini 3.1 Pro", score: "9.7", desc: "Praticamente todos" },
              { ia: "GPT-5.4", score: "9.5", desc: "Muito bom" },
              { ia: "Qwen 3.6 Plus", score: "9.8", desc: "Excelente em chinês e asiáticos" },
              { ia: "Milly AI 1", score: "8.9", desc: "Bom em português" },
              { ia: "Kimi K2.5", score: "9.2", desc: "Bom em asiáticos" },
            ]}
            descLabel="Idiomas"
          />

          <CategorySection 
            number={14}
            title="Contexto Longo - Aguenta Textos Gigantes?"
            description="Qual IA consegue ler um livro inteiro e responder perguntas sobre ele?"
            winner="Qwen 3.6 Plus (1 MILHÃO!)"
            data={[
              { ia: "Qwen 3.6 Plus", score: "9.9", desc: "1 MILHÃO de tokens!" },
              { ia: "GPT-5.4", score: "9.5", desc: "128k tokens" },
              { ia: "Gemini 3.1 Pro", score: "9.3", desc: "1 milhão de tokens" },
              { ia: "Milly AI 1", score: "8.1", desc: "Limitado" },
              { ia: "Kimi K2.5", score: "9.7", desc: "200k tokens" },
            ]}
            descLabel="Contexto"
          />

          <CategorySection 
            number={15}
            title="Custo-Benefício - Quanto Custa?"
            description="Qual IA oferece o melhor preço?"
            winner="Drekee AI 1.5 Pro (GRÁTIS!)"
            data={[
              { ia: "Drekee AI 1.5 Pro", score: "10", desc: "100% GRÁTIS!" },
              { ia: "Milly AI 1", score: "9.5", desc: "Grátis também" },
              { ia: "Llama 4", score: "9.2", desc: "Open source (grátis)" },
              { ia: "Qwen 3.6 Plus", score: "7.8", desc: "Pago, mas barato" },
              { ia: "GPT-5.4", score: "6.5", desc: "Caro" },
            ]}
            descLabel="Preço"
          />

          <CategorySection 
            number={16}
            title="Busca na Web - Informações Atualizadas"
            description="Qual IA consegue buscar informações na internet?"
            winner="Perplexity Pro (especialista em busca)"
            data={[
              { ia: "Perplexity Pro", score: "9.9", desc: "Sempre atualizado" },
              { ia: "Milly AI 1", score: "9.2", desc: "Busca bem" },
              { ia: "GPT-5.4", score: "7.5", desc: "Conhecimento até 2024" },
              { ia: "Gemini 3.1 Pro", score: "8.8", desc: "Bom acesso" },
              { ia: "Drekee AI 1.5 Pro", score: "8.5", desc: "Consegue buscar" },
            ]}
            descLabel="Atualização"
          />

          <CategorySection 
            number={17}
            title="Geração de Imagens - Desenha Bem?"
            description="Qual IA consegue gerar imagens bonitas?"
            winner="Milly AI 1 (imagens criativas!)"
            data={[
              { ia: "Milly AI 1", score: "8.9", desc: "Imagens bem legais" },
              { ia: "Drekee AI 1.5 Pro", score: "8.2", desc: "Bom" },
              { ia: "GPT-5.4", score: "8.7", desc: "Muito bom" },
              { ia: "Gemini 3.1 Pro", score: "8.5", desc: "Bom" },
              { ia: "Qwen 3.6 Plus", score: "7.8", desc: "Aceitável" },
            ]}
            descLabel="Qualidade"
          />

          <CategorySection 
            number={18}
            title="Conversação Natural - Bate-Papo Descontraído"
            description="Qual IA é mais legal para conversar?"
            winner="Milly AI 1 (a mais divertida!)"
            data={[
              { ia: "Milly AI 1", score: "9.6", desc: "Super descontraída" },
              { ia: "Drekee AI 1.5 Pro", score: "9.2", desc: "Bem natural" },
              { ia: "GPT-5.4", score: "8.3", desc: "Um pouco formal" },
              { ia: "Gemini 3.1 Pro", score: "8.1", desc: "Formal demais" },
              { ia: "Perplexity Pro", score: "7.9", desc: "Focada em busca" },
            ]}
            descLabel="Personalidade"
          />

          <CategorySection 
            number={19}
            title="Criação de Conteúdo - Escreve Bem?"
            description="Qual IA consegue escrever artigos, histórias, posts?"
            winner="GPT-5.4 (mas Milly vem forte)"
            data={[
              { ia: "GPT-5.4", score: "9.8", desc: "Escreve como jornalista" },
              { ia: "Milly AI 1", score: "9.5", desc: "Criativa e fluida" },
              { ia: "Gemini 3.1 Pro", score: "9.2", desc: "Bom" },
              { ia: "Qwen 3.6 Plus", score: "8.8", desc: "Bom" },
              { ia: "Drekee AI 1.5 Pro", score: "8.5", desc: "Aceitável" },
            ]}
            descLabel="Qualidade"
          />

          <CategorySection 
            number={20}
            title="Suporte e Documentação - Ajuda Quando Você Erra?"
            description="Qual IA explica erros e ajuda você a corrigir?"
            winner="Milly AI 1 (super paciente!)"
            data={[
              { ia: "Milly AI 1", score: "9.7", desc: "Muito paciente" },
              { ia: "Drekee AI 1.5 Pro", score: "9.3", desc: "Bom suporte" },
              { ia: "GPT-5.4", score: "8.9", desc: "Bom" },
              { ia: "Gemini 3.1 Pro", score: "8.6", desc: "Aceitável" },
              { ia: "Qwen 3.6 Plus", score: "8.4", desc: "Aceitável" },
            ]}
            descLabel="Paciência"
          />
        </div>
      </main>
    </div>
  );
}

function CategorySection({ number, title, description, winner, data, descLabel }: { number: number, title: string, description: string, winner: string, data: { ia: string, score: string, desc: string }[], descLabel: string }) {
  // Sort data from highest to lowest score
  const sortedData = [...data].sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(item => ({
    ...item,
    numericScore: parseFloat(item.score)
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isMilly = data.ia.includes('Milly');
      return (
        <div className={`bg-white p-4 border shadow-xl rounded-2xl max-w-xs ${isMilly ? 'border-blue-200' : 'border-slate-200'}`}>
          <p className="font-bold text-slate-900 mb-1">{data.ia}</p>
          <p className={`font-black text-2xl mb-2 ${isMilly ? 'text-blue-600' : 'text-slate-700'}`}>
            {data.score}<span className="text-sm text-slate-400 font-medium">/10</span>
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700 block mb-1">{descLabel}:</span>
            {data.desc}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <span className="bg-slate-500 text-white w-8 h-8 rounded flex items-center justify-center text-lg">{number}</span>
          {title}
        </h2>
        <p className="text-slate-600 mt-2 text-lg">{description}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 10]} hide />
              <YAxis 
                dataKey="ia" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
              <Bar dataKey="numericScore" radius={[0, 6, 6, 0]} barSize={32}>
                {sortedData.map((entry, index) => {
                  const isMilly = entry.ia.includes('Milly');
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isMilly ? '#3b82f6' : '#cbd5e1'} 
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-slate-900 font-medium">
        <strong className="font-bold">Vencedor:</strong> {winner}
      </p>
      
      <hr className="border-slate-200 mt-8" />
    </div>
  );
}
