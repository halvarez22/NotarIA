import sys
from unittest.mock import MagicMock

class DummyOllamaEmbeddings:
    def __init__(self, *args, **kwargs):
        pass

class DummyChroma:
    def __init__(self, *args, **kwargs):
        pass

langchain_community = MagicMock()
langchain_community.embeddings = MagicMock()
langchain_community.embeddings.OllamaEmbeddings = DummyOllamaEmbeddings
langchain_community.vectorstores = MagicMock()
langchain_community.vectorstores.Chroma = DummyChroma

sys.modules['langchain_community'] = langchain_community
sys.modules['langchain_community.embeddings'] = langchain_community.embeddings
sys.modules['langchain_community.vectorstores'] = langchain_community.vectorstores
