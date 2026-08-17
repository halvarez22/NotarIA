import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { BotIcon, UserIcon, PaperclipIcon, SendIcon, SpinnerIcon } from './icons';

interface ChatInterfaceProps {
  documentName: string;
  chatHistory: ChatMessage[];
  onSendQuery: (query: string) => void;
  isLoading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentName, chatHistory, onSendQuery, isLoading }) => {
  const [query, setQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSendQuery(query.trim());
      setQuery('');
    }
  };
  
  const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isModel = message.role === 'model';
    return (
      <div className={`flex items-start gap-3 my-4 ${isModel ? '' : 'justify-end'}`}>
        {isModel && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-medium flex items-center justify-center">
            <BotIcon className="w-5 h-5 text-brand-gold" />
          </div>
        )}
        <div className={`max-w-md p-4 rounded-2xl ${isModel ? 'bg-brand-medium rounded-tl-none' : 'bg-brand-gold text-brand-darkest rounded-br-none'}`}>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        </div>
        {!isModel && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-medium flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="flex flex-col h-full">
      <div className="p-3 mb-4 bg-brand-medium/50 border border-brand-medium rounded-lg flex items-center gap-3">
        <PaperclipIcon className="w-5 h-5 text-brand-gold flex-shrink-0" />
        <span className="text-sm text-gray-300 truncate">
          Analizando actualmente: <span className="font-semibold text-gray-100">{documentName}</span>
        </span>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {chatHistory.map((msg, index) => (
          <ChatBubble key={index} message={msg} />
        ))}
        {isLoading && chatHistory[chatHistory.length - 1]?.role === 'user' && (
           <div className="flex items-start gap-3 my-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-medium flex items-center justify-center">
                  <BotIcon className="w-5 h-5 text-brand-gold" />
              </div>
              <div className="max-w-md p-4 rounded-2xl bg-brand-medium rounded-tl-none flex items-center">
                  <SpinnerIcon className="w-5 h-5 text-brand-gold"/>
              </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Haz una pregunta sobre el documento..."
          className="flex-grow bg-brand-medium border border-brand-medium/50 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-gold text-gray-200 placeholder-gray-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="p-3 bg-brand-gold rounded-lg disabled:bg-brand-medium disabled:cursor-not-allowed hover:bg-opacity-90 transition-colors"
        >
          <SendIcon className="w-6 h-6 text-brand-darkest" />
        </button>
      </form>
    </div>
  );
};