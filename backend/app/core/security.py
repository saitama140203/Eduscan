from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union, List
import uuid
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Thiết lập context cho bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Hàm xác minh mật khẩu
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Hàm tạo hash mật khẩu
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Tạo access token
def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    roles: List[str] = [],
    user_id: Optional[int] = None,
    org_id: Optional[int] = None
) -> str:
    """
    Tạo JWT access token, exp/iat là int UTC timestamp.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=24)  # Default 24h

    to_encode = {
        "sub": str(subject),
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "roles": roles,
        "jti": str(uuid.uuid4()),
        "type": "access"
    }
    if user_id:
        to_encode["user_id"] = user_id
    if org_id:
        to_encode["org_id"] = org_id

    # print(f"[CREATE_ACCESS_TOKEN] Now (UTC): {now.isoformat()} | Expires at: {expire.isoformat()}")
    # print(f"[CREATE_ACCESS_TOKEN] Payload: {to_encode}")
    # print(f"[CREATE_ACCESS_TOKEN]      Token will expire at: {expire.strftime('%Y-%m-%d %H:%M:%S')}")

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# Tạo refresh token
def create_refresh_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=7)

    to_encode = {
        "sub": str(subject),
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "type": "refresh",
        "jti": str(uuid.uuid4())
    }

    logger.debug(
        "[CREATE_REFRESH_TOKEN] Now (UTC): %s | Expires at: %s",
        now.isoformat(),
        expire.isoformat(),
    )
    logger.debug("[CREATE_REFRESH_TOKEN] Payload: %s", to_encode)

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# Tạo token đặt lại mật khẩu
def create_password_reset_token(
    email: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=24)

    to_encode = {
        "sub": email,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "type": "password_reset",
        "jti": str(uuid.uuid4())
    }

    logger.debug(
        "[CREATE_PASSWORD_RESET_TOKEN] Now (UTC): %s | Expires at: %s",
        now.isoformat(),
        expire.isoformat(),
    )
    logger.debug("[CREATE_PASSWORD_RESET_TOKEN] Payload: %s", to_encode)

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# Hàm xác minh token
def verify_token(token: str, token_type: Optional[str] = None) -> Dict[str, Any]:
    logger.debug("[VERIFY_TOKEN] Attempting to decode token: %s...", token[:20])
    logger.debug(
        "[VERIFY_TOKEN] Using SECRET_KEY: %s, ALGORITHM: %s",
        settings.SECRET_KEY,
        settings.ALGORITHM,
    )
    try:
        if settings.DEBUG:
            logger.debug(
                "[VERIFY_TOKEN] DEBUG mode active, skipping token expiration check"
            )
            verify_options = {
                "verify_signature": True,
                "verify_aud": False,
                "verify_exp": False
            }
        else:
            verify_options = {
                "verify_aud": False
            }

        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options=verify_options
        )
        logger.debug("[VERIFY_TOKEN] Decoded payload: %s", payload)

        if token_type and payload.get("type") != token_type:
            logger.error(
                "[VERIFY_TOKEN] Error: Invalid token type. Expected %s, got %s",
                token_type,
                payload.get("type"),
            )
            raise JWTError(f"Token không phải loại {token_type}")

        if "exp" not in payload:
            logger.error("[VERIFY_TOKEN] Error: 'exp' field missing in token payload.")
            raise JWTError("Token thiếu trường hết hạn (exp)")
            
        return payload
    except ExpiredSignatureError as e:
        logger.error("[VERIFY_TOKEN] Error: Token has expired. %s", str(e))
        raise Exception(f"Token đã hết hạn: {str(e)}")
    except JWTError as e:
        logger.error("[VERIFY_TOKEN] Error: Invalid token. %s", str(e))
        raise Exception(f"Token không hợp lệ: {str(e)}")
    except Exception as e:
        logger.error(
            "[VERIFY_TOKEN] Error: Unexpected error during token verification. %s",
            str(e),
        )
        raise Exception(f"Lỗi không xác định khi xác minh token: {str(e)}")
