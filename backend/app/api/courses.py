from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, my_course_filter
from app.core.database import get_db
from app.models.entities import Course, User
from app.schemas.common import CourseOut


router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/my", response_model=list[CourseOut])
def my_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Course).where(my_course_filter(current_user)).order_by(Course.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/{course_id}", response_model=CourseOut)
def course_detail(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.api.deps import ensure_course_access

    return ensure_course_access(db, current_user, course_id)
