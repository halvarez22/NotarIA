import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { DocumentRecord } from '../types/api';

export function useDocumentHistory() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando historial');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    refreshHistory: fetchDocuments
  };
}
