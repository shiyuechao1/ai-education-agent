from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.entities import Feedback, User
from app.schemas.common import FeedbackCreate, FeedbackOut


router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut)
def create_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback = Feedback(user_id=current_user.id, rating=payload.rating, content=payload.content)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
