import React from 'react';
import { Sidebar } from './Sidebar';
import { useExpedientes } from '../hooks/useExpedientes';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeDocumentId: string | null;
  onSelectDocument: (taskId: string) => void;
  onNewDocument: () => void;
  refreshTrigger?: number; // Permite forzar recarga desde App.tsx tras una subida
}

export function DashboardLayout({ children, activeDocumentId, onSelectDocument, onNewDocument, refreshTrigger }: DashboardLayoutProps) {
  const { expedientes, isLoading, error, refreshExpedientes } = useExpedientes();

  // Escuchar a refreshTrigger para recargar historial cuando se sube algo nuevo
  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refreshExpedientes();
    }
  }, [refreshTrigger, refreshExpedientes]);

  return (
    <div className="flex h-screen bg-brand-darkest text-gray-200 overflow-hidden font-sans">
      <Sidebar 
        expedientes={expedientes}
        isLoading={isLoading}
        error={error}
        activeExpedienteId={null} // TODO: Track active expediente id in sidebar if needed
        onSelectExpediente={() => {}}
        onNewDocument={onNewDocument}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-900 relative">
        <div className="absolute inset-0 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
