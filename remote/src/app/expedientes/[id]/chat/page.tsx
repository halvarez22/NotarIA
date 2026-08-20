"use client";
import { useState, use } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, Bot, User, FileText, Download, FolderOpen, FileBadge } from 'lucide-react';
import { designTokens } from '@/design/tokens';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ChatRemotePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Soy el buscador semántico de este expediente. ¿Qué cláusula o concepto necesitas localizar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock de nombres para la demo (luego esto vendrá de Supabase)
  const expedientesMock: Record<string, string> = {
    '1': 'Escritura Pública 4509 - Compraventa',
    '2': 'Acta Constitutiva "TechCorp S.A."',
    '3': 'Poder General Irrevocable - Martínez',
    '4': 'Contrato de Arrendamiento Comercial',
  };
  const expedienteTitle = expedientesMock[id] || `Expediente ID: ${id}`;

  // Mock de documentos cargados en el expediente
  const documentosMock = [
    { id: 'd1', nombre_personalizado: 'Contrato Principal firmado', filename: 'contrato_final_v2.pdf' },
    { id: 'd2', nombre_personalizado: 'Anexo A - Identificaciones', filename: 'scan_id_001.pdf' },
    { id: 'd3', nombre_personalizado: 'Comprobante de Domicilio', filename: 'CFE_recibo.pdf' },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // 1. Vectorizar pregunta y buscar fragmentos relevantes en Supabase (pgvector) vía HuggingFace
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      });
      
      const searchData = await searchRes.json();
      
      if (!searchRes.ok) {
        throw new Error(searchData.error || 'Error en búsqueda semántica');
      }

      const sources = searchData.results || [];
      const botContent = searchData.answer || "Error al generar respuesta.";

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: botContent,
        sources: sources.map((s: any) => ({ filename: s.filename, similarity: s.similarity }))
      } as any]);

    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error del sistema: ${error.message}` 
      } as any]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen max-w-7xl mx-auto overflow-hidden">
      {/* Panel Principal (Chat) */}
      <div className="flex-1 flex flex-col h-full border-r border-white/5 relative">
        {/* Header */}
        <header className={`flex items-center justify-between p-4 border-b border-white/5 ${designTokens.glass.base} !rounded-none z-10`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/expedientes')}
              className="p-2 rounded-lg hover:bg-white/5 text-[#A8B0B7] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Image src="/logo.png" alt="NotarIA Logo" width={48} height={48} className="rounded-lg object-contain drop-shadow-md hover:scale-105 transition-transform" />
            <div>
              <h2 className="font-semibold text-lg text-[#F5F7F8] line-clamp-1">{expedienteTitle}</h2>
              <div className="flex items-center gap-2 text-xs text-[#35D39A]">
                <span className="w-2 h-2 rounded-full bg-[#35D39A] animate-pulse"></span>
                Conexión Cloud Segura
              </div>
            </div>
          </div>
        </header>

        {/* Area de Chat */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[90%] md:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${msg.role === 'user' ? 'bg-[#14191E] border-white/10' : 'bg-[#D4A43A]/10 border-[#D4A43A]/30 text-[#D4A43A]'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-[#A8B0B7]" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className="flex flex-col gap-2 w-full">
                  <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[#14191E] border border-white/5 rounded-tr-sm text-white' : `${designTokens.glass.base} rounded-tl-sm text-[#F5F7F8]`} w-full`}>
                    {msg.role === 'user' ? (
                      <p className="leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="w-full">
                        {(() => {
                          const content = msg.content;
                          if (content.includes('<think>')) {
                            const parts = content.split('</think>');
                            const thought = parts[0].replace('<think>', '').trim();
                            const answer = parts.length > 1 ? parts[1].trim() : '';
                            return (
                              <div className="flex flex-col gap-4 w-full">
                                <details className="group rounded-xl border border-[#D4A43A]/20 bg-[#D4A43A]/5 overflow-hidden transition-all duration-300">
                                  <summary className="p-3 cursor-pointer text-xs font-semibold text-[#D4A43A] flex items-center select-none hover:bg-[#D4A43A]/10 transition-colors">
                                    <span className="mr-2 group-open:rotate-90 transition-transform">▶</span>
                                    🧠 Proceso de Razonamiento
                                  </summary>
                                  <div className="p-4 pt-1 text-xs text-[#A8B0B7] leading-relaxed whitespace-pre-wrap border-t border-[#D4A43A]/10 mt-1">
                                    {thought}
                                  </div>
                                </details>
                                {answer ? (
                                  <div className="leading-relaxed whitespace-pre-wrap">{answer}</div>
                                ) : (
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span>El proceso de razonamiento excedió el límite de tokens antes de redactar el reporte final.</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return <div className="leading-relaxed whitespace-pre-wrap">{content}</div>;
                        })()}
                      </div>
                    )}
                  </div>
                  {msg.sources && (
                    <div className="flex flex-col gap-2 mt-1">
                      <span className="text-xs text-[#A8B0B7] font-medium ml-1">Fuentes extraídas:</span>
                      {(msg.sources as any).map((src: any, j: number) => (
                        <div key={j} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#D4A43A]/50 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-[#D4A43A]" />
                            <span className="text-sm font-medium text-[#A8B0B7] group-hover:text-white transition-colors">{src.filename}</span>
                          </div>
                          <Download className="w-4 h-4 text-[#A8B0B7] group-hover:text-[#D4A43A] transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#D4A43A]/10 border border-[#D4A43A]/30 text-[#D4A43A]">
                  <Bot className="w-4 h-4" />
              </div>
              <div className={`p-4 rounded-2xl ${designTokens.glass.base} rounded-tl-sm flex items-center gap-2`}>
                  <span className="w-2 h-2 rounded-full bg-[#D4A43A] animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-[#D4A43A] animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 rounded-full bg-[#D4A43A] animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t border-white/5 ${designTokens.glass.base} !rounded-none z-10`}>
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Pregunta sobre este expediente..."
              className={`w-full pl-4 pr-14 py-4 rounded-2xl text-white outline-none transition-all ${designTokens.glass.input} disabled:opacity-50`}
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 rounded-xl bg-gradient-to-r from-[#B9821C] to-[#D4A43A] text-[#0B0F12] disabled:opacity-50 hover:scale-105 transition-transform"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-[10px] text-[#A8B0B7] mt-3">
            Groq RAG Inference. NotarIA puede cometer errores. Verifica siempre el PDF original.
          </p>
        </div>
      </div>

      {/* Sidebar de Documentos (Solo Desktop/Tablet, oculta en móviles muy pequeños) */}
      <div className="hidden md:flex flex-col w-80 h-full p-4 bg-[#0B0F12]/80 border-l border-white/5">
        <div className="flex items-center gap-2 mb-6 mt-2">
          <FolderOpen className="w-5 h-5 text-[#D4A43A]" />
          <h3 className="font-semibold text-[#F5F7F8]">Documentos Cargados</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {documentosMock.map((doc, i) => (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-xl ${designTokens.glass.base} hover:bg-white/5 transition-colors cursor-pointer group`}
            >
              <div className="flex items-start gap-3">
                <FileBadge className="w-5 h-5 text-[#D4A43A] shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-[#F5F7F8] truncate group-hover:text-[#D4A43A] transition-colors" title={doc.nombre_personalizado}>
                    {doc.nombre_personalizado}
                  </p>
                  <p className="text-xs text-[#A8B0B7] truncate mt-1" title={doc.filename}>
                    {doc.filename}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
