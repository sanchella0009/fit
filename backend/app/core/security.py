import hashlib
import os
import jwt
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = os.environ.get("JWT_SECRET", "apple_recomp_secret_jwt_key_2026_fitness")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 # 30 days

def hash_password(password: str) -> str:
    """Хеширует пароль с солью через PBKDF2-HMAC-SHA256"""
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return f"{salt}${hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Сверяет пароль с сохраненным хешем"""
    try:
        if not hashed_password or "$" not in hashed_password:
            # Fallback for plain mock text in dev
            return plain_password == hashed_password
        salt, expected_hash = hashed_password.split("$", 1)
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        ).hex()
        return secrets_compare(expected_hash, actual_hash)
    except Exception:
        return False

def secrets_compare(val1: str, val2: str) -> bool:
    import hmac
    return hmac.compare_digest(val1, val2)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None
