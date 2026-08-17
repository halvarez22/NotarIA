// Polyfill para NodeJS
(global as any).import = { meta: { env: { VITE_BACKEND_URL: 'http://localhost:8000', VITE_API_KEY: 'default_dev_key_change_in_production' } } };

// Mock import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_BACKEND_URL: 'http://localhost:8000',
        VITE_API_KEY: 'default_dev_key_change_in_production'
      }
    }
  }
});

import { apiClient } from './src/services/apiClient';
import { readFileSync } from 'fs';

async function runTest() {
  console.log("Iniciando prueba de red (Capa 2)...");
  try {
    // 1. Simular archivo
    const fileContent = "Documento legal de prueba. Artículo 1: Confidencialidad.\n";
    // Crear un blob/File usando la API nativa de NodeJS 22
    const file = new File([fileContent], "test.txt", { type: "text/plain" });
    
    // 2. Upload
    console.log("Subiendo documento...");
    const uploadRes = await apiClient.uploadDocument(file);
    console.log("✅ Upload OK:", uploadRes);
    const taskId = uploadRes.task_id;
    
    // 3. Status Polling
    console.log("Verificando status...");
    const statusRes = await apiClient.getTaskStatus(taskId);
    console.log("✅ Status OK:", statusRes);
    
    // 4. Chat SSE Stream
    console.log("Probando streaming de chat...");
    const streamRes = await apiClient.streamChat(taskId, "¿De qué habla el artículo 1?");
    
    if (!streamRes.body) throw new Error("No body in response");
    
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let tokens = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // El chunk viene en formato SSE: data: {"content": "..."}\n\n
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        if (line.includes('[DONE]')) break;
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          tokens.push(json.content);
        } catch (e) {
          // ignorar lineas rotas temporalmente
        }
      }
    }
    
    console.log("✅ Stream OK. Tokens recibidos:", tokens.length);
    console.log("Respuesta armada:", tokens.join(''));
    console.log("¡Prueba de Capa 2 finalizada exitosamente!");
    
  } catch (err) {
    console.error("❌ Error en la prueba:", err);
  }
}

runTest();
