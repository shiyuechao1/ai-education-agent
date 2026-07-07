from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import Role, User


def generate_user_no(db: Session, role: Role, entry_year: int = 2026) -> str:
    role_code = "1" if role == Role.teacher else "0"
    count = db.scalar(select(func.count()).select_from(User).where(User.role == role)) or 0
    return f"{entry_year}{role_code}{count + 1:03d}"
