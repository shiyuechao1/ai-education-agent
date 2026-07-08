from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sqlalchemy import select

from app.api.deps import ensure_course_access, get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import ErrorCollection, Question, Role, User
from app.schemas.common import (
    AgentRunRequest,
    ErrorAnalysisRequest,
    LessonPlanRequest,
    RecommendationRequest,
    TutoringPlanOut,
)
from app.services.agent import agent_service
from app.services.llm import ERROR_ANALYSIS_PROMPT, LESSON_PLAN_PROMPT, QUESTION_RECOMMEND_PROMPT, invoke_json


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/lesson-plan")
def generate_lesson_plan(
    payload: LessonPlanRequest,
    current_user: User = Depends(require_roles(Role.teacher, Role.admin)),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, payload.course_id)
    prompt = LESSON_PLAN_PROMPT.format(**payload.model_dump())
    return invoke_json(prompt, {"title": payload.topic, "objectives": [], "steps": []})


@router.post("/recommend-questions")
def recommend_questions(
    payload: RecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_course_access(db, current_user, payload.course_id)
    prompt = QUESTION_RECOMMEND_PROMPT.format(knowledge_point=payload.knowledge_point)
    return invoke_json(prompt, {"questions": []})


@router.get("/agent/tools")
def list_agent_tools(_: User = Depends(get_current_user)):
    return agent_service.list_tools()


@router.post("/error-analysis")
def analyze_errors(
    payload: ErrorAnalysisRequest,
    current_user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    """错题分析与个性化辅导方案"""
    ensure_course_access(db, current_user, payload.course_id)

    if payload.error_ids:
        errors = db.scalars(
            select(ErrorCollection)
            .where(
                ErrorCollection.id.in_(payload.error_ids),
                ErrorCollection.student_id == current_user.id,
            )
        ).all()
    else:
        errors = db.scalars(
            select(ErrorCollection).where(ErrorCollection.student_id == current_user.id)
        ).all()

    if not errors:
        return {"summary": "暂无错题记录，请先完成练习并收藏错题。", "weak_points": [], "error_analysis": [], "suggestions": [], "practice_plan": [], "recommended_questions": []}

    questions_map = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_([e.question_id for e in errors])))}

    lines = []
    for err in errors:
        q = questions_map.get(err.question_id)
        if q:
            lines.append(f"- 题目：{q.stem}\n  题型：{q.type}\n  正确答案：{q.answer}\n  学生答案：{err.wrong_answer}\n  解析：{q.analysis or '无'}")

    prompt = ERROR_ANALYSIS_PROMPT.format(error_questions="\n".join(lines))
    return invoke_json(prompt, {"summary": "", "weak_points": [], "error_analysis": [], "suggestions": [], "practice_plan": [], "recommended_questions": []})


@router.post("/agent/run")
def run_agent_tool(
    payload: AgentRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = agent_service.run_with_task_record(
        user_id=current_user.id,
        name=payload.tool_name,
        payload=payload.payload,
        db=db,
    )
    return {
        "task_id": task.id,
        "status": task.status,
        "output": task.output_payload,
        "error": task.error_message,
        "retry_count": task.retry_count,
    }
