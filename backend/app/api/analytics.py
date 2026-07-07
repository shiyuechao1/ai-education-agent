from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.entities import Assignment, ChatMessage, Course, Feedback, KnowledgeFile, Submission, User


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "users": db.scalar(select(func.count()).select_from(User)) or 0,
        "courses": db.scalar(select(func.count()).select_from(Course)) or 0,
        "knowledge_files": db.scalar(select(func.count()).select_from(KnowledgeFile)) or 0,
        "assignments": db.scalar(select(func.count()).select_from(Assignment)) or 0,
        "submissions": db.scalar(select(func.count()).select_from(Submission)) or 0,
        "chat_messages": db.scalar(select(func.count()).select_from(ChatMessage)) or 0,
        "feedback": db.scalar(select(func.count()).select_from(Feedback)) or 0,
    }
