from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt
import os

SECRET_KEY = os.environ.get('JWT_SECRET', 'taxibotbahia-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash de password con bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verificar password"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def create_access_token(data: dict) -> str:
        """Crear JWT token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decodificar JWT token"""
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except:
            return None
