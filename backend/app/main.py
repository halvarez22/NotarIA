from fastapi import FastAPI, Depends, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import uuid
import contextlib

from app.api.dependencies import verify_api_key
from app.core.errors import setup_exception_handlers
from app.services.upload_service import UploadService, tasks_db
from app.services.chat_service import ChatService
from app.services.db_service import (
    init_db, get_document_status, 
    create_expediente, get_all_expedientes, update_expediente, delete_expediente,
    get_documents_by_expediente
)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    yield
    # Cleanup on shutdown

app = FastAPI(
    title="NotarIA Backend API",
    description="Backend local para OCR, Embeddings y Chat con Ollama",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:8080", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_exception_handlers(app)

class UploadResponse(BaseModel):
    task_id: str
    status: str

class ChatRequest(BaseModel):
    document_id: str
    query: str

class ExpedienteCreate(BaseModel):
    nombre: str

class ExpedienteUpdate(BaseModel):
    nombre: str

@app.get("/")
def read_root():
    return {"status": "NotarIA Backend is running"}

# --- EXPEDIENTES ---

@app.post("/api/expedientes", dependencies=[Depends(verify_api_key)])
async def create_expediente_endpoint(data: ExpedienteCreate):
    return await create_expediente(data.nombre)

@app.get("/api/expedientes", dependencies=[Depends(verify_api_key)])
async def list_expedientes():
    docs = await get_all_expedientes()
    return {"expedientes": docs}

@app.put("/api/expedientes/{exp_id}", dependencies=[Depends(verify_api_key)])
async def update_expediente_endpoint(exp_id: str, data: ExpedienteUpdate):
    await update_expediente(exp_id, data.nombre)
    return {"status": "ok"}

@app.delete("/api/expedientes/{exp_id}", dependencies=[Depends(verify_api_key)])
async def delete_expediente_endpoint(exp_id: str):
    await delete_expediente(exp_id)
    return {"status": "ok"}

@app.get("/api/expedientes/{exp_id}/documents", dependencies=[Depends(verify_api_key)])
async def list_expediente_documents(exp_id: str):
    docs = await get_documents_by_expediente(exp_id)
    return {"documents": docs}


# --- DOCUMENTS ---

@app.post("/api/upload", response_model=UploadResponse, dependencies=[Depends(verify_api_key)])
async def upload_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    expediente_id: str = Form(...),
    custom_name: str = Form(None)
):
    try:
        service = UploadService()
        task_id = await service.process_upload(file, background_tasks, expediente_id, custom_name)
        return {"task_id": task_id, "status": tasks_db.get(task_id, "processing")}
    except ValueError as e:
        raise RequestValidationError(errors=[str(e)])

@app.get("/api/status/{task_id}", dependencies=[Depends(verify_api_key)])
async def get_status(task_id: str):
    # Try DB first
    db_status = await get_document_status(task_id)
    if db_status:
        return {
            "task_id": task_id, 
            "status": db_status["status"],
            "meta_pages": db_status.get("meta_pages", 0),
            "meta_chunks": db_status.get("meta_chunks", 0)
        }
    return {
        "task_id": task_id, 
        "status": tasks_db.get(task_id, "not_found")
    }

@app.post("/api/chat", dependencies=[Depends(verify_api_key)])
async def chat_document(request: ChatRequest):
    service = ChatService()
    return StreamingResponse(
        service.stream_chat(request.document_id, request.query),
        media_type="text/event-stream"
    )
