# Plan de Implementación Formal: LicitAI Digestor (Vercel + Python Local)

## 1. Grafo de Impacto Global y Efectos Secundarios (Regla 1 - APO)
**Archivos Afectados y Efectos Secundarios (Zero Regressions):**
- `package.json`: Se elimina `@google/genai`. *Efecto secundario:* Rompe dependencias heredadas, requiriendo purga limpia.
- `services/geminiService.ts`: **[DELETE]** Se elimina. *Efecto secundario:* `App.tsx` debe aislarse de él.
- `services/fileProcessor.ts`: **[DELETE]** Se elimina la extracción local. *Efecto secundario:* `FileUpload` dejará de hacer conversión a Canvas, pasará el archivo bruto a la API.
- `App.tsx`: **[MODIFY]** Reescritura total. Deja de ser orquestador lógico y pasa a ser un mero switch de navegación.
- `vite.config.ts` y `vite-env.d.ts`: **[MODIFY]** Restauración base para permitir compilación de Vercel.

## 2. Estructura de Componentes React (Regla 3 - Anti-God-Component)
Para evitar absolutamente que `App.tsx` absorba lógica, la arquitectura del frontend se dividirá estrictamente así:

```text
src/
├── components/
│   ├── UploadScreen.tsx (UI de arrastrar y soltar, renderiza ProgressBar)
│   ├── ChatScreen.tsx   (UI de chat, renderiza burbujas de mensajes)
│   └── ProgressBar.tsx  (Componente presentacional granular)
├── hooks/
│   ├── useUpload.ts     (Encapsula lógica hash SHA-256 y polling GET /status)
│   └── useChat.ts       (Encapsula conexión SSE y parseo del stream de tokens)
├── services/
│   └── apiClient.ts     (Único punto de acceso HTTP al túnel de Cloudflare, inyecta API Key)
└── types/
    └── api.ts           (Contratos estrictos de request/response para TypeScript)
```
`App.tsx` se limitará a decidir: *si no hay `document_id`, renderiza `UploadScreen`; si lo hay, renderiza `ChatScreen`.*

## 3. Estrategia de Chunking y Retriever (RAG Legal)
Para evitar "alucinaciones" al cortar cláusulas a la mitad, el backend Python implementará:
- **Algoritmo:** Semantic Chunking (`RecursiveCharacterTextSplitter`) priorizando separadores legales (`\n\nArtículo`, `\n\nCláusula`, `\n\nSección`).
- **Chunk Size:** 1000 tokens (óptimo para capturar un artículo completo y para `nomic-embed-text`).
- **Overlap:** 15% (aprox. 150 tokens) para retener el contexto hilado entre chunks.
- **Top-K (Retriever):** K = 5 (Se recuperan solo los 5 fragmentos más precisos para no ahogar los 8k de contexto de `llama3.1:8b`).
- **Métrica de Similitud:** Cosine Similarity nativa en ChromaDB.

## 4. Secuencia de Ejecución (Strangler Fig - Regla 6)
- **Capa 1:** Construcción del backend en Python aislado. Configuración de ChromaDB, `glm-ocr`, y pruebas estrictas con `cURL`.
- **Capa 2:** Implementación de `apiClient.ts` en React y validación de red vía túnel.
- **Capa 3:** Desarrollo de `UploadScreen.tsx` + `useUpload.ts` (Validación de idempotencia visual).
- **Capa 4:** Desarrollo de `ChatScreen.tsx` + `useChat.ts` (Streaming SSE).
