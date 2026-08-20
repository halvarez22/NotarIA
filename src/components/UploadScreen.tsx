import React, { useRef } from 'react';
import { UploadStatus } from '../hooks/useUpload';

interface UploadScreenProps {
  status: UploadStatus;
  progress: number;
  errorMessage: string | null;
  metrics?: { pages: number, chunks: number } | null;
  onFileSelect: (file: File) => void;
  onProceed?: () => void;
  onRetry: () => void;
}

export function UploadScreen({ status, progress, errorMessage, metrics, onFileSelect, onProceed, onRetry }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
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
        <div className="w-full max-w-md p-6 bg-brand-dark rounded-xl border border-brand-medium animate-pulse">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-200">
              {getStatusMessage()}
            </span>
            <span className="text-sm font-medium text-brand-gold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-brand-gold h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {status === 'success_feedback' && (
        <div className="w-full max-w-md p-6 bg-green-900/20 border border-green-500/50 rounded-xl text-center animate-fade-in-up">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-green-400 mb-2">Documento procesado con éxito</h3>
          <p className="text-gray-300 mb-6">
            Se analizaron <strong className="text-white">{metrics?.pages || 0}</strong> páginas y se generaron <strong className="text-white">{metrics?.chunks || 0}</strong> fragmentos de contexto.
          </p>
          <button 
            onClick={onProceed}
            className="w-full py-3 bg-brand-gold hover:bg-yellow-500 text-brand-darkest font-bold rounded transition-colors shadow-lg"
          >
            Comenzar Análisis
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="w-full max-w-md p-6 bg-red-900/30 border border-red-500/50 rounded-xl text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-red-400 mb-2">Error de Procesamiento</h3>
          <p className="text-gray-300 mb-6">{errorMessage || 'Ha ocurrido un error inesperado.'}</p>
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Intentar nuevamente
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
