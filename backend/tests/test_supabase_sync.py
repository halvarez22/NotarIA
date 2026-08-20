import pytest
from unittest.mock import patch, MagicMock
from app.services.supabase_sync_service import SupabaseSyncService

@pytest.fixture
def sync_service():
    # Mocking os.environ to ensure client is created even if env vars are missing locally
    with patch("os.getenv", side_effect=lambda k, d="": "fake" if k.startswith("SUPABASE") else d):
        with patch("app.services.supabase_sync_service.create_client") as mock_create:
            mock_client = MagicMock()
            mock_create.return_value = mock_client
            service = SupabaseSyncService()
            return service

@pytest.mark.asyncio
async def test_sync_document_success(sync_service):
    # Setup mocks
    client = sync_service.client
    # 1. Idempotency: not exists
    client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    result = await sync_service.sync_document(
        task_id="task123",
        expediente_id="exp123",
        custom_name="Test Doc",
        filename="test.pdf",
        content=b"fake content",
        chunks=["chunk1", "chunk2"],
        embeddings=[[0.1]*768, [0.2]*768]
    )
    
    assert result is True
    # Verify Storage upload
    client.storage.from_.assert_called_with("expedientes")
    client.storage.from_().upload.assert_called_once()
    
    # Verify Postgres upsert
    assert client.table.call_count >= 2 # once for select, once for documents, once for document_chunks
    # Last call should be document_chunks upsert with 2 items
    client.table.assert_any_call("document_chunks")
    client.table.assert_any_call("documents")

@pytest.mark.asyncio
async def test_sync_document_idempotency(sync_service):
    client = sync_service.client
    # 1. Idempotency: already exists
    client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"task_id": "task123"}]
    
    result = await sync_service.sync_document(
        task_id="task123",
        expediente_id="exp123",
        custom_name="Test Doc",
        filename="test.pdf",
        content=b"fake content",
        chunks=[],
        embeddings=[]
    )
    
    assert result is True
    # Storage should NOT be called
    client.storage.from_.assert_not_called()

@pytest.mark.asyncio
async def test_sync_document_postgres_failure_triggers_rollback(sync_service):
    client = sync_service.client
    client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    # Storage upload succeeds, but Postgres upsert fails
    # Let's make the second call to table() (which is for "documents") raise an Exception
    def table_side_effect(name):
        mock_tbl = MagicMock()
        if name == "documents":
            # For the select (idempotency), we need it to return empty list
            # For the upsert, we need it to raise exception
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = []
            mock_tbl.upsert.side_effect = Exception("DB Insert Failed")
        return mock_tbl
        
    client.table.side_effect = table_side_effect
    
    result = await sync_service.sync_document(
        task_id="task_fail",
        expediente_id="exp123",
        custom_name="Test Doc",
        filename="test.pdf",
        content=b"fake content",
        chunks=["chunk1"],
        embeddings=[[0.1]*768]
    )
        
    assert result is False
    
    # Verify rollback was called
    client.storage.from_.assert_called_with("expedientes")
    client.storage.from_().remove.assert_called_once_with(["exp123/task_fail.pdf"])
