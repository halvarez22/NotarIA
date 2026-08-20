from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings

client = TestClient(app)
settings = get_settings()
headers = {"Authorization": f"Bearer {settings.API_KEY}"}

def test_auth_rejection():
    # Test que rechaza peticiones sin token
    response = client.post("/api/upload")
    assert response.status_code in [401, 403] # Dependiendo de la versión de FastAPI, HTTPBearer retorna 401 o 403

def test_auth_acceptance():
    # Test que acepta petición con token pero falla por no tener archivo
    response = client.post("/api/upload", headers=headers)
    assert response.status_code == 422 # Unprocessable Entity por faltar 'file'

def test_routing_and_idempotency(tmp_path):
    # Crear un archivo simulado
    test_file = tmp_path / "test.txt"
    test_file.write_text("contenido simulado")
    
    with open(test_file, "rb") as f:
        files = {"file": ("test.txt", f, "text/plain")}
        data_form = {"expediente_id": "test-exp-123"}
        res1 = client.post("/api/upload", headers=headers, files=files, data=data_form)
        assert res1.status_code == 200
        data1 = res1.json()
        assert "task_id" in data1
        assert "status" in data1
        assert data1["status"] in ["processing", "completed"]
        
    # Idempotency: Volver a subir el mismo archivo debe generar el mismo task_id
    with open(test_file, "rb") as f:
        files = {"file": ("test.txt", f, "text/plain")}
        data_form = {"expediente_id": "test-exp-123"}
        res2 = client.post("/api/upload", headers=headers, files=files, data=data_form)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data1["task_id"] == data2["task_id"]
        assert data2["status"] in ["processing", "completed"]

def test_unsupported_mime(tmp_path):
    test_file = tmp_path / "test.xyz"
    test_file.write_text("basura")
    with open(test_file, "rb") as f:
        files = {"file": ("test.xyz", f, "application/octet-stream")}
        data_form = {"expediente_id": "test-exp-123"}
        res = client.post("/api/upload", headers=headers, files=files, data=data_form)
        assert res.status_code == 422
