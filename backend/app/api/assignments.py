from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import (
    Answer,
    Assignment,
    AssignmentQuestion,
    Question,
    QuestionBank,
    Role,
    Submission,
    User,
)
from app.schemas.common import (
    AssignmentCreate,
    AssignmentOut,
    ManualGrade,
    QuestionBankCreate,
    QuestionBankOut,
    QuestionOut,
    SubmissionCreate,
    SubmissionOut,
)
from app.services.grading import auto_grade


router = APIRouter(prefix="/assignments", tags=["assignments"])


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


@router.get("/banks/{bank_id}/questions", response_model=list[QuestionOut])
def list_bank_questions(bank_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bank = db.get(QuestionBank, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="题库不存在")
    ensure_course_access(db, current_user, bank.course_id)
    return db.scalars(select(Question).where(Question.bank_id == bank_id)).all()


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


@router.post("/submit", response_model=SubmissionOut)
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
    submission.total_score = total
    db.commit()
    db.refresh(submission)
    return submission


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
    if payload.score > question.score:
        raise HTTPException(status_code=400, detail="人工给分不能超过题目满分")
    answer.score = payload.score
    answer.teacher_comment = payload.teacher_comment
    submission = db.get(Submission, answer.submission_id)
    submission.total_score = sum(item.score for item in submission.answers)
    db.commit()
    return {"ok": True, "total_score": submission.total_score}
