/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  Sparkles, 
  MessageSquare, 
  Zap, 
  Shield, 
  Cpu, 
  Globe, 
  ChevronRight,
  Menu,
  X,
  Activity,
  Send,
  ArrowLeft,
  Bot,
  User,
  BarChart3,
  Plus,
  Settings2,
  Mic,
  ChevronDown
} from "lucide-react";

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'chat'>('landing');
  const [messages, setMessages] = useState<{ 
    role: 'user' | 'ai', 
    content: string, 
    images?: string[], 
    generatedImage?: string,
    showActivateImageButton?: boolean,
    isImageResponse?: boolean,
    artifact?: {
      prompt: string;
      content?: string;
      isLoading: boolean;
      error?: boolean | string;
    };
    sources?: { title: string; url: string; content: string }[];
  }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatMode, setChatMode] = useState<'Rápido' | 'Raciocínio' | 'Pro'>('Rápido');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isImageToolActive, setIsImageToolActive] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [selectedSources, setSelectedSources] = useState<{ title: string; url: string; content: string }[] | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachedImages.length + files.length > 5) {
      alert("Máximo de 5 imagens permitido.");
      return;
    }

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        // In a real app, you'd send this blob to a transcription API
        const audioBlob = e.data;
        console.log("Audio data available", audioBlob);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        setInputValue(prev => prev + " [Áudio Gravado]");
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const safeFetchJson = async (url: string, options: RequestInit) => {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    
    if (!response.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro do servidor (${response.status})`);
      }
      throw new Error(`Erro de comunicação (${response.status})`);
    }

    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      const text = await response.text();
      if (text.toLowerCase().includes("<!doctype html>")) {
        throw new Error("O servidor está reiniciando ou ocupado. Por favor, aguarde alguns segundos e tente novamente.");
      }
      throw new Error("Resposta inválida do servidor (formato incorreto).");
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedImages.length === 0) return;
    
    const isImageGen = inputValue.toLowerCase().startsWith('/imagem ') || 
                      (isImageToolActive && inputValue.trim().length > 0);
    
    const prompt = inputValue.toLowerCase().startsWith('/imagem ') 
      ? inputValue.slice(8).trim() 
      : inputValue;

    // Check if user is asking for an image but tool is not active
    const askingForImage = !isImageToolActive && !inputValue.toLowerCase().startsWith('/imagem ') && 
      (inputValue.toLowerCase().includes("gere uma imagem") || 
       inputValue.toLowerCase().includes("gerar uma imagem") ||
       inputValue.toLowerCase().includes("crie uma imagem") ||
       inputValue.toLowerCase().includes("criar uma imagem"));

    if (askingForImage) {
      const userMessage = { role: 'user' as const, content: inputValue };
      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      
      setMessages(prev => [...prev, { 
        role: 'ai' as const, 
        content: "Para gerar uma imagem, selecione a ferramenta de geração de imagens.",
        showActivateImageButton: true
      }]);
      return;
    }

    if (!isImageGen && chatMode !== 'Rápido') {
      alert("Apenas o modelo Rápido está disponível no momento.");
      return;
    }

    const userMessage = { 
      role: 'user' as const, 
      content: inputValue,
      images: attachedImages.length > 0 ? [...attachedImages] : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setAttachedImages([]);

    if (isImageGen) {
      setIsGeneratingImage(true);
      try {
        const data = await safeFetchJson('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        const imageUrl = data.imageUrl;

        if (imageUrl) {
          setMessages(prev => [...prev, { 
            role: 'ai' as const, 
            content: `Aqui está a imagem gerada para: "${prompt}"`,
            generatedImage: imageUrl,
            isImageResponse: true
          }]);
        } else {
          throw new Error("Nenhuma imagem foi retornada pelo modelo.");
        }
      } catch (error: any) {
        console.error("Image Gen Error:", error);
        let errorMessage = "Desculpe, não consegui gerar a imagem.";
        
        if (error.message?.includes("403") || error.status === 403) {
          errorMessage = "Erro de Permissão (403): Sua chave não tem acesso ao modelo de imagem.";
        } else if (error.message?.includes("404")) {
          errorMessage = "Modelo não encontrado (404): O modelo de imagem pode não estar disponível.";
        }

        setMessages(prev => [...prev, { role: 'ai' as const, content: errorMessage }]);
      } finally {
        setIsGeneratingImage(false);
      }
      return;
    }

    try {
      const formattedMessages = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

      // Add current message with images if present
      const currentMsgContent: any[] = [{ type: "text", text: userMessage.content || "Análise esta imagem." }];
      if (userMessage.images) {
        userMessage.images.forEach(img => {
          currentMsgContent.push({
            type: "image_url",
            image_url: { url: img }
          });
        });
      }

      const data = await safeFetchJson('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...formattedMessages,
            { role: "user", content: userMessage.images ? currentMsgContent : userMessage.content }
          ],
          hasImages: !!userMessage.images,
          model: "llama-3.1-8b-instant",
          useWebSearch: isWebSearchActive
        }),
      });

      let content = data.content;
      
      let artifactPrompt = null;
      const artifactMatch = content.match(/<artifact>([\s\S]*?)<\/artifact>/);
      if (artifactMatch) {
        artifactPrompt = artifactMatch[1];
        content = content.replace(artifactMatch[0], '').trim();
      }

      const newMessage = { 
        role: 'ai' as const, 
        content,
        artifact: artifactPrompt ? { prompt: artifactPrompt, isLoading: true } : undefined,
        sources: data.sources
      };

      setMessages(prev => [...prev, newMessage]);

      if (artifactPrompt) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

          const artifactData = await safeFetchJson('/api/generate-artifact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: artifactPrompt }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          setMessages(prev => {
            const newMessages = [...prev];
            // Find the message we just added
            let lastMsgIndex = -1;
            for (let i = newMessages.length - 1; i >= 0; i--) {
              const m = newMessages[i];
              if (m === newMessage || (m.role === 'ai' && m.artifact?.prompt === artifactPrompt)) {
                lastMsgIndex = i;
                break;
              }
            }
            if (lastMsgIndex !== -1) {
              newMessages[lastMsgIndex] = {
                ...newMessages[lastMsgIndex],
                artifact: {
                  ...newMessages[lastMsgIndex].artifact!,
                  content: artifactData.htmlContent?.replace(/```[a-z]*\n?/g, '').replace(/```/g, ''),
                  isLoading: false
                }
              };
            }
            return newMessages;
          });
        } catch (e: any) {
          console.error("Artifact error", e);
          const isTimeout = e.name === 'AbortError';
          setMessages(prev => {
            const newMessages = [...prev];
            let lastMsgIndex = -1;
            for (let i = newMessages.length - 1; i >= 0; i--) {
              const m = newMessages[i];
              if (m === newMessage || (m.role === 'ai' && m.artifact?.prompt === artifactPrompt)) {
                lastMsgIndex = i;
                break;
              }
            }
            if (lastMsgIndex !== -1) {
              newMessages[lastMsgIndex] = {
                ...newMessages[lastMsgIndex],
                artifact: {
                  ...newMessages[lastMsgIndex].artifact!,
                  isLoading: false,
                  error: isTimeout ? "O tempo limite de geração foi excedido (60s). Tente novamente." : (e.message || true)
                }
              };
            }
            return newMessages;
          });
        }
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'ai' as const, content: error.message || "Desculpe, ocorreu um erro ao processar sua mensagem. Verifique se a chave da API Groq está configurada." }]);
    }
  };

  return (
    <div className="h-screen w-full bg-black text-white font-sans overflow-hidden relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-aqua/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-aqua/5 rounded-full blur-[120px] pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl px-6 py-3 shadow-3d">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-aqua rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,255,213,0.5)]">
                    <Cpu className="w-5 h-5 text-black" />
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight">Milly <span className="text-aqua">AI 1</span></span>
                </div>
                
                <div className="hidden md:flex items-center gap-4">
                  <button 
                    onClick={() => { setView('chat'); setMessages([]); }}
                    className="bg-aqua text-black px-6 py-2 rounded-xl font-bold hover:bg-white transition-all shadow-3d active:scale-95"
                  >
                    Começar
                  </button>
                </div>

                <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {isMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-24 px-6 md:hidden"
                >
                  <div className="flex flex-col gap-6 text-2xl font-display font-bold">
                    <button 
                      onClick={() => { setView('chat'); setMessages([]); setIsMenuOpen(false); }}
                      className="bg-aqua text-black w-full py-4 rounded-2xl mt-4"
                    >
                      Começar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aqua/10 border border-aqua/20 text-aqua text-xs font-bold uppercase tracking-widest mb-6">
                    <Sparkles className="w-3 h-3" />
                    A Próxima Geração de IA
                  </div>
                  
                  <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] mb-6">
                    Inteligência que <br />
                    <span className="text-aqua text-glow">Sente e Evolui.</span>
                  </h1>
                  
                  <p className="text-white/60 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
                    Milly AI 1 redefine a interação humano-máquina com um design imersivo e processamento neural de ultra-velocidade.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => { setView('chat'); setMessages([]); }}
                      className="group relative bg-aqua text-black px-10 py-4 rounded-2xl font-bold text-lg shadow-3d overflow-hidden transition-all hover:scale-105 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Começar <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                    </button>
                    
                    <button className="glass px-10 py-4 rounded-2xl font-bold text-lg text-white/40 cursor-not-allowed flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Benchmarks
                    </button>
                  </div>

                  <div className="mt-16 grid grid-cols-3 gap-8">
                    <div>
                      <div className="text-3xl font-display font-bold text-aqua">99.9%</div>
                      <div className="text-white/40 text-xs uppercase tracking-wider mt-1">Precisão</div>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-aqua">1.2ms</div>
                      <div className="text-white/40 text-xs uppercase tracking-wider mt-1">Latência</div>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-aqua">24/7</div>
                      <div className="text-white/40 text-xs uppercase tracking-wider mt-1">Atividade</div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Content - 3D Visualizer */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="relative flex justify-center items-center"
                >
                  <div className="relative w-full aspect-square max-w-[500px]">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-aqua/10 rounded-full"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-[10%] border border-aqua/20 rounded-full border-dashed"
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            "0 0 20px rgba(0, 255, 213, 0.2)",
                            "0 0 60px rgba(0, 255, 213, 0.4)",
                            "0 0 20px rgba(0, 255, 213, 0.2)"
                          ]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-[60%] h-[60%] bg-gradient-to-br from-aqua to-aqua-dark rounded-[40px] flex items-center justify-center relative overflow-hidden group shadow-3d"
                      >
                        <div className="absolute inset-2 bg-black/20 backdrop-blur-sm rounded-[32px] border border-white/20 flex items-center justify-center">
                          <Cpu className="w-24 h-24 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                        <motion.div 
                          animate={{ top: ["-10%", "110%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-[2px] bg-white/50 blur-[2px] z-20"
                        />
                      </motion.div>
                    </div>

                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-[10%] right-[5%] glass-aqua p-4 rounded-2xl shadow-3d z-30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-aqua/20 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-aqua" />
                        </div>
                        <div>
                          <div className="text-xs text-white/50 font-bold uppercase tracking-tighter">Status</div>
                          <div className="text-sm font-bold">Otimizado</div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="h-[100dvh] flex flex-col"
          >
            {/* Chat Header */}
            <header className="glass-aqua border-b border-aqua/10 px-6 py-4 flex items-center justify-between z-50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('landing')}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-aqua rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,255,213,0.3)]">
                    <Bot className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg leading-none">Milly AI 1</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-aqua rounded-full animate-pulse" />
                      <span className="text-[10px] text-aqua font-bold uppercase tracking-widest">Online</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setMessages([]);
                    setIsImageToolActive(false);
                  }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 text-sm font-medium mr-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova conversa
                </button>
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <Shield className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </header>

            {/* Chat Messages Area */}
            <div 
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 relative"
            >
              <div className="max-w-5xl mx-auto">
                {messages.length === 0 ? (
                  <div className="min-h-[60vh] flex items-center justify-center">
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl md:text-5xl font-display font-bold text-white/20 text-center"
                    >
                      Como posso ajudar?
                    </motion.h2>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((msg, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${msg.role === 'ai' ? 'bg-aqua/20 border-aqua/20' : 'bg-white/10 border-white/10'}`}>
                          {msg.role === 'ai' ? <Bot className="w-5 h-5 text-aqua" /> : <User className="w-5 h-5 text-white/60" />}
                        </div>
                        <div className={`${msg.role === 'ai' ? 'glass-aqua rounded-tl-none' : 'glass rounded-tr-none'} p-4 rounded-2xl max-w-[95%] shadow-3d w-full`}>
                          {msg.images && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {msg.images.map((img, i) => (
                                <img key={i} src={img} alt="Anexo" className="w-20 h-20 object-cover rounded-lg border border-white/10" referrerPolicy="no-referrer" />
                              ))}
                            </div>
                          )}
                          {msg.generatedImage && (
                            <div className="mb-3 rounded-xl overflow-hidden border border-white/10 shadow-2xl max-w-sm mx-auto">
                              <img src={msg.generatedImage} alt="Gerada pela IA" className="w-full h-auto" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          {msg.role === 'ai' ? (
                            <div className="markdown-body text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-5 mb-3 text-white" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />,
                                  p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                  a: ({node, ...props}) => <a className="text-aqua hover:underline" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                                  em: ({node, ...props}) => <em className="italic" {...props} />,
                                  mark: ({node, ...props}) => <mark className="bg-blue-500/30 text-blue-100 px-1.5 py-0.5 rounded-md font-medium" {...props} />
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                              
                              {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-4 flex items-center gap-2">
                                  <button 
                                    onClick={() => setSelectedSources(msg.sources!)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-colors"
                                  >
                                    <div className="flex -space-x-2">
                                      {msg.sources.slice(0, 3).map((s, i) => {
                                        let hostname = "web";
                                        try { hostname = new URL(s.url).hostname; } catch(e) {}
                                        return (
                                          <div key={i} className="w-5 h-5 rounded-full bg-slate-700 border border-slate-800 flex items-center justify-center overflow-hidden">
                                            <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" className="w-3 h-3" onError={(e) => e.currentTarget.style.display = 'none'} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <span>{msg.sources.length} fontes</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}
                          
                          {msg.artifact && (
                            <div className="mt-6 border border-white/10 rounded-2xl overflow-hidden bg-white/5 shadow-lg">
                              <div className="bg-black/40 px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm font-medium text-white/80">
                                <Sparkles className="w-4 h-4 text-aqua" />
                                Artifact Interativo
                              </div>
                              <div className="p-6 overflow-x-auto">
                                {msg.artifact.isLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8 text-white/50 gap-2">
                                    <div className="flex items-center gap-3">
                                      <div className="w-5 h-5 border-2 border-aqua border-t-transparent rounded-full animate-spin" />
                                      Gerando visualização...
                                    </div>
                                    <p className="text-xs opacity-60">Tempo estimado: 1 minuto</p>
                                  </div>
                                ) : msg.artifact.error ? (
                                  <div className="text-red-400 py-4 text-center text-sm">
                                    <p className="font-bold mb-1">Erro ao gerar artifact:</p>
                                    <p className="opacity-80">{typeof msg.artifact.error === 'string' ? msg.artifact.error : 'Erro desconhecido'}</p>
                                  </div>
                                ) : (
                                  <iframe 
                                    srcDoc={`
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <meta charset="UTF-8">
                                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                          <script src="https://cdn.tailwindcss.com"></script>
                                        </head>
                                        <body class="bg-transparent">
                                          ${(msg.artifact.content || '').replace(/src=["'](https:\/\/image\.pollinations\.ai[^"']*)["']/gi, 'data-src="$1"')}
                                          <script>
                                            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                                            
                                            async function loadImagesSequentially() {
                                              const images = document.querySelectorAll('img[data-src]');
                                              
                                              for (let i = 0; i < images.length; i++) {
                                                const img = images[i];
                                                const originalSrc = img.getAttribute('data-src');
                                                
                                                const wrapper = document.createElement('div');
                                                wrapper.className = 'relative flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden ' + (img.className || '');
                                                wrapper.style.minHeight = '200px';
                                                wrapper.style.width = '100%';
                                                
                                                const spinner = document.createElement('div');
                                                spinner.innerHTML = '<div class="flex flex-col items-center gap-2 text-slate-400"><div class="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-medium">Carregando...</span></div>';
                                                wrapper.appendChild(spinner);
                                                
                                                img.parentNode.insertBefore(wrapper, img);
                                                wrapper.appendChild(img);
                                                img.style.display = 'none';
                                                
                                                try {
                                                  await new Promise((resolve, reject) => {
                                                    const tempImg = new Image();
                                                    tempImg.onload = () => resolve(tempImg);
                                                    tempImg.onerror = () => reject(new Error('Failed to load'));
                                                    tempImg.src = originalSrc;
                                                  });
                                                  
                                                  img.src = originalSrc;
                                                  img.style.display = 'block';
                                                  spinner.style.display = 'none';
                                                  
                                                } catch (err) {
                                                  try {
                                                    spinner.innerHTML = '<div class="flex flex-col items-center gap-2 text-slate-400"><div class="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-medium">Gerando com IA...</span></div>';
                                                    
                                                    const url = new URL(originalSrc);
                                                    const promptPath = decodeURIComponent(url.pathname.replace('/prompt/', ''));
                                                    
                                                    const response = await fetch('/api/generate-image', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ prompt: promptPath })
                                                    });
                                                    
                                                    if (!response.ok) throw new Error('Fallback failed');
                                                    const data = await response.json();
                                                    
                                                    img.src = data.imageUrl;
                                                    img.style.display = 'block';
                                                    spinner.style.display = 'none';
                                                    
                                                  } catch (fallbackErr) {
                                                    spinner.innerHTML = '<div class="flex flex-col items-center gap-2 text-red-400"><svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span class="text-sm font-medium text-center">Não foi possível<br/>carregar a imagem</span></div>';
                                                  }
                                                }
                                                
                                                if (i < images.length - 1) {
                                                  await delay(5000);
                                                }
                                              }
                                            }
                                            
                                            loadImagesSequentially();
                                          </script>
                                        </body>
                                      </html>
                                    `}
                                    className="w-full h-[600px] border-none rounded-lg bg-white"
                                    sandbox="allow-scripts allow-same-origin"
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {msg.showActivateImageButton && (
                            <button 
                              onClick={() => {
                                setIsImageToolActive(true);
                                setIsWebSearchActive(false);
                              }}
                              className="mt-3 w-full py-2 bg-aqua/20 hover:bg-aqua/30 border border-aqua/30 rounded-xl text-aqua text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Ativar geração de imagens
                            </button>
                          )}
                          {msg.isImageResponse && (
                            <div className="mt-4 space-y-3">
                              <p className="text-xs text-white/50 italic">
                                Quando o Milly AI 1.0 Image gera uma imagem, não é possível editar, ou alterar alguma coisa nela, aqui no chat.
                              </p>
                              <button 
                                onClick={() => {
                                  setMessages([]);
                                  setIsImageToolActive(true);
                                  setIsWebSearchActive(false);
                                }}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                Gerar mais imagens
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {isGeneratingImage && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-4"
                      >
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border bg-aqua/20 border-aqua/20">
                          <Bot className="w-5 h-5 text-aqua" />
                        </div>
                        <div className="glass-aqua rounded-tl-none p-4 rounded-2xl max-w-[80%] shadow-3d flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-aqua border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-aqua font-medium">Gerando imagem...</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-black relative z-50">
              <div className="max-w-3xl mx-auto">
                {/* Image Previews */}
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 px-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-white/20" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="glass rounded-[32px] border border-white/10 p-2 shadow-3d">
                  {/* Tool Pill Row */}
                  {(isImageToolActive || isWebSearchActive) && (
                    <div className="px-4 pt-2 flex items-center gap-2 flex-wrap">
                      {isImageToolActive && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-xs font-medium">Criar imagem</span>
                          <button 
                            onClick={() => setIsImageToolActive(false)}
                            className="hover:text-white transition-colors ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {isWebSearchActive && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 border border-green-500/30 rounded-full text-green-400">
                          <Globe className="w-4 h-4" />
                          <span className="text-xs font-medium">Busca na web</span>
                          <button 
                            onClick={() => setIsWebSearchActive(false)}
                            className="hover:text-white transition-colors ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Text Input Row */}
                  <div className="px-4 pt-3 pb-1">
                    <input 
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={isGeneratingImage ? "Gerando imagem..." : "Peça à Milly ou use /imagem..."}
                      disabled={isGeneratingImage}
                      className="w-full bg-transparent border-none focus:outline-none text-white placeholder:text-white/20 text-base"
                    />
                  </div>
                  
                  {/* Actions Row */}
                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-1">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-full transition-colors text-white/60"
                        >
                          <Settings2 className="w-4 h-4" />
                          <span className="text-xs font-medium">Ferramentas</span>
                        </button>
                        
                        <AnimatePresence>
                          {isToolsMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 mb-2 w-48 glass border border-white/10 rounded-2xl overflow-hidden shadow-3xl z-[60]"
                            >
                              <div className="p-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsImageToolActive(!isImageToolActive);
                                    if (!isImageToolActive) setIsWebSearchActive(false);
                                    setIsToolsMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isImageToolActive ? 'bg-aqua/20 text-aqua' : 'hover:bg-white/5 text-white/60'}`}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  <span className="text-sm font-medium">Gerar imagens</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsWebSearchActive(!isWebSearchActive);
                                    if (!isWebSearchActive) setIsImageToolActive(false);
                                    setIsToolsMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mt-1 ${isWebSearchActive ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/5 text-white/60'}`}
                                >
                                  <Globe className="w-4 h-4" />
                                  <span className="text-sm font-medium">Busca na web</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 relative">
                      <button 
                        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-full transition-colors text-white/60"
                      >
                        <span className="text-xs font-medium">{chatMode}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isModeMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-2 w-40 glass border border-white/10 rounded-2xl overflow-hidden shadow-3xl z-[60]"
                          >
                            {(['Rápido', 'Raciocínio', 'Pro'] as const).map((mode) => (
                              <button
                                key={mode}
                                disabled={mode !== 'Rápido'}
                                onClick={() => {
                                  if (mode === 'Rápido') {
                                    setChatMode(mode);
                                    setIsModeMenuOpen(false);
                                  }
                                }}
                                className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${
                                  chatMode === mode ? 'bg-aqua/10 text-aqua' : 'hover:bg-white/5 text-white/60'
                                } ${mode !== 'Rápido' ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex flex-col">
                                  <span>{mode}</span>
                                  {mode !== 'Rápido' && <span className="text-[10px] opacity-50">Indisponível</span>}
                                </div>
                                {chatMode === mode && <div className="w-1.5 h-1.5 bg-aqua rounded-full shadow-[0_0_8px_rgba(0,255,213,0.8)]" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/5 text-white/60'}`}
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleSendMessage}
                        className={`ml-1 p-2 rounded-xl flex items-center justify-center transition-all ${inputValue.trim() || attachedImages.length > 0 ? 'bg-aqua text-black shadow-3d' : 'bg-white/5 text-white/20'}`}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sources Sidebar */}
      <AnimatePresence>
        {selectedSources && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSources(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] md:w-96 bg-[#111] border-l border-white/10 z-[80] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                <h3 className="font-bold text-lg text-white">{selectedSources.length} fontes</h3>
                <button onClick={() => setSelectedSources(null)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                <p className="text-xs text-white/40 mb-2">Fontes utilizadas para gerar a resposta:</p>
                {selectedSources.map((source, idx) => {
                  let hostname = "web";
                  try { hostname = new URL(source.url).hostname; } catch(e) {}
                  return (
                    <a 
                      key={idx} 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" className="w-3 h-3" onError={(e) => e.currentTarget.style.display = 'none'} />
                        </div>
                        <span className="text-xs text-white/60 truncate group-hover:text-white/80 transition-colors">{hostname}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-1 line-clamp-2 text-aqua group-hover:underline">{source.title}</h4>
                      <p className="text-xs text-white/50 line-clamp-3 leading-relaxed">{source.content}</p>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
