import aiosqlite
import pathlib
import datetime
import logging
import uuid

logger = logging.getLogger("notaria_backend.db")

DB_DIR = pathlib.Path("data")
DB_PATH = DB_DIR / "notaria.db"

async def init_db():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        # 1. Tabla de expedientes
        await db.execute("""
            CREATE TABLE IF NOT EXISTS expedientes (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                sync_status TEXT NOT NULL DEFAULT 'pending'
            )
        """)
        
        # 2. Tabla de documentos original
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                task_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                meta_pages INTEGER DEFAULT 0,
                meta_chunks INTEGER DEFAULT 0
            )
        """)
        
        # 3. MigraciÃ³n: Agregar nuevas columnas a documents si no existen
        async with db.execute("PRAGMA table_info(documents)") as cursor:
            columns = [col[1] async for col in cursor]
            
        needs_migration = False
        if "expediente_id" not in columns:
            await db.execute("ALTER TABLE documents ADD COLUMN expediente_id TEXT REFERENCES expedientes(id) ON DELETE CASCADE")
            needs_migration = True
        if "custom_name" not in columns:
            await db.execute("ALTER TABLE documents ADD COLUMN custom_name TEXT")
        if "sync_status" not in columns:
            await db.execute("ALTER TABLE documents ADD COLUMN sync_status TEXT DEFAULT 'pending'")
            
        await db.commit()
        
        # 4. MigraciÃ³n de Datos (Asignar a Expediente General)
        if needs_migration:
            # Checar si hay documentos huerfanos
            async with db.execute("SELECT COUNT(*) FROM documents WHERE expediente_id IS NULL") as cursor:
                count = (await cursor.fetchone())[0]
                
            if count > 0:
                gen_id = str(uuid.uuid4())
                created_at = datetime.datetime.utcnow().isoformat() + "Z"
                # Crear expediente general
                await db.execute("""
                    INSERT INTO expedientes (id, nombre, created_at, status, sync_status)
                    VALUES (?, ?, ?, ?, ?)
                """, (gen_id, "Expediente General (Migrado)", created_at, "active", "pending"))
                
                # Asignar documentos
                await db.execute("""
                    UPDATE documents SET expediente_id = ?, custom_name = filename WHERE expediente_id IS NULL
                """, (gen_id,))
                await db.commit()
                logger.info(f"Migrados {count} documentos al Expediente General {gen_id}")

# --- EXPEDIENTES CRUD ---

async def create_expediente(nombre: str) -> dict:
    exp_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat() + "Z"
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO expedientes (id, nombre, created_at, status, sync_status)
            VALUES (?, ?, ?, ?, ?)
        """, (exp_id, nombre, created_at, "active", "pending"))
        await db.commit()
        
    return {
        "id": exp_id,
        "nombre": nombre,
        "created_at": created_at,
        "status": "active",
        "sync_status": "pending",
        "doc_count": 0
    }

async def get_all_expedientes() -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = """
            SELECT e.*, COUNT(d.task_id) as doc_count 
            FROM expedientes e
            LEFT JOIN documents d ON e.id = d.expediente_id
            GROUP BY e.id
            ORDER BY e.created_at DESC
        """
        async with db.execute(query) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def update_expediente(exp_id: str, nombre: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE expedientes SET nombre = ? WHERE id = ?", (nombre, exp_id))
        await db.commit()

async def delete_expediente(exp_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute("DELETE FROM expedientes WHERE id = ?", (exp_id,))
        # SQLite's ON DELETE CASCADE will handle documents if PRAGMA foreign_keys is ON,
        # but to be sure we also explicitly delete documents if PRAGMA is iffy in some SQLite versions:
        await db.execute("DELETE FROM documents WHERE expediente_id = ?", (exp_id,))
        await db.commit()

# --- DOCUMENTS CRUD ---

async def upsert_document(task_id: str, filename: str, status: str, expediente_id: str, custom_name: str = None):
    created_at = datetime.datetime.utcnow().isoformat() + "Z"
    c_name = custom_name if custom_name else filename
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO documents (task_id, filename, custom_name, expediente_id, created_at, status, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
            ON CONFLICT(task_id) DO UPDATE SET 
                status=excluded.status, 
                expediente_id=excluded.expediente_id,
                custom_name=excluded.custom_name
        """, (task_id, filename, c_name, expediente_id, created_at, status))
        await db.commit()

async def update_document_status(task_id: str, status: str, meta_pages: int = 0, meta_chunks: int = 0):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE documents 
            SET status = ?, meta_pages = ?, meta_chunks = ?
            WHERE task_id = ?
        """, (status, meta_pages, meta_chunks, task_id))
        await db.commit()

async def get_document_status(task_id: str) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT status, meta_pages, meta_chunks, expediente_id FROM documents WHERE task_id = ?", (task_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None

async def get_documents_by_expediente(expediente_id: str) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM documents WHERE expediente_id = ? ORDER BY created_at DESC", (expediente_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
async def get_document_full(task_id: str) -> dict:
    import aiosqlite
    from app.services.db_service import DB_PATH
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM documents WHERE task_id = ?", (task_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None


