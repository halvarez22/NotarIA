import React from 'react';
import { ExpedienteRecord } from '../types/api';

interface SidebarProps {
  expedientes: ExpedienteRecord[];
  isLoading: boolean;
  error: string | null;
  activeExpedienteId: string | null;
  onSelectExpediente: (id: string) => void;
  onNewDocument: () => void;
}

export function Sidebar({ expedientes, isLoading, error, activeExpedienteId, onSelectExpediente, onNewDocument }: SidebarProps) {
  return (
    <div className="w-64 bg-brand-darkest border-r border-brand-medium h-screen flex flex-col text-gray-200">
      <div className="p-4 border-b border-brand-medium">
        <h1 className="text-xl font-bold text-brand-gold mb-4 cursor-pointer hover:text-yellow-400" onClick={onNewDocument}>NotarIA</h1>
        <button
          onClick={onNewDocument}
          className="w-full py-2 bg-brand-medium hover:bg-gray-600 transition-colors text-white rounded font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Inicio
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Navegación</h2>
        
        {/* Simplified sidebar: For now just quick navigation since main view is ExpedienteList */}
        <div className="text-sm text-gray-400 px-2">
           <p>Usa la vista central para gestionar expedientes.</p>
        </div>
      </div>
    </div>
  );
}
