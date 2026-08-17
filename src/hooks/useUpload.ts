import { useState, useRef } from 'react';
import { apiClient } from '../services/apiClient';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'processing_complex' | 'completed' | 'error';

export function useUpload(onSuccess: (taskId: string) => void) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Guardamos el intervalo en un ref para poder limpiarlo
  const pollingIntervalRef = useRef<number | null>(null);
  const pollingTimeRef = useRef<number>(0);

  const startPolling = (taskId: string) => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingTimeRef.current = 0;

    pollingIntervalRef.current = window.setInterval(async () => {
      pollingTimeRef.current += 2; // han pasado 2 segundos
      try {
        const res = await apiClient.getTaskStatus(taskId);
        if (res.status === 'completed') {
          clearInterval(pollingIntervalRef.current!);
          setStatus('completed');
          setProgress(100);
          onSuccess(taskId);
        } else if (res.status === 'error') {
          clearInterval(pollingIntervalRef.current!);
          setStatus('error');
          setErrorMessage('Hubo un error al extraer el texto (OCR) del documento.');
        } else {
          // processing
          const newProgress = Math.min(progress + 10, 90);
          setProgress(newProgress);
          
          // Si han pasado más de 15 segundos, cambiamos el estado visualmente pero el progress sigue en 90
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

  const uploadFile = async (file: File) => {
    try {
      setStatus('uploading');
      setProgress(10);
      setErrorMessage(null);

      const res = await apiClient.uploadDocument(file);
      
      if (res.status === 'completed') {
        setStatus('completed');
        setProgress(100);
        onSuccess(res.task_id);
      } else if (res.status === 'error') {
        setStatus('error');
        setErrorMessage('El documento fue rechazado o corrupto.');
      } else {
        // status == 'processing'
        setStatus('processing');
        setProgress(30);
        startPolling(res.task_id);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Fallo de conexión al subir el archivo.');
    }
  };

  const retry = () => {
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
  };

  return {
    status,
    progress,
    errorMessage,
    uploadFile,
    retry
  };
}
