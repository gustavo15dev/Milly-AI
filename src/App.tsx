/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Benchmark from "./components/Benchmark";
import { 
  Sparkles, 
  Sparkle,
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
  ChevronDown,
  CheckCircle2,
  Link2
} from "lucide-react";

const SearchLog = ({ query, sources, isSearching }: { query?: string, sources?: any[], isSearching?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedWhileSearching, setHasOpenedWhileSearching] = useState(false);

  // Auto-close when search finishes if it was opened during search
  useEffect(() => {
    if (!isSearching && hasOpenedWhileSearching) {
      setIsOpen(false);
      setHasOpenedWhileSearching(false);
    }
  }, [isSearching, hasOpenedWhileSearching]);

  if (isSearching && (!sources || sources.length === 0)) {
    return (
      <div className="mb-4 font-sans">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          Pesquisando na web...
        </div>
      </div>
    );
  }

  if (!isSearching && (!sources || sources.length === 0)) {
    return (
      <div className="mb-4 font-sans">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
          <Globe className="w-4 h-4" />
          Pesquisa na web falhou ou não retornou resultados.
        </div>
      </div>
    );
  }

  const favicons = Array.from(new Set((sources || []).map(s => {
    try {
      return new URL(s.url).hostname;
    } catch {
      return '';
    }
  }).filter(Boolean))).slice(0, 3).map(hostname => `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`);

  return (
    <div className="mb-4 font-sans">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (isSearching) setHasOpenedWhileSearching(!isOpen);
        }}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
      >
        {isSearching ? (
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="flex -space-x-2 mr-1">
            {favicons.map((icon, i) => (
              <img key={i} src={icon} alt="" className="w-5 h-5 rounded-full border-2 border-white bg-white shadow-sm" />
            ))}
          </div>
        )}
        {isSearching ? "Pesquisando na web" : "Pesquisou na web"}
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && sources && sources.length > 0 && (
        <div className="mt-4 pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative border-l border-slate-300 ml-2 pl-6 pb-6">
            <div className="absolute -left-[11px] top-0 bg-white text-slate-400">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-600 text-sm">{query || "Pesquisa na web"}</span>
              <span className="text-slate-400 text-xs">{sources.length} resultados</span>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {sources.map((source, idx) => {
                let hostname = '';
                try {
                  hostname = new URL(source.url).hostname;
                } catch (e) {}
                
                return (
                  <a 
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} 
                        alt="" 
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                        {source.title}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-4 truncate max-w-[120px]">
                      {hostname.replace('www.', '')}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
          
          <div className="relative ml-2 pl-6">
            <div className="absolute -left-[11px] top-0 bg-white text-slate-400">
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <span className="text-slate-700 text-sm">{isSearching ? "Lendo fontes..." : "Concluído"}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const LOADING_PHRASES = [
  "Analisando sua solicitação...",
  "Consultando dados...",
  "Estruturando o raciocínio...",
  "Construindo a solução...",
  "Refinando os detalhes...",
  "Validando informações...",
  "Sintetizando a resposta...",
  "Organizando o layout...",
  "Finalizando o processamento...",
  "Quase lá..."
];

const LoadingIndicator = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
      <span className="transition-opacity duration-500 ease-in-out">{LOADING_PHRASES[index]}</span>
    </div>
  );
};

const MermaidIframe = ({ srcDoc }: { srcDoc: string }) => {
  const localId = React.useId();
  const idValue = React.useMemo(() => localId.replace(/:/g, ''), [localId]);
  const [height, setHeight] = useState(200);
  const injectedSrcDoc = srcDoc.replace(/__UUID__/g, idValue);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'resize_mermaid' && e.data.id === idValue) {
        setHeight(Math.max(150, e.data.height + 20));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [idValue]);

  return (
    <div className="my-6 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white transition-all duration-300">
      <iframe 
        srcDoc={injectedSrcDoc} 
        className="w-full border-0 transition-all duration-300"
        style={{ height: `${height}px` }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

const SimulacaoIframe = ({ srcDoc }: { srcDoc: string }) => {
  const localId = React.useId();
  const idValue = React.useMemo(() => localId.replace(/:/g, ''), [localId]);
  const [height, setHeight] = useState(250);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'resize_simulacao' && e.data.id === idValue) {
        setHeight(Math.max(100, e.data.height + 20));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [idValue]);

  // Inject ResizeObserver script
  const scriptToInject = `
    <script>
      const obs = new ResizeObserver(() => {
        window.parent.postMessage({ type: 'resize_simulacao', id: '${idValue}', height: document.documentElement.scrollHeight }, '*');
      });
      obs.observe(document.body);
    </script>
  `;
  
  let finalSrc = srcDoc;
  if (finalSrc.includes('</body>')) {
    finalSrc = finalSrc.replace('</body>', scriptToInject + '</body>');
  } else {
    finalSrc += scriptToInject;
  }

  return (
    <div className="my-6 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white transition-all duration-300">
      <iframe 
        srcDoc={finalSrc} 
        className="w-full border-0 transition-all duration-300"
        style={{ height: `${height}px` }}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
};

// Crie o componente TimelineIframe interceptor:
const TimelineIframe = ({ srcDoc }: { srcDoc: string }) => {
  const localId = React.useId();
  const idValue = React.useMemo(() => localId.replace(/:/g, ''), [localId]);
  const [height, setHeight] = useState(250);
  const injectedSrcDoc = srcDoc.replace(/__UUID__/g, idValue);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'resize_timeline' && e.data.id === idValue) {
        setHeight(Math.max(250, e.data.height + 40));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [idValue]);

  return (
    <div className="my-6 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white transition-all duration-300">
      <iframe 
        srcDoc={injectedSrcDoc} 
        className="w-full border-0 transition-all duration-300"
        style={{ height: `${height}px` }}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
};

const StreamingContext = createContext<boolean | undefined>(false);

const MemoizedMarkdownComponents = {
  h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold mt-5 mb-3 text-slate-900" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-slate-900" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-slate-900" {...props} />,
  p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 whitespace-pre-wrap leading-relaxed break-words" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-4" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-4" {...props} />,
  li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
  code: ({node, inline, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const isStreaming = useContext(StreamingContext);
    
    if (!inline && match && match[1] === 'html_chart') {
      return (
        <div className="my-6 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
          <iframe 
            srcDoc={String(children).replace(/\n$/, '')} 
            className="w-full h-[450px] border-0"
            sandbox="allow-scripts"
          />
        </div>
      );
    } else if (!inline && match && match[1] === 'html_mermaid') {
      return <MermaidIframe srcDoc={String(children).replace(/\n$/, '')} />;
    } else if (!inline && match && match[1] === 'html_timeline') {
      return <TimelineIframe srcDoc={String(children).replace(/\n$/, '')} />;
    } else if (!inline && match && match[1] === 'html_slider') {
      return <SimulacaoIframe srcDoc={String(children).replace(/\n$/, '')} />;
    } else if (!inline && match && (match[1] === 'html_editor' || match[1] === 'html' || match[1] === 'css' || match[1] === 'javascript' || match[1] === 'js')) {
      let codeStr = String(children).replace(/\n$/, '');
      if (match[1] === 'css' && !codeStr.includes('<style')) {
        codeStr = `<!DOCTYPE html>\n<html>\n<head>\n<!-- OVERRIDE DE SEGURANÇA: CSS DETECTADO -->\n<style>\n${codeStr}\n</style>\n</head>\n<body>\n</body>\n</html>`;
      } else if ((match[1] === 'javascript' || match[1] === 'js') && !codeStr.includes('<script')) {
        codeStr = `<!DOCTYPE html>\n<html>\n<body>\n<!-- OVERRIDE DE SEGURANÇA: JS DETECTADO -->\n<script>\n${codeStr}\n</script>\n</body>\n</html>`;
      }
      return <LiveEditorCard initialCode={codeStr} isStreaming={isStreaming} defaultMode="edit" />;
    }

    if (!inline && match) {
      return (
        <div className="relative group my-6 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase">{match[1]}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="Copiar código"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
          <SyntaxHighlighter
            language={match[1]}
            style={vscDarkPlus}
            customStyle={{ margin: 0, borderRadius: 0, padding: '16px', fontSize: '13px' }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    }

    if (!inline) {
      return (
        <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
          <code className="text-sm font-mono text-slate-800 whitespace-pre-wrap break-words" {...props}>{children}</code>
        </div>
      );
    }

    return (
      <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({node, children, ...props}: any) => <>{children}</>,
  a: ({node, href, children, ...props}: any) => {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" {...props}>{children}</a>;
  },
  strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900" {...props} />,
  em: ({node, ...props}: any) => <em className="italic" {...props} />,
  mark: ({node, ...props}: any) => <mark className="bg-yellow-200 text-slate-900 px-1.5 py-0.5 rounded-md font-medium" {...props} />,
  table: ({node, ...props}: any) => (
    <div className="overflow-x-auto mb-4 rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200" {...props} />
    </div>
  ),
  thead: ({node, ...props}: any) => <thead className="bg-slate-50" {...props} />,
  tbody: ({node, ...props}: any) => <tbody className="divide-y divide-slate-200 bg-white" {...props} />,
  tr: ({node, ...props}: any) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
  th: ({node, ...props}: any) => <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" {...props} />,
  td: ({node, ...props}: any) => <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap" {...props} />
};

const TypewriterMarkdown = ({ content, isStreaming, onContentChange, sources }: { content: string, isStreaming?: boolean, onContentChange?: () => void, sources?: any[] }) => {
  const wasStreaming = useRef(isStreaming);
  const [displayedContent, setDisplayedContent] = useState(wasStreaming.current ? '' : content);

  useEffect(() => {
    if (!wasStreaming.current) {
      setDisplayedContent(content);
      if (onContentChange) onContentChange();
      return;
    }

    if (displayedContent.length < content.length) {
      // Fast-forward logic: if we are inside a code block, show everything received so far
      const lastCodeBlockStart = displayedContent.lastIndexOf('```');
      const startsCode = lastCodeBlockStart !== -1;
      const lastCodeBlockEnd = displayedContent.indexOf('```', lastCodeBlockStart + 3);
      const isInsideCodeBlock = startsCode && lastCodeBlockEnd === -1;

      if (isInsideCodeBlock) {
        setDisplayedContent(content);
        return;
      }

      const timeout = setTimeout(() => {
        setDisplayedContent(prev => {
          const diff = content.length - prev.length;
          const charsToAdd = Math.max(2, Math.min(12, Math.ceil(diff / 2)));
          return content.slice(0, prev.length + charsToAdd);
        });
      }, 5);
      return () => clearTimeout(timeout);
    }
  }, [content, displayedContent]);

  useEffect(() => {
    if (onContentChange) {
      onContentChange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedContent]);

  return (
    <StreamingContext.Provider value={isStreaming}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
        components={MemoizedMarkdownComponents}
      >
        {displayedContent}
      </ReactMarkdown>
    </StreamingContext.Provider>
  );
};

import { WeatherCard } from './components/WeatherCard';
import { MapCard } from './components/MapCard';
import { AudioPlayerCard } from './components/AudioPlayerCard';
import { LiveEditorCard } from './components/LiveEditorCard';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'chat' | 'benchmark'>('landing');
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
    searchImages?: string[];
    followUpQuestions?: string[];
    searchAnswer?: string;
    searchQuery?: string;
    isSearching?: boolean;
    isClassifying?: boolean;
    isStreaming?: boolean;
    weatherCity?: string;
    mapLocation?: string;
    musicTrack?: string;
  }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatMode, setChatMode] = useState<'Rápido' | 'Raciocínio' | 'Pro'>('Rápido');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isImageToolActive, setIsImageToolActive] = useState(false);
  const [selectedSources, setSelectedSources] = useState<{ title: string; url: string; content: string }[] | null>(null);
  const [selectedImageGallery, setSelectedImageGallery] = useState<{images: string[], currentIndex: number} | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [imageServiceStatus, setImageServiceStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        try {
          const res = await fetch('/api/image-service');
          const data = await res.json();
          setImageServiceStatus(data.service || "Desconhecido");
        } catch (err) {
          setImageServiceStatus("Erro ao checar serviço");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Checks scroll position to see if user has scrolled up
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150; // 150px threshold
      setIsUserScrolledUp(!isNearBottom);
    }
  };

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

  const scrollToBottom = (force = false, smooth = true) => {
    if (scrollAreaRef.current) {
      if (!isUserScrolledUp || force) {
        scrollAreaRef.current.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "auto"
        });
      }
    }
  };

  useEffect(() => {
    scrollToBottom(false);
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
    
    // Force scroll when user sends message
    setTimeout(() => scrollToBottom(true), 10);

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

      const response = await fetch('/api/chat', {
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
          model: "llama-3.1-8b-instant"
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro do servidor (${response.status})`);
        }
        throw new Error(`Erro de comunicação (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      
      let aiMessage = { role: 'ai' as const, content: '', isStreaming: true };
      setMessages(prev => [...prev, aiMessage]);
      
      let finalContent = "";
      let artifactPrompt = null;
      let aiMessageIndex = -1;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim() === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'chunk') {
                finalContent += data.content;
              }

              if (data.type === 'error') {
                throw new Error(data.error);
              }
              
              setMessages(prev => {
                const newMsgs = [...prev];
                if (aiMessageIndex === -1) {
                  aiMessageIndex = newMsgs.length - 1;
                }
                const currentMsg = newMsgs[aiMessageIndex];
                
                if (data.type === 'classifier_start') {
                  newMsgs[aiMessageIndex] = { ...currentMsg, isClassifying: true };
                } else if (data.type === 'search_start') {
                  newMsgs[aiMessageIndex] = { ...currentMsg, isClassifying: false, searchQuery: data.query, isSearching: true };
                } else if (data.type === 'weather_start') {
                  newMsgs[aiMessageIndex] = { ...currentMsg, weatherCity: data.city };
                } else if (data.type === 'map_start') {
                  newMsgs[aiMessageIndex] = { ...currentMsg, mapLocation: data.location };
                } else if (data.type === 'music_start') {
                  newMsgs[aiMessageIndex] = { ...currentMsg, musicTrack: data.query };
                } else if (data.type === 'search_complete') {
                  newMsgs[aiMessageIndex] = { 
                    ...currentMsg, 
                    isClassifying: false,
                    isSearching: false,
                    sources: data.sources,
                    searchImages: data.images,
                    followUpQuestions: data.followUpQuestions,
                    searchAnswer: data.searchAnswer
                  };
                } else if (data.type === 'chunk') {
                  newMsgs[aiMessageIndex] = { ...currentMsg, isClassifying: false, content: finalContent };
                }
                return newMsgs;
              });
            } catch (e: any) {
              if (e.message && e.message.includes('413') || e.message.includes('error')) {
                throw e; // Roda pro try/catch mestre
              }
            }
          }
        }
      }

      const artifactMatch = finalContent.match(/<artifact>([\s\S]*?)<\/artifact>/);
      if (artifactMatch) {
        artifactPrompt = artifactMatch[1];
        finalContent = finalContent.replace(artifactMatch[0], '').trim();
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[aiMessageIndex] = { 
            ...newMsgs[aiMessageIndex], 
            content: finalContent,
            artifact: { prompt: artifactPrompt, isLoading: true }
          };
          return newMsgs;
        });
        
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
            if (aiMessageIndex !== -1) {
              newMessages[aiMessageIndex] = {
                ...newMessages[aiMessageIndex],
                artifact: {
                  ...newMessages[aiMessageIndex].artifact!,
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
            if (aiMessageIndex !== -1) {
              newMessages[aiMessageIndex] = {
                ...newMessages[aiMessageIndex],
                artifact: {
                  ...newMessages[aiMessageIndex].artifact!,
                  isLoading: false,
                  error: isTimeout ? "O tempo limite de geração foi excedido (60s). Tente novamente." : (e.message || true)
                }
              };
            }
            return newMessages;
          });
        }
      }
      
      setMessages(prev => {
        const newMsgs = [...prev];
        if (aiMessageIndex !== -1) {
          newMsgs[aiMessageIndex] = { ...newMsgs[aiMessageIndex], isStreaming: false };
        }
        return newMsgs;
      });
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'ai' as const, content: error.message || "Desculpe, ocorreu um erro ao processar sua mensagem. Verifique se a chave da API Groq está configurada." }]);
    }
  };

  if (view === 'benchmark') {
    return <Benchmark onBack={() => setView('landing')} />;
  }

  return (
    <div className="h-screen w-full bg-white text-slate-900 font-sans relative flex flex-col overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-100 rounded-full blur-[120px] pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-1 w-full flex flex-col overflow-y-auto"
          >
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl px-6 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight text-slate-900">Milly <span className="text-blue-600">AI 1</span></span>
                </div>
                
                <div className="hidden md:flex items-center gap-4">
                  <button 
                    onClick={() => { setView('chat'); setMessages([]); }}
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                  >
                    Começar
                  </button>
                </div>

                <button className="md:hidden text-slate-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
                  className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl pt-24 px-6 md:hidden"
                >
                  <div className="flex flex-col gap-6 text-2xl font-display font-bold">
                    <button 
                      onClick={() => { setView('chat'); setMessages([]); setIsMenuOpen(false); }}
                      className="bg-slate-900 text-white w-full py-4 rounded-2xl mt-4"
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">
                    <Sparkles className="w-3 h-3" />
                    A Próxima Geração de IA
                  </div>
                  
                  <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] mb-6 text-slate-900">
                    Inteligência que <br />
                    <span className="text-blue-600">Sente e Evolui.</span>
                  </h1>
                  
                  <p className="text-slate-600 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
                    Milly AI 1 redefine a interação humano-máquina com um design imersivo e processamento neural de ultra-velocidade.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => { setView('chat'); setMessages([]); }}
                      className="group relative bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-sm overflow-hidden transition-all hover:scale-105 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Começar <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    </button>
                    
                    <button 
                      onClick={() => setView('benchmark')}
                      className="bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 px-10 py-4 rounded-2xl font-bold text-lg text-slate-700 flex items-center gap-2"
                    >
                      <BarChart3 className="w-5 h-5" />
                      Benchmarks
                    </button>
                  </div>

                  <div className="mt-16 grid grid-cols-3 gap-8">
                    <div>
                      <div className="text-3xl font-display font-bold text-blue-600">99.9%</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mt-1">Precisão</div>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-blue-600">1.2ms</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mt-1">Latência</div>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-blue-600">24/7</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mt-1">Atividade</div>
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
                      className="absolute inset-0 border-2 border-slate-200 rounded-full"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-[10%] border border-slate-300 rounded-full border-dashed"
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            "0 0 20px rgba(59, 130, 246, 0.2)",
                            "0 0 60px rgba(59, 130, 246, 0.4)",
                            "0 0 20px rgba(59, 130, 246, 0.2)"
                          ]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-[60%] h-[60%] bg-gradient-to-br from-blue-500 to-blue-700 rounded-[40px] flex items-center justify-center relative overflow-hidden group shadow-lg"
                      >
                        <div className="absolute inset-2 bg-white/20 backdrop-blur-sm rounded-[32px] border border-white/40 flex items-center justify-center">
                          <Cpu className="w-24 h-24 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                        <motion.div 
                          animate={{ top: ["-10%", "110%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-[2px] bg-white/80 blur-[2px] z-20"
                        />
                      </motion.div>
                    </div>

                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-[10%] right-[5%] bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-lg z-30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Status</div>
                          <div className="text-sm font-bold text-slate-900">Otimizado</div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* Milly Artifact 1.0 Card */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="mt-24 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2rem] blur-xl opacity-20" />
                <div className="relative bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                  
                  <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-600 text-xs font-bold uppercase tracking-widest mb-6">
                      <Sparkles className="w-3 h-3" />
                      Novo Projeto
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
                      Milly Artifact 1.0
                    </h2>
                    
                    <p className="text-slate-600 text-lg leading-relaxed mb-8">
                      O projeto Milly Artifact 1.0 traz o visual para o usuário com confiabilidade, rapidez e qualidade. 
                      Gere infográficos, dashboards, mapas mentais e resumos visuais ricos e detalhados diretamente no chat, 
                      transformando dados complexos em interfaces elegantes e fáceis de entender.
                    </p>
                    
                    <div className="grid sm:grid-cols-3 gap-6">
                      <div className="flex flex-col gap-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Sparkle className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900">Visual Rico</h3>
                        <p className="text-sm text-slate-500">Interfaces modernas com Tailwind CSS e componentes interativos.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900">Confiabilidade</h3>
                        <p className="text-sm text-slate-500">Dados precisos estruturados de forma clara e objetiva.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900">Rapidez</h3>
                        <p className="text-sm text-slate-500">Geração instantânea de componentes visuais complexos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex-1 w-full flex flex-col bg-white/90 backdrop-blur-md z-10 overflow-hidden"
          >
            {/* Chat Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50 sticky top-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('landing')}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                    <Sparkle className="w-8 h-8 text-slate-900 fill-slate-900" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg leading-none text-slate-900">Milly AI 1</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Online</span>
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
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-700 text-sm font-medium mr-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova conversa
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <Shield className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </header>

            {/* Chat Messages Area */}
            <div 
              ref={scrollAreaRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-6 relative bg-white scroll-smooth"
            >
              <div className="max-w-5xl mx-auto">
                {messages.length === 0 ? (
                  <div className="min-h-[60vh] flex items-center justify-center">
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl md:text-5xl font-display font-bold text-slate-200 text-center"
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
                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'justify-center w-full'}`}
                      >
                        <div className={`${msg.role === 'ai' ? 'bg-transparent max-w-3xl mx-auto w-full' : 'bg-slate-100 rounded-tr-none shadow-sm max-w-[85%] w-fit'} p-6 rounded-2xl`}>
                          {msg.images && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {msg.images.map((img, i) => (
                                <img key={i} src={img} alt="Anexo" className="w-20 h-20 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                              ))}
                            </div>
                          )}
                          {msg.generatedImage && (
                            <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 shadow-lg max-w-sm mx-auto">
                              <img src={msg.generatedImage} alt="Gerada pela IA" className="w-full h-auto" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          {msg.role === 'ai' ? (
                            <div className="markdown-body text-sm leading-relaxed text-slate-800">
                              {msg.isClassifying && <LoadingIndicator />}
                              {(msg.isSearching || msg.searchQuery || (msg.sources && msg.sources.length > 0)) && (
                                <SearchLog query={msg.searchQuery} sources={msg.sources} isSearching={msg.isSearching} />
                              )}
                              
                              {msg.searchImages && msg.searchImages.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide snap-x">
                                  {msg.searchImages.map((imgUrl, i) => {
                                    const urlStr = typeof imgUrl === 'string' ? imgUrl : (imgUrl as any).url;
                                    return (
                                      <button 
                                        key={i} 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setSelectedImageGallery({
                                            images: msg.searchImages!.map(img => typeof img === 'string' ? img : (img as any).url),
                                            currentIndex: i
                                          });
                                        }}
                                        className="flex-shrink-0 snap-start cursor-pointer focus:outline-none"
                                      >
                                        <img 
                                          src={`https://wsrv.nl/?url=${encodeURIComponent(urlStr)}`} 
                                          alt={`Search result ${i + 1}`} 
                                          className="h-32 w-auto min-w-[120px] object-cover rounded-xl border border-slate-200 hover:shadow-md transition-all hover:scale-[1.02]" 
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            (e.currentTarget.parentNode as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {msg.mapLocation && (
                                <MapCard location={msg.mapLocation} />
                              )}

                              {msg.musicTrack && (
                                <AudioPlayerCard query={msg.musicTrack} />
                              )}

                              {msg.weatherCity && (
                                <WeatherCard city={msg.weatherCity} />
                              )}

                              <TypewriterMarkdown 
                                content={msg.content} 
                                isStreaming={msg.isStreaming}
                                onContentChange={() => scrollToBottom(false)}
                                sources={msg.sources}
                              />
                              
                              {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                                <div className="mt-6 flex flex-col gap-4 pt-4">
                                  <div className="mt-2">
                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Acompanhamentos</h4>
                                    <div className="flex flex-col gap-2">
                                      {msg.followUpQuestions.map((q, i) => (
                                        <button 
                                          key={i}
                                          onClick={() => setInputValue(q)}
                                          className="text-left text-sm text-slate-600 hover:text-blue-600 hover:underline flex items-start gap-2"
                                        >
                                          <span className="text-slate-400 mt-0.5">↳</span> {q}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}
                          
                          {msg.artifact && (
                            <div className="mt-6 border border-slate-200 rounded-2xl bg-slate-50 shadow-sm flex flex-col max-h-[80vh]">
                              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 shrink-0">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                Artifact Interativo
                              </div>
                              <div className="p-6 overflow-y-auto scroll-smooth flex-1">
                                {msg.artifact.isLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                                    <div className="flex items-center gap-3">
                                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                      Gerando visualização...
                                    </div>
                                    <p className="text-xs opacity-80">Tempo estimado: 1 minuto</p>
                                  </div>
                                ) : msg.artifact.error ? (
                                  <div className="text-red-500 py-4 text-center text-sm">
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
                              }}
                              className="mt-3 w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-600 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Ativar geração de imagens
                            </button>
                          )}
                          {msg.isImageResponse && (
                            <div className="mt-4 space-y-3">
                              <p className="text-xs text-slate-500 italic">
                                Quando o Milly AI 1.0 Image gera uma imagem, não é possível editar, ou alterar alguma coisa nela, aqui no chat.
                              </p>
                              <button 
                                onClick={() => {
                                  setMessages([]);
                                  setIsImageToolActive(true);
                                }}
                                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium transition-colors flex items-center justify-center gap-2"
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
                        className="flex gap-4 justify-center w-full"
                      >
                        <div className="bg-white p-6 rounded-2xl max-w-3xl mx-auto w-full flex items-center gap-3 shadow-sm">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-blue-600 font-medium">Gerando imagem...</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-white relative z-50 border-t border-slate-100">
              <div className="max-w-3xl mx-auto">
                {/* Image Previews */}
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 px-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-slate-200" referrerPolicy="no-referrer" />
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

                <div className="bg-slate-50 rounded-[32px] border border-slate-200 p-2 shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition-all">
                  {/* Tool Pill Row */}
                  {isImageToolActive && (
                    <div className="px-4 pt-2 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-600">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-medium">Criar imagem</span>
                        <button 
                          onClick={() => setIsImageToolActive(false)}
                          className="hover:text-blue-800 transition-colors ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
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
                      className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400 text-base"
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
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
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
                              className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg z-[60]"
                            >
                              <div className="p-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsImageToolActive(!isImageToolActive);
                                    setIsToolsMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isImageToolActive ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  <span className="text-sm font-medium">Gerar imagens</span>
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
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
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
                            className="absolute bottom-full right-0 mb-2 w-40 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg z-[60]"
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
                                  chatMode === mode ? 'bg-slate-50 text-slate-900 font-medium' : 'hover:bg-slate-50 text-slate-600'
                                } ${mode !== 'Rápido' ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex flex-col">
                                  <span>{mode}</span>
                                  {mode !== 'Rápido' && <span className="text-[10px] opacity-70">Indisponível</span>}
                                </div>
                                {chatMode === mode && <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-200 text-slate-500'}`}
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleSendMessage}
                        className={`ml-1 p-2 rounded-xl flex items-center justify-center transition-all ${inputValue.trim() || attachedImages.length > 0 ? 'bg-black text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}
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
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[70] md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] md:w-96 bg-white border-l border-slate-200 z-[80] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-lg text-slate-900">{selectedSources.length} fontes</h3>
                <button onClick={() => setSelectedSources(null)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                <p className="text-xs text-slate-500 mb-2">Fontes utilizadas para gerar a resposta:</p>
                {selectedSources.map((source, idx) => {
                  let hostname = "web";
                  try { hostname = new URL(source.url).hostname; } catch(e) {}
                  return (
                    <a 
                      key={idx} 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" className="w-3 h-3" onError={(e) => e.currentTarget.style.display = 'none'} />
                        </div>
                        <span className="text-xs text-slate-500 truncate group-hover:text-slate-700 transition-colors">{hostname}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-1 line-clamp-2 text-blue-600 group-hover:underline">{source.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{source.content}</p>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Image Gallery Modal */}
      <AnimatePresence>
        {selectedImageGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <button 
              onClick={() => setSelectedImageGallery(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-full h-full max-w-7xl flex flex-col md:flex-row gap-4 md:gap-8">
              {/* Main Image */}
              <div className="flex-1 relative flex items-center justify-center min-h-[50vh] md:min-h-0">
                <img 
                  src={`https://wsrv.nl/?url=${encodeURIComponent(selectedImageGallery.images[selectedImageGallery.currentIndex])}`}
                  alt="Gallery main"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
                
                {/* Navigation Arrows */}
                {selectedImageGallery.currentIndex > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageGallery(prev => prev ? {...prev, currentIndex: prev.currentIndex - 1} : null);
                    }}
                    className="absolute left-4 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                )}
                {selectedImageGallery.currentIndex < selectedImageGallery.images.length - 1 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageGallery(prev => prev ? {...prev, currentIndex: prev.currentIndex + 1} : null);
                    }}
                    className="absolute right-4 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Thumbnails Sidebar */}
              <div className="w-full md:w-80 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-4 md:pb-0 scrollbar-hide">
                {selectedImageGallery.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageGallery(prev => prev ? {...prev, currentIndex: idx} : null)}
                    className={`relative flex-shrink-0 w-24 h-24 md:w-full md:h-48 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === selectedImageGallery.currentIndex ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={`https://wsrv.nl/?url=${encodeURIComponent(img)}`}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Service Status Modal (Debug) */}
      <AnimatePresence>
        {imageServiceStatus && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-[100] border border-slate-200"
          >
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => setImageServiceStatus(null)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 pr-8">Serviço de Imagem Ativo</h2>
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700">
                {imageServiceStatus}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
