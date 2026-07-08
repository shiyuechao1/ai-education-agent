from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user, make_rate_limiter
from app.core.database import get_db
from app.models.entities import ChatMessage, ChatSession, Role, User
from app.schemas.common import ChatAnswer, ChatAsk
from app.services.llm import invoke_stream, record_learning
from app.services.pdf_export import export_chat_session_pdf
from app.services.rag import rag_service


router = APIRouter(prefix="/qa", tags=["qa"])
# 智能问答限流：每用户每分钟最多 10 次
rate_limit_ask = make_rate_limiter("qa:ask", max_calls=10, window_seconds=60)


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
    if current_user.role == Role.student:
        record_learning(db, current_user.id, payload.course_id, "qa", {"question": payload.question[:200]})
        db.commit()
    return ChatAnswer(session_id=session.id, answer=result["answer"], citations=result["citations"], pages=result.get("pages", []))


@router.post("/ask/stream")
def ask_stream(payload: ChatAsk, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """流式问答：SSE 逐字返回，体验更流畅。"""
    ensure_course_access(db, current_user, payload.course_id)

    # 创建会话
    session = db.get(ChatSession, payload.session_id) if payload.session_id else None
    if not session:
        session = ChatSession(course_id=payload.course_id, user_id=current_user.id, title=payload.question[:80])
        db.add(session)
        db.flush()
    session_id = session.id

    # 检索上下文
    contexts = rag_service.retrieve(course_id=payload.course_id, question=payload.question)
    if not contexts:
        def empty():
            yield "data: " + "课程知识库中没有找到足够相关的内容，暂时无法基于资料回答该问题。"
        return StreamingResponse(empty(), media_type="text/event-stream")

    context_text = "\n\n".join(
        f"[{idx + 1}] {item['content']}" for idx, item in enumerate(contexts)
    )
    prompt = (
        "请只根据课程知识库回答问题。若资料不足，请明确说明不能回答。\n"
        f"问题：{payload.question}\n"
        f"资料：\n{context_text}\n"
        "请给出简明回答，并在末尾标注引用编号。"
    )

    # 保存用户问题
    db.add(ChatMessage(session_id=session_id, role="user", content=payload.question))

    # 收集完整回答（用于保存）
    full_answer: list[str] = []
    citations = [item["metadata"] for item in contexts]
    # 收集页码图片信息
    page_images: list[dict] = []
    seen = set()
    for item in contexts:
        fid = item.get("metadata", {}).get("file_id")
        pg = item.get("page", 0)
        key = (fid, pg)
        if fid is not None and key not in seen:
            seen.add(key)
            page_images.append({"file_id": fid, "page": pg})

    def generate():
        nonlocal full_answer
        # 1. 先发页面图片信息
        yield f"data: [PAGES]{json.dumps(page_images)}\n\n"
        # 2. 流式输出 LLM 回答
        for token in invoke_stream(prompt):
            full_answer.append(token)
            yield f"data: {token}\n\n"
        # 3. 保存到数据库
        answer_text = "".join(full_answer)
        if answer_text.strip():
            db.add(ChatMessage(session_id=session_id, role="assistant", content=answer_text, citations=citations))
            if current_user.role == Role.student:
                record_learning(db, current_user.id, payload.course_id, "qa", {"question": payload.question[:200]})
            db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


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
