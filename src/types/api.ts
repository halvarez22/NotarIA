export interface UploadResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'error';
}

export interface StatusResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'error' | 'not_found';
  meta_pages?: number;
  meta_chunks?: number;
}

export interface ChatRequest {
  document_id: string;
  query: string;
}

export interface ExpedienteRecord {
  id: string;
  nombre: string;
  created_at: string;
  status: string;
  sync_status: 'pending' | 'synced' | 'failed';
  doc_count: number;
}

export interface DocumentRecord {
  task_id: string;
  filename: string;
  custom_name?: string;
  expediente_id?: string;
  created_at: string;
  status: 'processing' | 'completed' | 'error';
  sync_status: 'pending' | 'synced' | 'failed';
  meta_pages: number;
  meta_chunks: number;
}


// Interfaz para manejar errores tipados del backend
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}
