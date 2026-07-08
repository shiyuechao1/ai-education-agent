import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user, require_roles
from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import (
    Answer,
    Assignment,
    AssignmentQuestion,
    Question,
    QuestionBank,
    QuestionType,
    Role,
    Submission,
    User,
)
from app.schemas.common import (
    AssignmentCreate,
    AssignmentOut,
    ManualGrade,
    QuestionCreate,
    QuestionBankCreate,
    QuestionBankOut,
    QuestionOut,
    SubmissionCreate,
    SubmissionOut,
    SubmissionResult,
)
from app.models.entities import ErrorCollection
from app.services.grading import auto_grade
from app.services.llm import record_learning


router = APIRouter(prefix="/assignments", tags=["assignments"])
settings = get_settings()


@router.post("/banks", response_model=QuestionBankOut)
def create_question_bank(
    payload: QuestionBankCreate,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, payload.course_id)
    bank = QuestionBank(course_id=payload.course_id, name=payload.name, created_by=current_user.id)
    db.add(bank)
    db.flush()
    for item in payload.questions:
        db.add(Question(bank_id=bank.id, **item.model_dump()))
    db.commit()
    db.refresh(bank)
    return bank


@router.post("/banks/{bank_id}/questions", response_model=QuestionOut)
def add_question_to_bank(
    bank_id: int,
    payload: QuestionCreate,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    bank = db.get(QuestionBank, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="题库不存在")
    ensure_course_access(db, current_user, bank.course_id)
    question = Question(bank_id=bank.id, **payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/banks/course/{course_id}")
def list_course_question_banks(
    course_id: int,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, course_id)
    rows = db.execute(
        select(QuestionBank, func.count(Question.id).label("question_count"))
        .outerjoin(Question, Question.bank_id == QuestionBank.id)
        .where(QuestionBank.course_id == course_id)
        .group_by(
            QuestionBank.id,
            QuestionBank.course_id,
            QuestionBank.name,
            QuestionBank.created_by,
            QuestionBank.created_at,
        )
        .order_by(QuestionBank.created_at.desc())
    ).all()
    return [
        {
            "id": bank.id,
            "course_id": bank.course_id,
            "name": bank.name,
            "created_by": bank.created_by,
            "created_at": bank.created_at,
            "question_count": question_count,
        }
        for bank, question_count in rows
    ]


@router.get("/banks/{bank_id}/questions", response_model=list[QuestionOut])
def list_bank_questions(bank_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bank = db.get(QuestionBank, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="题库不存在")
    ensure_course_access(db, current_user, bank.course_id)
    return db.scalars(select(Question).where(Question.bank_id == bank_id)).all()


def detach_question_if_no_answers(db: Session, question_id: int) -> None:
    has_answers = db.scalar(select(func.count()).select_from(Answer).where(Answer.question_id == question_id))
    if has_answers:
        raise HTTPException(status_code=400, detail="该题目已有学生作答记录，不能删除。请保留历史记录，或新建题库替代使用。")
    assignment_links = db.scalars(
        select(AssignmentQuestion).where(AssignmentQuestion.question_id == question_id)
    ).all()
    for link in assignment_links:
        db.delete(link)


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    bank = db.get(QuestionBank, question.bank_id)
    ensure_course_access(db, current_user, bank.course_id)
    detach_question_if_no_answers(db, question.id)
    db.delete(question)
    db.commit()
    return {"ok": True}


@router.delete("/banks/{bank_id}")
def delete_question_bank(
    bank_id: int,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    bank = db.get(QuestionBank, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="题库不存在")
    ensure_course_access(db, current_user, bank.course_id)
    questions = db.scalars(select(Question).where(Question.bank_id == bank_id)).all()
    for question in questions:
        detach_question_if_no_answers(db, question.id)
    for question in questions:
        db.delete(question)
    db.delete(bank)
    db.commit()
    return {"ok": True}


@router.post("", response_model=AssignmentOut)
def create_assignment(
    payload: AssignmentCreate,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, payload.course_id)
    assignment = Assignment(
        course_id=payload.course_id,
        title=payload.title,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(assignment)
    db.flush()
    questions = db.scalars(select(Question).where(Question.id.in_(payload.question_ids))).all()
    for index, question in enumerate(questions):
        db.add(AssignmentQuestion(assignment_id=assignment.id, question_id=question.id, sort_order=index))
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/course/{course_id}", response_model=list[AssignmentOut])
def list_assignments(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, course_id)
    return db.scalars(select(Assignment).where(Assignment.course_id == course_id).order_by(Assignment.created_at.desc())).all()


@router.get("/{assignment_id}/questions", response_model=list[QuestionOut])
def assignment_questions(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    ensure_course_access(db, current_user, assignment.course_id)
    stmt = (
        select(Question)
        .join(AssignmentQuestion, AssignmentQuestion.question_id == Question.id)
        .where(AssignmentQuestion.assignment_id == assignment_id)
        .order_by(AssignmentQuestion.sort_order)
    )
    return db.scalars(stmt).all()


@router.post("/answer-upload")
def upload_answer_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(Role.student)),
):
    answer_dir = settings.upload_path / "answers" / str(current_user.id)
    answer_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "answer.bin").name
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    target = answer_dir / filename
    with target.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {
        "filename": safe_name,
        "image_path": f"/api/assignments/answer-files/{current_user.id}/{filename}",
    }


@router.get("/answer-files/{student_id}/{filename}")
def download_answer_file(
    student_id: int,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    target = settings.upload_path / "answers" / str(student_id) / Path(filename).name
    if not target.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    if current_user.role == Role.student and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="无权查看该文件")
    return FileResponse(target)


@router.post("/submit", response_model=SubmissionResult)
def submit_assignment(
    payload: SubmissionCreate,
    current_user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, payload.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    ensure_course_access(db, current_user, assignment.course_id)
    if db.scalar(
        select(Submission).where(
            Submission.assignment_id == payload.assignment_id,
            Submission.student_id == current_user.id,
        )
    ):
        raise HTTPException(status_code=400, detail="该作业已提交")
    submission = Submission(assignment_id=payload.assignment_id, student_id=current_user.id)
    db.add(submission)
    db.flush()
    total = 0.0
    result_answers = []
    question_map = {q.id: q for q in db.scalars(select(Question)).all()}
    for item in payload.answers:
        question = question_map[item.question_id]
        is_correct, score = auto_grade(question, item.content)
        total += score
        db.add(
            Answer(
                submission_id=submission.id,
                question_id=item.question_id,
                content=item.content,
                image_path=item.image_path,
                is_correct=is_correct,
                score=score,
            )
        )
        result_answers.append(
            {
                "question_id": question.id,
                "type": question.type,
                "stem": question.stem,
                "student_answer": item.content,
                "image_path": item.image_path,
                "reference_answer": question.answer,
                "is_correct": is_correct,
                "score": score,
                "max_score": question.score,
                "analysis": question.analysis,
            }
        )
    submission.total_score = total
    # 自动收藏错题 + 记录学习行为
    for item in result_answers:
        if item["is_correct"] is False or (item["is_correct"] is None and item["score"] == 0):
            exists = db.scalar(
                select(ErrorCollection).where(
                    ErrorCollection.student_id == current_user.id,
                    ErrorCollection.question_id == item["question_id"],
                )
            )
            if not exists:
                db.add(ErrorCollection(
                    student_id=current_user.id,
                    question_id=item["question_id"],
                    wrong_answer=item["student_answer"],
                ))
    record_learning(db, current_user.id, assignment.course_id, "answer", {
        "assignment_id": assignment.id,
        "total_score": total,
        "correct_count": sum(1 for a in result_answers if a["is_correct"] is True),
        "total_count": len(result_answers),
    })
    db.commit()
    db.refresh(submission)
    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "total_score": submission.total_score,
        "submitted_at": submission.submitted_at,
        "answers": result_answers,
    }


@router.get("/{assignment_id}/submissions", response_model=list[SubmissionOut])
def list_submissions(
    assignment_id: int,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    ensure_course_access(db, current_user, assignment.course_id)
    return db.scalars(select(Submission).where(Submission.assignment_id == assignment_id)).all()


@router.get("/{assignment_id}/submissions/detail")
def list_submission_details(
    assignment_id: int,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    ensure_course_access(db, current_user, assignment.course_id)
    rows = db.execute(
        select(Submission, User, Answer, Question)
        .join(User, User.id == Submission.student_id)
        .join(Answer, Answer.submission_id == Submission.id)
        .join(Question, Question.id == Answer.question_id)
        .where(Submission.assignment_id == assignment_id)
        .order_by(Submission.submitted_at.desc(), User.name, Question.id)
    ).all()
    grouped: dict[int, dict] = {}
    for submission, student, answer, question in rows:
        if submission.id not in grouped:
            grouped[submission.id] = {
                "id": submission.id,
                "assignment_id": submission.assignment_id,
                "student": {
                    "id": student.id,
                    "name": student.name,
                    "username": student.username,
                    "user_no": student.user_no,
                },
                "total_score": submission.total_score,
                "submitted_at": submission.submitted_at,
                "answers": [],
            }
        grouped[submission.id]["answers"].append(
            {
                "answer_id": answer.id,
                "question_id": question.id,
                "type": question.type,
                "stem": question.stem,
                "options": question.options,
                "student_answer": answer.content,
                "image_path": answer.image_path,
                "reference_answer": question.answer,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "max_score": question.score,
                "analysis": question.analysis,
                "teacher_comment": answer.teacher_comment,
            }
        )
    return list(grouped.values())


@router.put("/grade")
def manual_grade(
    payload: ManualGrade,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    answer = db.get(Answer, payload.answer_id)
    if not answer:
        raise HTTPException(status_code=404, detail="答案不存在")
    question = db.get(Question, answer.question_id)
    submission = db.get(Submission, answer.submission_id)
    if not question or not submission:
        raise HTTPException(status_code=404, detail="作答记录不完整")
    assignment = db.get(Assignment, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    ensure_course_access(db, current_user, assignment.course_id)
    if question.type != QuestionType.short:
        raise HTTPException(status_code=400, detail="仅简答题支持人工评分")
    if payload.score > question.score:
        raise HTTPException(status_code=400, detail="人工给分不能超过题目满分")
    answer.score = payload.score
    answer.is_correct = payload.score >= question.score
    answer.teacher_comment = payload.teacher_comment
    submission.total_score = sum(item.score for item in submission.answers)
    db.commit()
    return {"ok": True, "total_score": submission.total_score}
