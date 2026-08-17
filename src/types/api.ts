export interface UploadResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'error';
}

export interface StatusResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'error' | 'not_found';
}

export interface ChatRequest {
  document_id: string;
  query: string;
}

// Interfaz para manejar errores tipados del backend
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}
