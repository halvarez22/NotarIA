import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useChat(documentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, []);

  const sendMessage = async (query: string) => {
    if (!query.trim()) return;

    // Agregar solo el mensaje del usuario. El asistente se construye en streamingContent.
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setStreamingContent('');
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
      let currentStreamBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
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
                // Concatenamos localmente en la función para evitar dependencias de closures
                currentStreamBuffer += parsed.content || '';
                // Actualizamos el estado exclusivo de streaming
                setStreamingContent(currentStreamBuffer);
              } catch (e) {
                // ignorar errores de parseo parciales
              }
            }
          }
        }
      }
      
      // Una vez terminado, consolidar el buffer final en el array de mensajes
      setMessages(prev => [...prev, { role: 'assistant', content: currentStreamBuffer }]);
      setStreamingContent('');
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generación detenida por el usuario.');
        // Si se abortó a la mitad, guardamos lo que se haya alcanzado a generar
        setMessages(prev => {
           setStreamingContent(prevContent => {
              if (prevContent) {
                 return prevContent; 
              }
              return '';
           });
           return prev; // El setState real lo haremos abajo
        });
        
        // Forma segura de obtener el valor actual:
        setStreamingContent(current => {
          if (current) {
            setMessages(prevMsg => [...prevMsg, { role: 'assistant', content: current }]);
          }
          return '';
        });

      } else {
        setError(err.message || 'Error al comunicarse con el asistente.');
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
      // No hacemos setIsStreaming(false) aquí, dejamos que el catch del AbortError lo maneje
    }
  };

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    stopGeneration
  };
}
