import { useState, useRef } from 'react';
import { apiClient } from '../services/apiClient';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'processing_complex' | 'success_feedback' | 'completed' | 'error';

export function useUpload(onSuccess: (taskId: string) => void) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [taskIdState, setTaskIdState] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{ pages: number, chunks: number } | null>(null);

  const pollingIntervalRef = useRef<number | null>(null);
  const pollingTimeRef = useRef<number>(0);

  const startPolling = (taskId: string) => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingTimeRef.current = 0;

    pollingIntervalRef.current = window.setInterval(async () => {
      pollingTimeRef.current += 2;
      try {
        const res = await apiClient.getTaskStatus(taskId);
        if (res.status === 'completed') {
          clearInterval(pollingIntervalRef.current!);
          setProgress(100);
          setMetrics({
            pages: res.meta_pages || 1,
            chunks: res.meta_chunks || 1
          });
          setStatus('success_feedback');
        } else if (res.status === 'error') {
          clearInterval(pollingIntervalRef.current!);
          setStatus('error');
          setErrorMessage('Hubo un error al extraer el texto (OCR) del documento.');
        } else {
          const newProgress = Math.min(progress + 10, 90);
          setProgress(newProgress);
          if (pollingTimeRef.current >= 15) {
             setStatus('processing_complex');
          }
        }
      } catch (err: any) {
        clearInterval(pollingIntervalRef.current!);
        setStatus('error');
        setErrorMessage(err.message || 'Error de red durante la verificación.');
      }
    }, 2000);
  };

  const uploadFile = async (file: File, expedienteId: string, customName?: string) => {
    setStatus('uploading');
    setProgress(0);
    setErrorMessage(null);
    setMetrics(null);

    try {
      const res = await apiClient.uploadDocument(file, expedienteId, customName);
      setTaskIdState(res.task_id);
      
      if (res.status === 'completed') {
        setProgress(100);
        // Fallback métricas si ya estaba procesado (idempotencia rápida)
        setMetrics({ pages: res.meta_pages || 1, chunks: res.meta_chunks || 1 });
        setStatus('success_feedback');
      } else {
        setStatus('processing');
        startPolling(res.task_id);
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Error desconocido al subir archivo');
    }
  };

  const proceedToChat = () => {
    if (taskIdState) {
      setStatus('completed');
      onSuccess(taskIdState);
    }
  };

  const retry = () => {
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setTaskIdState(null);
    setMetrics(null);
  };

  return {
    status,
    progress,
    errorMessage,
    metrics,
    uploadFile,
    proceedToChat,
    retry
  };
}
