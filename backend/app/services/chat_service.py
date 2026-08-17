import httpx
import json
from app.core.config import get_settings
from app.services.rag_service import RAGService

class ChatService:
    def __init__(self):
        self.settings = get_settings()
        self.rag = RAGService()
        
    async def stream_chat(self, task_id: str, query: str):
        # 1. Recuperar contexto (Top-K = 5)
        docs = self.rag.vectorstore.similarity_search(
            query=query, 
            k=5, 
            filter={"task_id": task_id}
        )
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # En una versión más madura, este prompt viviría en prompts.yaml
        system_prompt = (
            "Eres un asistente legal experto de LicitAI. Responde a la pregunta basándote "
            "ESTRICTAMENTE en el siguiente contexto extraído del documento. "
            "Si la respuesta no está en el contexto, indica que no tienes esa información.\n\n"
            f"CONTEXTO:\n{context}"
        )
        
        payload = {
            "model": self.settings.CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            "stream": True
        }
        
        # 2. Streaming (SSE) a través de Ollama Local
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.settings.OLLAMA_BASE_URL}/api/chat", json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                token = data["message"]["content"]
                                # Formato Server-Sent Events
                                yield f"data: {json.dumps({'content': token})}\n\n"
                        except json.JSONDecodeError:
                            pass
                yield "data: [DONE]\n\n"
