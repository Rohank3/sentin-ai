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
    """Initialize database tables and default fixtures.

    Inspects existing database state: if schema is already version-managed by Alembic
    (alembic_version table present), table creation is deferred to migrations.
    Otherwise, Base.metadata.create_all is executed in development/demo/test environments.
    """
    try:
        # Import models so they register with Base.metadata before table creation
        import app.models.db_models  # noqa: F401

        async with engine.begin() as conn:
            def sync_init(sync_conn):
                from sqlalchemy import inspect
                inspector = inspect(sync_conn)
                existing_tables = set(inspector.get_table_names())

                # If schema is already managed by Alembic, defer to migrations
                if "alembic_version" in existing_tables:
                    print("[Database] Schema is managed by Alembic migrations; skipping create_all.")
                    return False

                # Restrict create_all to demo, development, or unmanaged test databases
                if not existing_tables or settings.app_env in ("development", "test", "demo"):
                    Base.metadata.create_all(sync_conn)
                    return True
                return False

            await conn.run_sync(sync_init)

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

