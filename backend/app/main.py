from fastapi import FastAPI, Depends, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import uuid

from app.api.dependencies import verify_api_key
from app.core.errors import setup_exception_handlers
from app.services.upload_service import UploadService, tasks_db
from app.services.chat_service import ChatService

app = FastAPI(
    title="LicitAI Digestor API",
    description="Backend local para OCR, Embeddings y Chat con Ollama",
    version="1.0.0",
)

# Configurar CORS (permitir llamadas desde Vercel en el futuro)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/")
def read_root():
    return {"status": "LicitAI Backend is running"}

@app.post("/api/upload", response_model=UploadResponse, dependencies=[Depends(verify_api_key)])
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        service = UploadService()
        task_id = await service.process_upload(file, background_tasks)
        return {"task_id": task_id, "status": tasks_db.get(task_id, "processing")}
    except ValueError as e:
        raise RequestValidationError(errors=[str(e)])

@app.get("/api/status/{task_id}", dependencies=[Depends(verify_api_key)])
def get_status(task_id: str):
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
