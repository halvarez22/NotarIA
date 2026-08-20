import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings

client = TestClient(app)
settings = get_settings()
headers = {"Authorization": f"Bearer {settings.API_KEY}"}

def test_crud_expedientes():
    # 1. Crear expediente
    res_create = client.post("/api/expedientes", headers=headers, json={"nombre": "Test Expediente 1"})
    assert res_create.status_code == 200
    data_create = res_create.json()
    assert "id" in data_create
    assert data_create["nombre"] == "Test Expediente 1"
    
    exp_id = data_create["id"]

    # 2. Obtener lista
    res_list = client.get("/api/expedientes", headers=headers)
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert "expedientes" in data_list
    # Buscar el creado
    found = any(e["id"] == exp_id for e in data_list["expedientes"])
    assert found

    # 3. Renombrar
    res_update = client.put(f"/api/expedientes/{exp_id}", headers=headers, json={"nombre": "Renombrado"})
    assert res_update.status_code == 200

    # 4. Obtener documentos (debe estar vacío)
    res_docs = client.get(f"/api/expedientes/{exp_id}/documents", headers=headers)
    assert res_docs.status_code == 200
    assert "documents" in res_docs.json()

    # 5. Eliminar
    res_delete = client.delete(f"/api/expedientes/{exp_id}", headers=headers)
    assert res_delete.status_code == 200

    # Verificar que se eliminó
    res_list2 = client.get("/api/expedientes", headers=headers)
    found = any(e["id"] == exp_id for e in res_list2.json()["expedientes"])
    assert not found
