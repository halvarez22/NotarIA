import React, { useState, useCallback } from 'react';
import { SUPPORTED_FILE_TYPES } from '../constants';
import { UploadIcon, SpinnerIcon } from './icons';

interface FileUploadProps {
  onFileProcess: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

const allSupportedExtensions = Object.values(SUPPORTED_FILE_TYPES).flat().join(', ');

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcess, isLoading, error }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const isFileTypeSupported = (file: File) => {
    return Object.keys(SUPPORTED_FILE_TYPES).includes(file.type);
  };

  const handleFile = useCallback((file: File | null) => {
    if (file) {
      if (isFileTypeSupported(file)) {
        setFileError(null);
        onFileProcess(file);
      } else {
        setFileError(`Tipo de archivo no soportado. Por favor sube uno de: ${allSupportedExtensions}`);
      }
    }
  }, [onFileProcess]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      {isLoading ? (
        <div className="flex flex-col items-center space-y-4">
          <SpinnerIcon className="w-12 h-12 text-brand-gold" />
          <p className="text-lg text-gray-300">Procesando tu documento...</p>
          <p className="text-sm text-gray-400">Esto puede tardar un momento para archivos grandes.</p>
        </div>
      ) : (
        <>
          <form
            id="form-file-upload"
            className={`w-full h-full max-w-lg p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-brand-gold bg-brand-dark/50' : 'border-brand-medium hover:border-brand-gold/70'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="input-file-upload"
              className="hidden"
              onChange={handleChange}
              accept={Object.keys(SUPPORTED_FILE_TYPES).join(',')}
            />
            <label htmlFor="input-file-upload" className="flex flex-col items-center justify-center h-full w-full cursor-pointer">
              <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
              <p className="font-bold text-lg text-gray-200">Arrastra y suelta tu documento aquí</p>
              <p className="text-gray-400">o haz clic para buscar</p>
              <p className="text-xs text-gray-500 mt-4">Formatos soportados: {allSupportedExtensions}</p>
            </label>
          </form>
          {(error || fileError) && (
            <div className="mt-4 p-3 w-full max-w-lg bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
                {error || fileError}
            </div>
          )}
        </>
      )}
    </div>
  );
};