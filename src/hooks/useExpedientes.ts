import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { ExpedienteRecord } from '../types/api';

export function useExpedientes() {
  const [expedientes, setExpedientes] = useState<ExpedienteRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpedientes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getExpedientes();
      setExpedientes(res.expedientes || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando expedientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createExpediente = async (nombre: string) => {
    try {
      await apiClient.createExpediente(nombre);
      await fetchExpedientes();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateExpediente = async (id: string, nombre: string) => {
    try {
      await apiClient.updateExpediente(id, nombre);
      await fetchExpedientes();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteExpediente = async (id: string) => {
    try {
      await apiClient.deleteExpediente(id);
      await fetchExpedientes();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]);

  return {
    expedientes,
    isLoading,
    error,
    createExpediente,
    updateExpediente,
    deleteExpediente,
    refreshExpedientes: fetchExpedientes
  };
}
