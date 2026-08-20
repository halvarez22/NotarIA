import hashlib
import logging
from fastapi import UploadFile, BackgroundTasks
from app.services.ocr_service import OCRService
from app.services.rag_service import RAGService
from app.services.db_service import upsert_document, update_document_status

logger = logging.getLogger("licitai_backend")

# Emulación de base de datos en memoria para tracking de tareas rápido
# (Mantenemos memory dict por si es útil, pero db asíncrona es la fuente de la verdad)
tasks_db = {}

class UploadService:
    def __init__(self):
        self.ocr_service = OCRService()
        self.rag_service = RAGService()
    
    async def process_upload(self, file: UploadFile, background_tasks: BackgroundTasks, expediente_id: str, custom_name: str = None) -> str:
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        filename = file.filename or "Documento"
        
        # Idempotencia: Si ya existe y está procesando/completado, retornar el mismo ID
        if file_hash in tasks_db and tasks_db[file_hash] in ["processing", "completed"]:
            return file_hash
            
        tasks_db[file_hash] = "processing"
        await upsert_document(file_hash, filename, "processing", expediente_id, custom_name)
        
        mime_type = file.content_type
        
        if mime_type not in ["application/pdf", "image/jpeg", "image/png", "text/plain"]:
            tasks_db[file_hash] = "error"
            await update_document_status(file_hash, "error")
            raise ValueError("MIME type no soportado")
            
        background_tasks.add_task(self._background_process_wrapper, file_hash, mime_type, content)
        return file_hash
        
    async def _background_process_wrapper(self, task_id: str, mime_type: str, content: bytes):
        # Función wrapper para llamar la asíncrona y luego hacer update asíncrono
        try:
            await self._background_process(task_id, mime_type, content)
        except Exception as e:
            logger.error(f"Error procesando {task_id}: {e}", exc_info=True)
            tasks_db[task_id] = "error"
            import asyncio
            try:
                await update_document_status(task_id, "error")
            except Exception as dbe:
                logger.error(f"DB Update error: {dbe}")
                
    async def _background_process(self, task_id: str, mime_type: str, content: bytes):
        tasks_db[task_id] = "extracting_text"
        await update_document_status(task_id, "extracting_text")
        
        if mime_type == "application/pdf":
            text = await self.ocr_service.process_pdf(content)
        elif mime_type in ["image/jpeg", "image/png"]:
            text = await self.ocr_service.process_image(content)
        else: # text/plain
            text = content.decode("utf-8", errors="ignore")
            
        tasks_db[task_id] = "indexing"
        await update_document_status(task_id, "indexing")
        
        meta_pages = 0
        meta_chunks = 0
        if text.strip():
            # Devuelve metadata (páginas, chunks)
            meta = self.rag_service.index_document(task_id, text)
            if meta:
                meta_pages = meta.get("pages", 0)
                meta_chunks = meta.get("chunks", 0)

        # 🚀 FASE 2: Sincronización a la Nube (Edge to Cloud)
        tasks_db[task_id] = "syncing_to_cloud"
        await update_document_status(task_id, "syncing_to_cloud", meta_pages, meta_chunks)

        try:
            from app.services.supabase_sync_service import SupabaseSyncService
            sync_service = SupabaseSyncService()
            
            # Extraer de la metadata si existen
            raw_chunks = meta.get("raw_chunks", []) if meta else []
            raw_embeddings = meta.get("raw_embeddings", []) if meta else []
            
            await sync_service.sync_document(task_id, raw_chunks, raw_embeddings)
            
            tasks_db[task_id] = "completed"
            await update_document_status(task_id, "completed", meta_pages, meta_chunks)
        except Exception as sync_e:
            logger.error(f"Error sincronizando a Supabase {task_id}: {sync_e}", exc_info=True)
            tasks_db[task_id] = "error_sync"
            await update_document_status(task_id, "error_sync", meta_pages, meta_chunks)
