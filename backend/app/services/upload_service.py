import hashlib
import logging
from fastapi import UploadFile, BackgroundTasks
from app.services.ocr_service import OCRService
from app.services.rag_service import RAGService

logger = logging.getLogger("licitai_backend")

# Emulación de base de datos en memoria para tracking de tareas
tasks_db = {}

class UploadService:
    def __init__(self):
        self.ocr_service = OCRService()
        self.rag_service = RAGService()
    
    async def process_upload(self, file: UploadFile, background_tasks: BackgroundTasks) -> str:
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Idempotencia: Si ya existe y está procesando/completado, retornar el mismo ID
        if file_hash in tasks_db and tasks_db[file_hash] in ["processing", "completed"]:
            return file_hash
            
        tasks_db[file_hash] = "processing"
        mime_type = file.content_type
        
        if mime_type not in ["application/pdf", "image/jpeg", "image/png", "text/plain"]:
            tasks_db[file_hash] = "error"
            raise ValueError("MIME type no soportado")
            
        background_tasks.add_task(self._background_process, file_hash, mime_type, content)
        return file_hash
        
    async def _background_process(self, task_id: str, mime_type: str, content: bytes):
        try:
            tasks_db[task_id] = "extracting_text"
            if mime_type == "application/pdf":
                text = await self.ocr_service.process_pdf(content)
            elif mime_type in ["image/jpeg", "image/png"]:
                text = await self.ocr_service.process_image(content)
            else: # text/plain
                text = content.decode("utf-8", errors="ignore")
                
            tasks_db[task_id] = "indexing"
            if text.strip():
                self.rag_service.index_document(task_id, text)
                
            tasks_db[task_id] = "completed"
        except Exception as e:
            logger.error(f"Error procesando {task_id}: {e}", exc_info=True)
            tasks_db[task_id] = "error"
