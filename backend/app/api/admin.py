from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.entities import Course, CourseMember, Feedback, Role, User
from app.schemas.common import CourseCreate, CourseOut, FeedbackOut, FeedbackReply, UserCreate, UserOut
from app.services.id_generator import generate_user_no


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserOut)
def create_user(
    payload: UserCreate,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="两次输入的密码不一致")
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status_code=400, detail="用户名已存在")
    role = Role(payload.role)
    user = User(
        username=payload.username,
        name=payload.name,
        role=role,
        entry_year=payload.entry_year,
        user_no=generate_user_no(db, role, payload.entry_year),
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(_: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.post("/courses", response_model=CourseOut)
def create_course(
    payload: CourseCreate,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    teacher = db.get(User, payload.teacher_id)
    if not teacher or teacher.role != Role.teacher:
        raise HTTPException(status_code=400, detail="授课教师不存在")
    raw_student_ids = list(dict.fromkeys(payload.student_ids))
    student_user_nos = [str(student_id) for student_id in raw_student_ids]
    students = db.scalars(
        select(User).where(
            User.role == Role.student,
            or_(User.id.in_(raw_student_ids), User.user_no.in_(student_user_nos)),
        )
    ).all()
    matched_identifiers = {student.id for student in students} | {
        int(student.user_no) for student in students if student.user_no.isdigit()
    }
    missing_identifiers = [student_id for student_id in raw_student_ids if student_id not in matched_identifiers]
    if missing_identifiers:
        raise HTTPException(status_code=400, detail=f"学生不存在或不是学生身份：{missing_identifiers}")
    if any(student.role != Role.student for student in students):
        raise HTTPException(status_code=400, detail="课程成员只能选择学生")
    course = Course(name=payload.name, description=payload.description, teacher_id=payload.teacher_id)
    db.add(course)
    db.flush()
    for student in students:
        db.add(CourseMember(course_id=course.id, user_id=student.id))
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses", response_model=list[CourseOut])
def list_courses(_: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    return db.scalars(select(Course).order_by(Course.created_at.desc())).all()


@router.get("/feedback", response_model=list[FeedbackOut])
def list_feedback(_: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    return db.scalars(select(Feedback).order_by(Feedback.created_at.desc())).all()


@router.put("/feedback/{feedback_id}/reply", response_model=FeedbackOut)
def reply_feedback(
    feedback_id: int,
    payload: FeedbackReply,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    feedback = db.get(Feedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="反馈不存在")
    feedback.reply = payload.reply
    db.commit()
    db.refresh(feedback)
    return feedback
