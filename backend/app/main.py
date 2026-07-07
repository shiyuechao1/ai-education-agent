from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import admin, ai, analytics, assignments, auth, courses, feedback, knowledge, mcp, qa
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models import *  # noqa: F403
from app.models.entities import Role, User


app = FastAPI(title="AI 教育智能备课与个性化学习辅导智能体")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(knowledge.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(qa.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(mcp.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


def seed_admin(db: Session) -> None:
    if db.scalar(select(User).where(User.role == Role.admin)):
        return
    db.add(
        User(
            username="admin",
            name="系统管理员",
            role=Role.admin,
            entry_year=2026,
            user_no="2026999",
            hashed_password=get_password_hash("admin123"),
        )
    )
    db.commit()


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_admin(db)


@app.get("/api/health")
def health():
    return {"status": "ok"}
