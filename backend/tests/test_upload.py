import pytest
from unittest.mock import patch, MagicMock
from app.services.upload_service import UploadService, tasks_db

@pytest.mark.asyncio
@patch("app.services.upload_service.OCRService")
@patch("app.services.upload_service.RAGService")
async def test_background_process_pdf(mock_rag_class, mock_ocr_class):
    mock_ocr = mock_ocr_class.return_value
    mock_rag = mock_rag_class.return_value
    # Para asincronía en Python 3.8+
    mock_ocr.process_pdf = __import__("unittest").mock.AsyncMock(return_value="Texto del PDF extraido")
    
    service = UploadService()
    service.ocr_service = mock_ocr
    service.rag_service = mock_rag
    
    # Test file process
    await service._background_process("hash_123", "application/pdf", b"fake_pdf_content")
    
    # Assertions
    assert mock_ocr.process_pdf.called
    assert mock_rag.index_document.called
    # Verificar tracking
    assert tasks_db.get("hash_123") == "completed"

@pytest.mark.asyncio
@patch("app.services.upload_service.OCRService")
@patch("app.services.upload_service.RAGService")
async def test_background_process_error(mock_rag_class, mock_ocr_class):
    mock_ocr = mock_ocr_class.return_value
    mock_ocr.process_pdf = __import__("unittest").mock.AsyncMock(side_effect=Exception("Fallo en Ollama OCR"))
    
    service = UploadService()
    service.ocr_service = mock_ocr
    
    await service._background_process("hash_456", "application/pdf", b"fake_pdf_content")
    
    # Si falla, el tracker debe cambiar a 'error'
    assert tasks_db.get("hash_456") == "error"
