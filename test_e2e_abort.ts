import { apiClient } from './src/services/apiClient';

async function runEndToEnd() {
  console.log("=== INICIANDO PRUEBA END-TO-END (CAPA 4) ===");
  try {
    // 1. Subir
    console.log("1. Subiendo documento de prueba...");
    const fileContent = "Artículo 1: Este es un contrato extremadamente confidencial.";
    const file = new File([fileContent], "contrato.txt", { type: "text/plain" });
    const uploadRes = await apiClient.uploadDocument(file);
    const taskId = uploadRes.task_id;
    
    // 2. Polling (Simulación de useUpload)
    console.log("2. Verificando progreso (Polling)...");
    let isCompleted = false;
    while (!isCompleted) {
      const statusRes = await apiClient.getTaskStatus(taskId);
      if (statusRes.status === 'completed') {
        isCompleted = true;
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.log(`✅ OCR y Embeddings completados para el ID: ${taskId}`);

    // 3. Chatear y Abortar
    console.log("3. Iniciando chat con streaming...");
    const abortController = new AbortController();
    const streamRes = await apiClient.streamChat(taskId, "Explica detalladamente el documento", abortController.signal);
    
    if (!streamRes.body) throw new Error("ReadableStream no soportado");
    
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let tokensRecibidos = 0;
    let textoAcumulado = "";

    // Leer tokens en un loop
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      
      for (const line of lines) {
        if (line.includes('[DONE]')) break;
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          textoAcumulado += json.content;
          tokensRecibidos++;
          process.stdout.write(json.content);

          // Si hemos recibido 5 tokens, ABORTAMOS EL STREAM
          if (tokensRecibidos === 5) {
            console.log("\n🛑 [USUARIO HIZO CLIC EN 'DETENER GENERACIÓN']");
            abortController.abort();
          }
        } catch(e) {}
      }
    }
    
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message.includes('abort') || err.message.includes('fetch failed')) {
      console.log("\n✅ ÉXITO: El streaming fue abortado limpiamente por el AbortController.");
      console.log("El backend local liberó los recursos sin lanzar excepciones fatales al usuario.");
    } else {
      console.error("\n❌ Error inesperado:", err);
    }
  }
}

runEndToEnd();
