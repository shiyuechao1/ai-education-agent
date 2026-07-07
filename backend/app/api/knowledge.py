import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import CourseMember, KnowledgeFile, Role, User
from app.schemas.common import KnowledgeOut
from app.services.rag import rag_service


router = APIRouter(prefix="/knowledge", tags=["knowledge"])
settings = get_settings()


@router.post("/{course_id}/upload", response_model=KnowledgeOut)
def upload_knowledge(
    course_id: int,
    editable_by_students: bool = False,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = ensure_course_access(db, current_user, course_id)
    can_upload = current_user.role in {Role.admin, Role.teacher} or db.scalar(
        select(CourseMember).where(
            CourseMember.course_id == course.id,
            CourseMember.user_id == current_user.id,
            CourseMember.can_edit_knowledge.is_(True),
        )
    )
    if not can_upload:
        raise HTTPException(status_code=403, detail="没有知识库编辑权限")
    course_dir = settings.upload_path / "knowledge" / str(course_id)
    course_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "upload.bin").name
    target = course_dir / safe_name
    with target.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    record = KnowledgeFile(
        course_id=course_id,
        uploader_id=current_user.id,
        filename=safe_name,
        file_path=str(target),
        content_type=file.content_type,
        editable_by_students=editable_by_students,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    chunks = rag_service.ingest_file(
        course_id=course_id,
        file_id=record.id,
        file_path=record.file_path,
        filename=record.filename,
    )
    record.indexed = chunks > 0
    db.commit()
    db.refresh(record)
    return record


@router.get("/{course_id}", response_model=list[KnowledgeOut])
def list_knowledge(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, course_id)
    return db.scalars(
        select(KnowledgeFile).where(KnowledgeFile.course_id == course_id).order_by(KnowledgeFile.created_at.desc())
    ).all()


@router.get("/{course_id}/download/{file_id}")
def download_knowledge(
    course_id: int,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, course_id)
    record = db.get(KnowledgeFile, file_id)
    if not record or record.course_id != course_id:
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(record.file_path, filename=record.filename)


@router.put("/{course_id}/members/{student_id}/permission")
def update_student_knowledge_permission(
    course_id: int,
    student_id: int,
    can_edit: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = ensure_course_access(db, current_user, course_id)
    if current_user.role != Role.admin and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有任课教师可授权")
    member = db.scalar(
        select(CourseMember).where(CourseMember.course_id == course_id, CourseMember.user_id == student_id)
    )
    if not member:
        raise HTTPException(status_code=404, detail="学生不在课程中")
    member.can_edit_knowledge = can_edit
    db.commit()
    return {"ok": True}
