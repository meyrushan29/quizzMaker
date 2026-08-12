import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import Student
from ..schemas.student import StudentCreate, StudentRead, StudentUpdate
from ..core.deps import get_current_teacher

router = APIRouter()


@router.post("/", response_model=StudentRead)
async def create_student(student_in: StudentCreate, db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_teacher)):
    existing = await db.execute(select(Student).where(Student.student_id == student_in.student_id))
    if existing.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID already exists")
    student = Student(**student_in.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/", response_model=list[StudentRead])
async def list_students(q: str | None = Query(None), db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_teacher)):
    query = select(Student)
    if q:
        query = query.where(Student.name.ilike(f"%{q}%") | Student.student_id.ilike(f"%{q}%"))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{student_id}", response_model=StudentRead)
async def get_student(student_id: int, db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_teacher)):
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.put("/{student_id}", response_model=StudentRead)
async def update_student(student_id: int, student_in: StudentUpdate, db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_teacher)):
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    for field, value in student_in.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    await db.commit()
    await db.refresh(student)
    return student


@router.delete("/{student_id}")
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_teacher)):
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    await db.delete(student)
    await db.commit()
    return {"detail": "Student deleted"}


@router.post("/import")
async def import_students_csv(file: UploadFile, db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_teacher)):
    """Bulk-imports students from a CSV with headers:
    student_id, name, grade, class_name, subject
    """
    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))

    existing_result = await db.execute(select(Student.student_id))
    existing_ids = {row[0] for row in existing_result.all()}

    created, skipped = [], []
    for row in reader:
        student_id = (row.get("student_id") or "").strip()
        name = (row.get("name") or "").strip()
        if not student_id or not name:
            skipped.append({"row": row, "reason": "Missing student_id or name"})
            continue
        if student_id in existing_ids:
            skipped.append({"row": row, "reason": "Student ID already exists"})
            continue
        student = Student(
            student_id=student_id,
            name=name,
            grade=(row.get("grade") or "").strip() or None,
            class_name=(row.get("class_name") or "").strip() or None,
            subject=(row.get("subject") or "").strip() or None,
        )
        db.add(student)
        existing_ids.add(student_id)
        created.append(student_id)

    await db.commit()
    return {"created": len(created), "skipped": len(skipped), "created_ids": created, "skipped_rows": skipped}
