from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
import uuid

from app.models.db_schema import User, UserRole, DietaryMode
from app.seeds.seed_runner import SessionLocal
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    dietary_mode: Optional[DietaryMode] = DietaryMode.FREE
    gender: Optional[str] = "MALE"
    target_calories: Optional[float] = 2200.0
    target_protein_g: Optional[float] = 150.0
    target_fat_g: Optional[float] = 70.0
    target_carbs_g: Optional[float] = 240.0

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    return db.query(User).filter(User.username == payload["sub"]).first()

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация (Bearer JWT)"
        )
    return user

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Авторизация по логину и паролю. Возвращает JWT токен и профиль"""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )

    token = create_access_token(data={"sub": user.username, "role": user.role.value, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
            "dietary_mode": user.dietary_mode.value,
            "webhook_token": user.webhook_token,
            "target_calories": user.target_calories,
            "target_protein_g": user.target_protein_g,
            "target_fat_g": user.target_fat_g,
            "target_carbs_g": user.target_carbs_g,
            "is_admin": user.role == UserRole.ADMIN,
            "has_dorm_menu_access": user.username.lower() == "gorokhova" or user.role == UserRole.ADMIN
        }
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует"
        )
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    # Специальное правило для GorokhovA
    is_gorokhov = payload.username.lower() == "gorokhova"
    role = UserRole.ADMIN if is_gorokhov else UserRole.USER
    diet_mode = DietaryMode.DORMITORY if is_gorokhov else payload.dietary_mode

    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
        dietary_mode=diet_mode,
        webhook_token=str(uuid.uuid4()).replace("-", "")[:32],
        gender=payload.gender or "MALE",
        target_calories=payload.target_calories or 2200.0,
        target_protein_g=payload.target_protein_g or 150.0,
        target_fat_g=payload.target_fat_g or 70.0,
        target_carbs_g=payload.target_carbs_g or 240.0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.username, "role": new_user.role.value, "id": new_user.id})
    return {
        "status": "created",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role.value,
            "dietary_mode": new_user.dietary_mode.value,
            "webhook_token": new_user.webhook_token,
            "target_calories": new_user.target_calories,
            "target_protein_g": new_user.target_protein_g,
            "target_fat_g": new_user.target_fat_g,
            "target_carbs_g": new_user.target_carbs_g,
            "is_admin": new_user.role == UserRole.ADMIN,
            "has_dorm_menu_access": is_gorokhov or new_user.role == UserRole.ADMIN
        }
    }

@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Возвращает информацию о текущем авторизованном пользователе"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.value,
        "dietary_mode": current_user.dietary_mode.value,
        "webhook_token": current_user.webhook_token,
        "target_calories": current_user.target_calories,
        "target_protein_g": current_user.target_protein_g,
        "target_fat_g": current_user.target_fat_g,
        "target_carbs_g": current_user.target_carbs_g,
        "is_admin": current_user.role == UserRole.ADMIN,
        "has_dorm_menu_access": current_user.username.lower() == "gorokhova" or current_user.role == UserRole.ADMIN
    }
