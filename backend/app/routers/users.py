from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import User
from ..schemas.user import UserCreate, UserRead
from ..core.security import create_password_hash
from ..core.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=UserRead)
async def create_user(user_create: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_create.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=user_create.email,
        password_hash=create_password_hash(user_create.password),
        role=user_create.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
