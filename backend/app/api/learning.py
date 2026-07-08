"""
学习记录 API
- 学生：查看自己的学习记录
- 教师：查看课程学生的学习记录
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import LearningRecord, Role, User
from app.schemas.common import LearningRecordOut

router = APIRouter(prefix="/learning", tags=["learning"])


@router.get("/my", response_model=list[LearningRecordOut])
def list_my_records(
    current_user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    """查看自己的学习记录"""
    return db.scalars(
        select(LearningRecord)
        .where(LearningRecord.student_id == current_user.id)
        .order_by(LearningRecord.created_at.desc())
        .limit(100)
    ).all()


@router.get("/course/{course_id}", response_model=list[LearningRecordOut])
def list_course_records(
    course_id: int,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    """教师/管理员查看课程所有学生的学习记录"""
    ensure_course_access(db, current_user, course_id)
    return db.scalars(
        select(LearningRecord)
        .where(LearningRecord.course_id == course_id)
        .order_by(LearningRecord.created_at.desc())
        .limit(200)
    ).all()
