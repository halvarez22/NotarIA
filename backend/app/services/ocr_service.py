import fitz
import base64
import httpx
from app.core.config import get_settings

class OCRService:
    def __init__(self):
        self.settings = get_settings()
        self.client = httpx.AsyncClient(timeout=300.0) # Extendido por procesamiento local de OCR
        
    async def process_pdf(self, file_bytes: bytes) -> str:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        full_text = ""
        # Limitamos a 10 páginas máximo por seguridad y evitar timeouts extremos
        for page_num in range(min(10, len(doc))):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_base64 = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
            
            text = await self._call_glm_ocr(img_base64)
            full_text += f"\n\n--- Página {page_num + 1} ---\n\n{text}"
            
        doc.close()
        return full_text
        
    async def process_image(self, file_bytes: bytes) -> str:
        img_base64 = base64.b64encode(file_bytes).decode("utf-8")
        return await self._call_glm_ocr(img_base64)
        
    async def _call_glm_ocr(self, base64_image: str) -> str:
        payload = {
            "model": self.settings.OCR_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": "Extract the text from this image.",
                    "images": [base64_image]
                }
            ],
            "stream": False
        }
        response = await self.client.post(f"{self.settings.OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "")
