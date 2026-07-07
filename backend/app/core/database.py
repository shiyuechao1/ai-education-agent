"""
数据库连接模块
SQLAlchemy 2.0 — 默认 SQLite，可切换 MySQL
"""
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# ---- 引擎参数 ----
ENGINE_KWARGS: dict = {"pool_pre_ping": True, "future": True}

if "sqlite" in settings.database_url:
    ENGINE_KWARGS["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **ENGINE_KWARGS)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


# ---- SQLite 外键 & WAL 模式 ----
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.database_url:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
