import { UploadResponse, StatusResponse, ChatRequest, DocumentRecord } from '../types/api';

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
  uploadDocument: async (file: File, expedienteId: string, customName?: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expediente_id', expedienteId);
    if (customName) formData.append('custom_name', customName);
    
    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      
      return await handleResponse(response);
    } catch (error: any) {
      console.error("Upload error:", error);
      throw new Error(error.message || "Error al subir el documento");
    }
  },

  getTaskStatus: async (taskId: string): Promise<StatusResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/status/${taskId}`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        await handleResponse(response);
      }
      return await response.json();
    } catch (error: any) {
      console.error("Status check error:", error);
      throw new Error(error.message || "Error al verificar el estado del documento");
    }
  },

  getDocuments: async (expedienteId?: string): Promise<{ documents: DocumentRecord[] }> => {
    try {
      const url = expedienteId ? `${API_URL}/api/expedientes/${expedienteId}/documents` : `${API_URL}/api/documents`;
      const response = await fetch(url, {
        headers: getHeaders()
      });
      if (!response.ok) await handleResponse(response);
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Error al cargar el historial de documentos");
    }
  },

  getExpedientes: async (): Promise<{ expedientes: any[] }> => {
    try {
      const response = await fetch(`${API_URL}/api/expedientes`, { headers: getHeaders() });
      if (!response.ok) await handleResponse(response);
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Error al cargar expedientes");
    }
  },

  createExpediente: async (nombre: string): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/api/expedientes`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
      });
      if (!response.ok) await handleResponse(response);
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Error al crear expediente");
    }
  },

  updateExpediente: async (id: string, nombre: string): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/api/expedientes/${id}`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
      });
      if (!response.ok) await handleResponse(response);
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Error al actualizar expediente");
    }
  },

  deleteExpediente: async (id: string): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/api/expedientes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) await handleResponse(response);
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Error al eliminar expediente");
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
