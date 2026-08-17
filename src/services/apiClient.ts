import { UploadResponse, StatusResponse, ChatRequest } from '../types/api';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) || 'http://localhost:8000';
const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) || 'default_dev_key_change_in_production';

// Helper centralizado para agregar los headers de seguridad (Regla 5)
const getHeaders = (isFormData = false) => {
  const headers: HeadersInit = {
    'Authorization': `Bearer ${API_KEY}`
  };
  
  // fetch no requiere Content-Type para FormData (el navegador pone el boundary)
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

// Helper centralizado para manejo de errores de red
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail?.error?.message) {
        errorMessage = errorData.detail.error.message;
      }
    } catch {
      // Ignorar si no es JSON
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const apiClient = {
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData
      });
      return await handleResponse(response);
    } catch (error: any) {
      console.error("Upload error:", error);
      throw new Error(error.message || "Error conectando con el backend local");
    }
  },

  getTaskStatus: async (taskId: string): Promise<StatusResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/status/${taskId}`, {
        method: 'GET',
        headers: getHeaders()
      });
      return await handleResponse(response);
    } catch (error: any) {
      console.error("Status check error:", error);
      throw new Error(error.message || "Error al verificar estado de la tarea");
    }
  },

  // Para streamChat necesitamos devolver la respuesta cruda para procesar el body como stream SSE
  streamChat: async (documentId: string, query: string, signal?: AbortSignal): Promise<Response> => {
    const payload: ChatRequest = { document_id: documentId, query };
    
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
        signal
      });
      
      if (!response.ok) {
        await handleResponse(response); // Lanza error
      }
      return response; // Se consume con response.body.getReader()
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error("Chat error:", error);
      throw new Error(error.message || "Error en el túnel de comunicación con Ollama");
    }
  }
};
