import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '../hooks/useChat';

interface ChatScreenProps {
  documentId: string;
  onReset: () => void;
}

export function ChatScreen({ documentId, onReset }: ChatScreenProps) {
  const { messages, streamingContent, isStreaming, error, sendMessage, stopGeneration } = useChat(documentId);
  const [inputValue, setInputValue] = useState('');
  
  // Referencia al final del contenedor para auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll suave (U-First, Regla 4)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-full bg-brand-darkest text-gray-200 shadow-xl border border-brand-medium rounded-lg overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-brand-dark border-b border-brand-medium">
        <div>
          <h2 className="text-xl font-bold text-brand-gold">Asistente NotarIA</h2>
          <p className="text-xs text-green-400">ID: {documentId.slice(0, 10)}... • Llama3.1:8b</p>
        </div>
        <button 
          onClick={onReset}
          className="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white"
        >
          Nuevo Documento
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Pregúntame sobre cualquier artículo o cláusula del documento.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-4 rounded-xl shadow ${
                msg.role === 'user' 
                  ? 'bg-brand-gold text-brand-darkest rounded-br-none' 
                  : 'bg-brand-medium text-white rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {/* Burbuja temporal del asistente para el streaming (Fase 1) */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-xl shadow bg-brand-medium text-white rounded-bl-none">
              <p className="whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
              {streamingContent === '' && (
                <div className="flex space-x-1 items-center h-4 mt-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Error Bubble */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/30 border border-red-500 text-red-300 p-3 rounded-lg text-sm max-w-[80%] text-center">
              <span className="font-bold">Error:</span> {error}
              <div className="mt-2">
                <button 
                  onClick={() => sendMessage(inputValue || 'Reintentar última consulta')} 
                  className="underline text-brand-gold hover:text-yellow-400"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-brand-dark border-t border-brand-medium">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isStreaming}
            placeholder="Pregunta sobre el documento..."
            className="flex-1 bg-brand-darkest border border-brand-medium rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 transition-colors"
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center shadow-lg"
              title="Detener generación"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" strokeWidth="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-6 py-3 bg-brand-gold hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-400 text-brand-darkest font-bold rounded-lg transition-colors flex items-center shadow-lg"
            >
              Enviar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
