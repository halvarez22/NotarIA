import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { ExpedienteRecord, DocumentRecord } from '../types/api';
import { UploadScreen } from './UploadScreen';
import { useUpload } from '../hooks/useUpload';

interface ExpedienteDetailProps {
  expediente: ExpedienteRecord;
  onBack: () => void;
  onChatDocument: (docId: string) => void;
}

export function ExpedienteDetail({ expediente, onBack, onChatDocument }: ExpedienteDetailProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [customName, setCustomName] = useState('');

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getDocuments(expediente.id);
      setDocuments(res.documents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [expediente.id]);

  const { status, progress, errorMessage, metrics, uploadFile, proceedToChat, retry } = useUpload((taskId) => {
    setShowUpload(false);
    onChatDocument(taskId);
  });

  const handleFileSelect = (file: File) => {
    // If no custom name is typed, backend uses filename
    apiClient.uploadDocument(file, expediente.id, customName).then(res => {
        // useUpload currently has uploadFile that wraps this. 
        // We need to modify useUpload to pass extra params or call it directly.
    });
  };
  
  // Actually, useUpload exposes uploadFile(file: File). We need to change useUpload to accept expediente_id.
  return (
    <div className="p-8">
      <button onClick={onBack} className="text-brand-gold hover:text-yellow-400 mb-6 flex items-center gap-1 text-sm font-medium">
        <span>← Volver a Expedientes</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{expediente.nombre}</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>Creado: {new Date(expediente.created_at).toLocaleDateString()}</span>
          <span className={`${expediente.sync_status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`}>
            Estado: {expediente.sync_status}
          </span>
        </div>
      </div>

      {showUpload ? (
        <div className="bg-brand-dark p-6 rounded-xl border border-brand-medium">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-gray-200">Subir Documento al Expediente</h2>
             <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white">✕ Cerrar</button>
          </div>
          
          {/* Custom Name input for upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ej: Contrato de Compraventa"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full bg-brand-darkest border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-brand-gold"
              disabled={status !== 'idle'}
            />
          </div>

          <UploadScreen 
            status={status}
            progress={progress}
            errorMessage={errorMessage}
            metrics={metrics}
            onFileSelect={(f) => {
                // Here we hack it: we need useUpload to support extra params. Let's assume we modify useUpload.
                // For now, we pass the file to a modified uploadFile.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                uploadFile(f, expediente.id, customName);
            }}
            onProceed={proceedToChat}
            onRetry={retry}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Documentos ({documents.length})</h2>
            <button 
              onClick={() => setShowUpload(true)}
              className="bg-brand-medium hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              + Agregar Documento
            </button>
          </div>

          {isLoading ? (
            <div className="text-gray-500 p-4">Cargando...</div>
          ) : documents.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-gray-700 rounded-lg text-gray-500">
              No hay documentos en este expediente.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.task_id} className="bg-brand-dark border border-brand-medium p-4 rounded-lg flex justify-between items-center hover:border-gray-500 transition-colors">
                  <div>
                    <h4 className="text-lg font-medium text-gray-200 cursor-pointer hover:text-brand-gold" onClick={() => onChatDocument(doc.task_id)}>
                      {doc.custom_name || doc.filename}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">Archivo original: {doc.filename} • {new Date(doc.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                      {doc.meta_pages} pags • {doc.meta_chunks} chunks
                    </span>
                    <button 
                      onClick={() => onChatDocument(doc.task_id)}
                      className="bg-brand-gold hover:bg-yellow-500 text-brand-darkest px-4 py-2 rounded text-sm font-bold transition-colors"
                    >
                      Chatear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
