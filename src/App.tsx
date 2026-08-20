import React, { useState } from 'react';
import { ChatScreen } from './components/ChatScreen';
import { DashboardLayout } from './components/DashboardLayout';
import { ExpedienteList } from './components/ExpedienteList';
import { ExpedienteDetail } from './components/ExpedienteDetail';
import { useExpedientes } from './hooks/useExpedientes';

function App() {
  const [activeExpedienteId, setActiveExpedienteId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const { expedientes, isLoading, error, createExpediente, updateExpediente, deleteExpediente } = useExpedientes();

  const activeExpediente = expedientes.find(e => e.id === activeExpedienteId);

  return (
    <DashboardLayout
      activeDocumentId={activeDocumentId}
      onSelectDocument={(id) => {
         // Sidebar is temporarily disabled or repurposed, but we keep the prop
         setActiveDocumentId(id);
      }}
      onNewDocument={() => {
         setActiveDocumentId(null);
         setActiveExpedienteId(null);
      }}
      refreshTrigger={0}
    >
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        {activeDocumentId ? (
          <ChatScreen 
            documentId={activeDocumentId} 
            onReset={() => setActiveDocumentId(null)} 
          />
        ) : activeExpedienteId && activeExpediente ? (
          <ExpedienteDetail 
            expediente={activeExpediente} 
            onBack={() => setActiveExpedienteId(null)}
            onChatDocument={(taskId) => setActiveDocumentId(taskId)}
          />
        ) : (
          <ExpedienteList 
            expedientes={expedientes}
            isLoading={isLoading}
            error={error}
            onSelect={setActiveExpedienteId}
            onCreate={createExpediente}
            onRename={updateExpediente}
            onDelete={deleteExpediente}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default App;
