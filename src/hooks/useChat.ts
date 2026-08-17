import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useChat(documentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Guardamos el AbortController para poder cancelar la petición `fetch` en vuelo.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup: Cancelar el stream si el componente se desmonta (ej. al cambiar de documento)
  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, []);

  const sendMessage = async (query: string) => {
    if (!query.trim()) return;

    // Agregar el mensaje del usuario inmediatamente y preparar el placeholder del asistente
    setMessages(prev => [
      ...prev,
      { role: 'user', content: query },
      { role: 'assistant', content: '' }
    ]);
    setError(null);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await apiClient.streamChat(documentId, query, abortControllerRef.current.signal);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream no soportado');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Formato esperado de SSE: data: {"content": "..."}\n\n
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              break;
            }
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                // Actualizar el último mensaje (del asistente) concatenando el nuevo contenido
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  lastMessage.content += parsed.content || '';
                  return newMessages;
                });
              } catch (e) {
                // ignorar errores de parseo parciales
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generación detenida por el usuario.');
      } else {
        setError(err.message || 'Error al comunicarse con el asistente.');
        // Opcional: remover el último mensaje vacío del asistente si falló al instante
        setMessages(prev => prev.filter(m => m.content !== '' || m.role !== 'assistant'));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopGeneration
  };
}
