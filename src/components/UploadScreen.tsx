import React, { useRef } from 'react';
import { UploadStatus } from '../hooks/useUpload';

interface UploadScreenProps {
  status: UploadStatus;
  progress: number;
  errorMessage: string | null;
  onFileSelect: (file: File) => void;
  onRetry: () => void;
}

export function UploadScreen({ status, progress, errorMessage, onFileSelect, onRetry }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const isBusy = status === 'uploading' || status === 'processing' || status === 'processing_complex';

  const getStatusMessage = () => {
    if (status === 'uploading') return 'Subiendo al servidor...';
    if (status === 'processing_complex') return 'Procesando documento complejo, esto puede tomar un momento...';
    return 'Procesando (OCR y Embeddings)...';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 bg-brand-darkest text-white rounded-lg shadow-xl border border-brand-medium">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-gold mb-2">NotarIA</h2>
        <p className="text-gray-400">Sube escrituras, actas constitutivas, avalúos o planos</p>
      </div>

      {status === 'idle' && (
        <div 
          className="w-full max-w-md p-8 border-2 border-dashed border-brand-gold rounded-xl bg-brand-dark hover:bg-brand-medium transition-colors cursor-pointer text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-brand-gold" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-200">Haz clic para seleccionar archivo</p>
          <p className="text-sm text-gray-400 mt-2">Soporta PDF, TXT, JPG</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="application/pdf, text/plain, image/jpeg, image/png" 
          />
        </div>
      )}

      {isBusy && (
        <div className="w-full max-w-md p-6 bg-brand-dark rounded-xl border border-brand-medium">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-200">
              {getStatusMessage()}
            </span>
            <span className="text-sm font-medium text-brand-gold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-brand-gold h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="w-full max-w-md p-6 bg-red-900/30 rounded-xl border border-red-500 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-red-400 mb-2">Error al procesar</h3>
          <p className="text-red-200 text-sm mb-6">{errorMessage}</p>
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-brand-gold text-brand-darkest font-bold rounded hover:bg-yellow-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'completed' && (
        <div className="w-full max-w-md p-6 bg-green-900/30 rounded-xl border border-green-500 text-center animate-pulse">
          <p className="text-green-400 font-bold">¡Listo! Preparando chat...</p>
        </div>
      )}
    </div>
  );
}
