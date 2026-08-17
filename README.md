# NotarIA (v1.0)

Sistema Enterprise para procesamiento, OCR y chat inteligente con escrituras, actas constitutivas, planos y avalúos. Desarrollado con el patrón de arquitectura Strangler Fig.

## Arquitectura (Anti-God-Component)
- **Capa 1 (Backend)**: FastAPI + PyMuPDF (OCR) + ChromaDB (Vector Store) + Ollama (`llama3.1:8b`). Procesamiento 100% local, seguro y asíncrono.
- **Capa 2 (Red)**: Puente TypeScript seguro y aislado.
- **Capa 3 (Upload UI)**: React (Vite) con Tailwind, validación idempotente y "U-First design".
- **Capa 4 (Chat UI)**: Streaming SSE con `AbortController` nativo.

## Requisitos Previos
- Node.js (v18+)
- Python (3.10+)
- [Ollama](https://ollama.com/) instalado y ejecutándose localmente con los modelos:
  - `glm-ocr:latest`
  - `nomic-embed-text:latest`
  - `llama3.1:8b`

## Instalación y Arranque

### 1. Iniciar el Backend (Python)
Abre una terminal en la carpeta `backend`:
```bash
cd backend
python -m venv venv

# En Windows:
venv\Scripts\activate
# En Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
El servidor FastAPI estará corriendo en `http://localhost:8000`. Puedes ver los endpoints en `http://localhost:8000/docs`.

### 2. Iniciar el Frontend (React/Vite)
Abre otra terminal en la raíz del proyecto:
```bash
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### 3. Entorno (Opcional)
Renombra el archivo `.env.example` a `.env` si necesitas configurar el servidor en otro host o añadir autenticación JWT para producción.
