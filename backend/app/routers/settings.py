from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.deps import get_current_teacher
from ..db import get_db
from ..models import User
from ..schemas.settings import TeacherPreferences

router = APIRouter()


@router.get("/", response_model=TeacherPreferences)
async def get_settings_endpoint(teacher: User = Depends(get_current_teacher)):
    return TeacherPreferences(**(teacher.preferences or {}))


@router.put("/", response_model=TeacherPreferences)
async def update_settings_endpoint(
    payload: TeacherPreferences, db: AsyncSession = Depends(get_db), teacher: User = Depends(get_current_teacher)
):
    teacher.preferences = payload.model_dump()
    await db.commit()
    return payload
