from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from app.config import settings
import uuid

VECTOR_DIM = 384

_model = None


def get_embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return _model


class VectorStore:
    def __init__(self):
        self.client = QdrantClient(url=settings.qdrant_url)
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            if settings.collection_name not in collections:
                self.client.create_collection(
                    collection_name=settings.collection_name,
                    vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
                )
        except Exception:
            pass  # Qdrant may not be available in test environment

    def embed(self, text: str) -> list[float]:
        model = get_embedding_model()
        return model.encode(text).tolist()

    def upsert(self, text: str, metadata: dict) -> str:
        point_id = str(uuid.uuid4())
        vector = self.embed(text)
        self.client.upsert(
            collection_name=settings.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=metadata)],
        )
        return point_id

    def search(self, query: str, limit: int = 10) -> list[dict]:
        try:
            vector = self.embed(query)
            results = self.client.search(
                collection_name=settings.collection_name,
                query_vector=vector,
                limit=limit,
            )
            return [{"score": r.score, **r.payload} for r in results]
        except Exception:
            return []
