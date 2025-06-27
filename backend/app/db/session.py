from typing import AsyncGenerator, Generator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine

from app.core.config import settings

# Tạo engine kết nối đến cơ sở dữ liệu
# Lưu ý: URL được chuyển đổi để sử dụng async driver
# PostgreSQL: postgresql:// -> postgresql+asyncpg://
# SQLite (cho testing): sqlite:// -> sqlite+aiosqlite://
if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://"
    )



engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  
    future=True,
    pool_pre_ping=True,  
)

# Tạo sync engine cho FileService
if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql://"):
    SYNC_DATABASE_URL = settings.DATABASE_URL


sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# Tạo session class sử dụng async
AsyncSessionLocal = sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Tạo sync session class
SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class cho tất cả các model
Base = declarative_base()

# Dependency cho FastAPI để lấy session
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency để lấy session async của SQLAlchemy.
    Được sử dụng trong các route với Depends().
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Dependency cho sync session
def get_db() -> Generator[Session, None, None]:
    """
    Dependency để lấy sync session của SQLAlchemy.
    Được sử dụng cho các tác vụ đồng bộ.
    """
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Hàm để khởi tạo tables (sẽ được sử dụng trong tests)
async def init_db() -> None:
    """
    Khởi tạo database tables (chỉ sử dụng cho tests).
    Trong thực tế, nên sử dụng Alembic migrations.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) 