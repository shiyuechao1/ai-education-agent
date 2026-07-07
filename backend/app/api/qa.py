from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user
from app.core.database import get_db
from app.models.entities import ChatMessage, ChatSession, Role, User
from app.schemas.common import ChatAnswer, ChatAsk
from app.services.pdf_export import export_chat_session_pdf
from app.services.rag import rag_service


router = APIRouter(prefix="/qa", tags=["qa"])


@router.post("/ask", response_model=ChatAnswer)
def ask(payload: ChatAsk, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_course_access(db, current_user, payload.course_id)
    session = db.get(ChatSession, payload.session_id) if payload.session_id else None
    if not session:
        session = ChatSession(course_id=payload.course_id, user_id=current_user.id, title=payload.question[:80])
        db.add(session)
        db.flush()
    result = rag_service.answer(course_id=payload.course_id, question=payload.question)
    db.add(ChatMessage(session_id=session.id, role="user", content=payload.question))
    db.add(
        ChatMessage(
            session_id=session.id,
            role="assistant",
            content=result["answer"],
            citations=result["citations"],
        )
    )
    db.commit()
    return ChatAnswer(session_id=session.id, answer=result["answer"], citations=result["citations"])


@router.get("/course/{course_id}/sessions")
def list_sessions(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_course_access(db, current_user, course_id)
    stmt = select(ChatSession).where(ChatSession.course_id == course_id).order_by(ChatSession.created_at.desc())
    if current_user.role == Role.student:
        stmt = stmt.where(ChatSession.user_id == current_user.id)
    return db.scalars(stmt).all()


@router.get("/sessions/{session_id}/export")
def export_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    ensure_course_access(db, current_user, session.course_id)
    path = export_chat_session_pdf(session)
    return FileResponse(path, filename=path.name)
