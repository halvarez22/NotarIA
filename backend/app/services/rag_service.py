import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from app.core.config import get_settings

class RAGService:
    def __init__(self):
        self.settings = get_settings()
        self.embeddings = OllamaEmbeddings(
            base_url=self.settings.OLLAMA_BASE_URL,
            model=self.settings.EMBEDDING_MODEL
        )
        self.persist_dir = "./chroma_db"
        os.makedirs(self.persist_dir, exist_ok=True)
        
        self.vectorstore = Chroma(
            collection_name="licitai_docs",
            embedding_function=self.embeddings,
            persist_directory=self.persist_dir
        )
        
        # Semantic Chunking Legal (Regla 7 y Qwen)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\nArtículo", "\n\nCláusula", "\n\nSección", "\n\n", "\n", " ", ""]
        )
        
    def index_document(self, task_id: str, text: str):
        # Sanitización Post-OCR básica para limpiar prompt injections accidentales
        safe_text = text.replace("ignore previous instructions", "")
        
        chunks = self.splitter.split_text(safe_text)
        if not chunks:
            return
            
        metadatas = [{"task_id": task_id, "chunk": i} for i in range(len(chunks))]
        self.vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        # Chroma persiste automáticamente
