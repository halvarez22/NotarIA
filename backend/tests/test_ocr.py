import pytest
from unittest.mock import patch, MagicMock
from app.services.ocr_service import OCRService

@pytest.mark.asyncio
@patch("app.services.ocr_service.httpx.AsyncClient.post")
@patch("app.services.ocr_service.fitz.open")
async def test_process_pdf_limits_pages(mock_fitz_open, mock_post):
    # Setup mocks
    mock_doc = MagicMock()
    # Simular un PDF de 20 páginas
    mock_doc.__len__.return_value = 20 
    mock_page = MagicMock()
    mock_pix = MagicMock()
    mock_pix.tobytes.return_value = b"fake_image_bytes"
    mock_page.get_pixmap.return_value = mock_pix
    mock_doc.load_page.return_value = mock_page
    mock_fitz_open.return_value = mock_doc
    
    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "texto extraido"}}
    mock_post.return_value = mock_response

    service = OCRService()
    result = await service.process_pdf(b"fake_pdf_bytes")
    
    # Verificar que el doc se cargó
    assert mock_fitz_open.called
    # SQA: Validar que SOLO procesó 10 páginas (seguridad y economía de recursos)
    assert mock_doc.load_page.call_count == 10
    assert "texto extraido" in result

@pytest.mark.asyncio
@patch("app.services.ocr_service.httpx.AsyncClient.post")
async def test_process_image(mock_post):
    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "texto de imagen"}}
    mock_post.return_value = mock_response
    
    service = OCRService()
    result = await service.process_image(b"fake_image_bytes")
    
    assert mock_post.called
    assert result == "texto de imagen"
