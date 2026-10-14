import logging
from typing import Optional
from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    @classmethod
    def connect(cls) -> None:
        """Initialize single reusable PyMongo connection and create indexes."""
        if cls._client is None:
            try:
                logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
                cls._client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=3000,
                    connectTimeoutMS=3000,
                )
                # Verify connection
                cls._client.admin.command("ping")
                cls._db = cls._client[settings.MONGODB_DATABASE]
                logger.info(f"Connected successfully to MongoDB database '{settings.MONGODB_DATABASE}'.")

                cls._ensure_indexes()
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(
                    f"MongoDB connection failed: {e}. "
                    "In-memory fallback / mock mode will be used if MongoDB is unavailable."
                )
                cls._db = None

    @classmethod
    def _ensure_indexes(cls) -> None:
        """Create indexes on feedback_id, created_at, and status."""
        if cls._db is not None:
            try:
                # feedback_sessions collection indexes
                feedback_col = cls._db["feedback_sessions"]
                feedback_col.create_index([("feedback_id", ASCENDING)], unique=True)
                feedback_col.create_index([("created_at", ASCENDING)])
                feedback_col.create_index([("status", ASCENDING)])

                # reports collection indexes
                reports_col = cls._db["reports"]
                reports_col.create_index([("feedback_id", ASCENDING)], unique=True)
                reports_col.create_index([("created_at", ASCENDING)])

                logger.info("MongoDB indexes created successfully.")
            except Exception as e:
                logger.warning(f"Failed to create indexes: {e}")

    @classmethod
    def get_database(cls) -> Optional[Database]:
        if cls._client is None:
            cls.connect()
        return cls._db

    @classmethod
    def get_collection(cls, name: str) -> Optional[Collection]:
        db = cls.get_database()
        if db is not None:
            return db[name]
        return None

    @classmethod
    def close(cls) -> None:
        """Close connection on shutdown."""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB connection closed.")


# In-memory mock storage fallback when MongoDB server is not locally running
class InMemoryStore:
    sessions: dict = {}
    reports: dict = {}


in_memory_store = InMemoryStore()
