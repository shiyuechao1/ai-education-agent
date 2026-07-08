from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import blacklist_check, rate_limit_check
from app.core.security import decode_access_token
from app.models.entities import Course, CourseMember, Role, User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    # 黑名单检查（登出后的 token 不可用）
    if blacklist_check(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token 已失效，请重新登录")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效")
    user = db.scalar(select(User).where(User.id == int(payload["sub"])))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不可用")
    return user


def require_roles(*roles: Role):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="权限不足")
        return current_user

    return checker


def ensure_course_access(db: Session, user: User, course_id: int) -> Course:
    course = db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    if user.role == Role.admin or course.teacher_id == user.id:
        return course
    member = db.scalar(
        select(CourseMember).where(
            CourseMember.course_id == course_id,
            CourseMember.user_id == user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="无课程访问权限")
    return course


def my_course_filter(user: User):
    if user.role == Role.admin:
        return True
    if user.role == Role.teacher:
        return Course.teacher_id == user.id
    return Course.id.in_(select(CourseMember.course_id).where(CourseMember.user_id == user.id))


# ---- 限流 ----

def make_rate_limiter(key_prefix: str, max_calls: int = 30, window_seconds: int = 60):
    """工厂函数：生成一个限流依赖。

    用法：
        from app.api.deps import make_rate_limiter
        ask_limiter = make_rate_limiter("qa:ask", max_calls=10, window_seconds=60)

        @router.post("/ask")
        def ask(_: None = Depends(ask_limiter)):
            ...
    """
    def limiter(current_user: User = Depends(get_current_user)):
        if not rate_limit_check(key_prefix, str(current_user.id), max_calls, window_seconds):
            raise HTTPException(status_code=429, detail="请求太频繁，请稍后再试")
    return limiter
