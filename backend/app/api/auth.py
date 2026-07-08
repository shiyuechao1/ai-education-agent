from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user, oauth2_scheme
from app.core.database import get_db
from app.core.redis import blacklist_add
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.entities import User
from app.schemas.common import PasswordChange, TokenOut, UserOut


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(
        select(User).where(or_(User.username == form.username, User.user_no == form.username))
    )
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    token = create_access_token(str(user.id), {"role": user.role})
    return TokenOut(access_token=token, role=user.role)


@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
    """登出：将当前 token 加入黑名单。"""
    blacklist_add(token)
    return {"ok": True, "detail": "已登出"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/password", response_model=UserOut)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="两次输入的新密码不一致")
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="旧密码错误")
    if payload.username:
        exists = db.scalar(select(User).where(User.username == payload.username, User.id != current_user.id))
        if exists:
            raise HTTPException(status_code=400, detail="用户名已存在")
        current_user.username = payload.username
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    db.refresh(current_user)
    return current_user
