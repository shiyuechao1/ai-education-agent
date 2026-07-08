"""
错题收藏 API
- 学生：添加/查看/删除自己的错题
- 教师：查看课程学生的错题统计
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import ErrorCollection, Question, Role, User
from app.schemas.common import ErrorCreate, ErrorOut

router = APIRouter(prefix="/errors", tags=["errors"])


@router.post("/{question_id}", response_model=ErrorOut)
def add_error(
    question_id: int,
    payload: ErrorCreate,
    current_user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    """将做错的题目加入错题本"""
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 去重
    exists = db.scalar(
        select(ErrorCollection).where(
            ErrorCollection.student_id == current_user.id,
            ErrorCollection.question_id == question_id,
        )
    )
    if exists:
        raise HTTPException(status_code=400, detail="该题已在错题本中")

    err = ErrorCollection(
        student_id=current_user.id,
        question_id=question_id,
        wrong_answer=payload.wrong_answer,
    )
    db.add(err)
    db.commit()
    db.refresh(err)

    return {
        "id": err.id,
        "student_id": err.student_id,
        "question_id": err.question_id,
        "wrong_answer": err.wrong_answer,
        "created_at": err.created_at,
        "stem": question.stem,
        "type": question.type,
        "answer": question.answer,
        "analysis": question.analysis,
    }


@router.get("/my", response_model=list[ErrorOut])
def list_my_errors(
    current_user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    """查看自己的错题本"""
    rows = db.execute(
        select(ErrorCollection, Question)
        .join(Question, Question.id == ErrorCollection.question_id)
        .where(ErrorCollection.student_id == current_user.id)
        .order_by(ErrorCollection.created_at.desc())
    ).all()

    return [
        {
            "id": err.id,
            "student_id": err.student_id,
            "question_id": err.question_id,
            "wrong_answer": err.wrong_answer,
            "created_at": err.created_at,
            "stem": question.stem,
            "type": question.type,
            "answer": question.answer,
            "analysis": question.analysis,
        }
        for err, question in rows
    ]


@router.delete("/{error_id}")
def remove_error(
    error_id: int,
    current_user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    """从错题本中移除"""
    err = db.get(ErrorCollection, error_id)
    if not err or err.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="错题记录不存在")
    db.delete(err)
    db.commit()
    return {"ok": True}
