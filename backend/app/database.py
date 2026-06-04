from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Engine configuration - mTLS / secure DB connection configuration can be injected here
engine = create_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=True,
    # Avoid connection leaks by specifying pool limits
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Database session dependency generator."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
