import React, { useState } from 'react';
import { UploadScreen } from './components/UploadScreen';
import { useUpload } from './hooks/useUpload';
import { ChatScreen } from './components/ChatScreen';

function App() {
  const [documentId, setDocumentId] = useState<string | null>(null);

  const { status, progress, errorMessage, uploadFile, retry } = useUpload((taskId) => {
    // Cuando el polling es exitoso, pasamos al chat
    setDocumentId(taskId);
  });

  return (
    <div className="min-h-screen bg-brand-darkest text-gray-200 font-sans p-4">
      <div className="max-w-5xl mx-auto h-[90vh] flex flex-col">
        {!documentId ? (
          <UploadScreen 
            status={status}
            progress={progress}
            errorMessage={errorMessage}
            onFileSelect={uploadFile}
            onRetry={retry}
          />
        ) : (
          <ChatScreen 
            documentId={documentId} 
            onReset={() => setDocumentId(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
