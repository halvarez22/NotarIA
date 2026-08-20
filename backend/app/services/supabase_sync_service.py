import logging
from typing import List
from supabase import create_client, Client
from app.core.config import get_settings

logger = logging.getLogger("notaria_backend.supabase")

class SupabaseSyncService:
    def __init__(self):
        from dotenv import load_dotenv
        import os
        load_dotenv()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            self.client = None
            logger.warning("Supabase credentials not found. Sync operations will fail.")
        else:
            self.client = create_client(url, key)
            
    def _ensure_client(self):
        if not self.client:
            raise ValueError("Supabase client is not initialized due to missing credentials.")

    async def sync_document(
        self, 
        task_id: str, 
        raw_chunks: List[str], 
        raw_embeddings: List[List[float]]
    ) -> bool:
        self._ensure_client()
        
        from app.services.db_service import get_document_full
        doc = await get_document_full(task_id)
        if not doc:
            raise ValueError(f"No local document found for {task_id}")
            
        expediente_id = doc["expediente_id"]
        custom_name = doc["custom_name"]
        filename = doc["filename"]
        
        try:
            # 0. Upsert Expediente (to satisfy foreign key)
            from app.services.db_service import DB_PATH
            import aiosqlite
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                async with db.execute("SELECT * FROM expedientes WHERE id = ?", (expediente_id,)) as cursor:
                    exp_row = await cursor.fetchone()
            
            if exp_row:
                exp_data = {
                    "id": expediente_id,
                    "nombre": exp_row["nombre"],
                    "fecha": exp_row["created_at"][:10] if "created_at" in exp_row.keys() else "2024-01-01"
                }
                self.client.table("expedientes").upsert(exp_data).execute()

            # 1. Upsert a documents
            doc_data = {
                "id": task_id,
                "expediente_id": expediente_id,
                "nombre_personalizado": custom_name,
                "filename": filename
            }
            self.client.table("documents").upsert(doc_data).execute()

            # 2. Insertar a document_chunks
            if raw_chunks and raw_embeddings and len(raw_chunks) == len(raw_embeddings):
                batch = []
                for chunk, vector in zip(raw_chunks, raw_embeddings):
                    batch.append({
                        "document_id": task_id,
                        "content": chunk,
                        "embedding": vector
                    })
                
                self.client.table("document_chunks").insert(batch).execute()
                
            logger.info(f"Sincronización exitosa para {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Fallo general en sync_document para {task_id}: {e}")
            raise e
