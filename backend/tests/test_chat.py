import pytest
import json
from unittest.mock import patch, MagicMock
from app.services.chat_service import ChatService

# Helper para simular respuesta asíncrona de httpx.stream
class MockResponse:
    async def aiter_lines(self):
        yield json.dumps({"message": {"content": "Hola "}})
        yield json.dumps({"message": {"content": "mundo"}})
        yield "linea_corrupta_que_debe_ser_ignorada"

class MockAsyncClient:
    def __init__(self, *args, **kwargs):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    def stream(self, *args, **kwargs):
        return MockStreamContext()

class MockStreamContext:
    async def __aenter__(self):
        return MockResponse()
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

@pytest.mark.asyncio
@patch("app.services.chat_service.httpx.AsyncClient", new=MockAsyncClient)
@patch("app.services.chat_service.RAGService")
async def test_stream_chat(mock_rag_class):
    mock_rag = mock_rag_class.return_value
    mock_doc = MagicMock()
    mock_doc.page_content = "Contexto simulado de la base de datos."
    mock_rag.vectorstore.similarity_search.return_value = [mock_doc]
    
    service = ChatService()
    service.rag = mock_rag
    
    # Recolectar tokens del stream SSE
    events = []
    async for event in service.stream_chat("task_123", "¿Qué dice el documento?"):
        events.append(event)
        
    # Verificar que el RAG fue consultado
    assert mock_rag.vectorstore.similarity_search.called
    
    # Verificar formato SSE (U-First)
    assert events[0] == 'data: {"content": "Hola "}\n\n'
    assert events[1] == 'data: {"content": "mundo"}\n\n'
    assert events[2] == 'data: [DONE]\n\n'
    # La línea corrupta no debió producir un evento
    assert len(events) == 3
