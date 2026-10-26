from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

class Base(DeclarativeBase):
    pass

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db() -> None:
    """Initialize database tables and default fixtures."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Populate initial seed fixtures if database is unseeded
        try:
            from seed.seed_data import seed_database
            async with async_session_maker() as session:
                await seed_database(session)
        except Exception as seed_err:
            print(f"[Database] Notice: Seed auto-population skipped: {seed_err}")
    except Exception as e:
        # In testing or standalone development without Postgres running, log warning
        print(f"[Database] Warning: Could not auto-initialize tables: {e}")
