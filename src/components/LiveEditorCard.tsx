import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';

interface LiveEditorCardProps {
  initialCode: string;
  isStreaming?: boolean;
  defaultMode?: 'edit' | 'preview';
}

export const LiveEditorCard: React.FC<LiveEditorCardProps> = ({ initialCode, isStreaming, defaultMode = 'edit' }) => {
  const [code, setCode] = useState(initialCode);
  const [debouncedCode, setDebouncedCode] = useState(initialCode);
  const [mode, setMode] = useState<'edit' | 'preview'>(defaultMode);
  const [copied, setCopied] = useState(false);

  // Sync initialCode when it updates from streaming
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (isStreaming) {
      // While streaming, heavily debounce to avoid "siscadas" (flickering jumps)
      const timer = setTimeout(() => {
        setDebouncedCode(code);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      // Normal debounce when user is typing manually
      const timer = setTimeout(() => {
        setDebouncedCode(code);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [code, isStreaming]);

  const handleRun = () => {
    setMode(mode === 'edit' ? 'preview' : 'edit');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[1200px] border border-[#d0d7de] rounded-[8px] overflow-hidden bg-[#f6f8fa] shadow-[0_2px_8px_rgba(0,0,0,0.05)] my-6 mx-auto font-sans">
      <div className="bg-[#f3f4f6] py-2 px-4 flex justify-between items-center border-b border-[#d0d7de]">
        <span className="text-[12px] font-semibold text-[#57606a]">EDITOR HTML</span>
        <div className="flex gap-2">
          <button 
            onClick={handleRun} 
            className="bg-[#0969da] text-white border border-[#0969da] hover:bg-[#0550ae] py-1.5 px-[14px] rounded-[6px] text-[12px] font-semibold cursor-pointer transition-all"
          >
            {mode === 'edit' ? 'Executar' : 'Ver Código'}
          </button>
          <button 
            onClick={handleCopy} 
            className="bg-white text-[#24292e] border border-[#d0d7de] hover:bg-[#f3f4f6] hover:border-[#1b1f24] py-1.5 px-[14px] rounded-[6px] text-[12px] font-semibold cursor-pointer transition-all"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      
      <div className="relative w-full h-[600px] bg-[#f6f8fa]">
        {mode === 'edit' ? (
          <div className="w-full h-full overflow-auto">
            <Editor
              value={code}
              onValueChange={code => setCode(code)}
              highlight={code => Prism.highlight(code, Prism.languages.markup, 'markup')}
              padding={20}
              style={{
                fontFamily: '"ui-monospace", "SFMono-Regular", "Consolas", "Liberation Mono", monospace',
                fontSize: 14,
                lineHeight: 1.5,
                minHeight: '100%',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#24292e'
              }}
              textareaClassName="focus:outline-none w-full h-full box-border"
            />
          </div>
        ) : (
          <iframe
            srcDoc={debouncedCode}
            className="w-full h-full border-none bg-white block"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
};
