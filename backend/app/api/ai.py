from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import ensure_course_access, get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import Role, User
from app.schemas.common import AgentRunRequest, LessonPlanRequest, RecommendationRequest
from app.services.agent import agent_service
from app.services.llm import LESSON_PLAN_PROMPT, QUESTION_RECOMMEND_PROMPT, invoke_json


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
