import base64
from datetime import UTC, datetime, timedelta, timezone
from random import SystemRandom
from typing import Annotated
from uuid import UUID, uuid4

from app.api.v1.core.models import Token, Users
from app.db_setup import get_db
from app.settings import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/token")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_ENTROPY = 32  # number of bytes to return by default
_sysrand = SystemRandom()


def hash_password(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def token_bytes(nbytes=None):
    """Return a random byte string containing *nbytes* bytes.

    If *nbytes* is ``None`` or not supplied, a reasonable
    default is used.

    >>> token_bytes(16)  #doctest:+SKIP
    b'\\xebr\\x17D*t\\xae\\xd4\\xe3S\\xb6\\xe2\\xebP1\\x8b'

    """
    if nbytes is None:
        nbytes = DEFAULT_ENTROPY
    return _sysrand.randbytes(nbytes)


def token_urlsafe(nbytes=None):
    """Return a random URL-safe text string, in Base64 encoding.

    The string has *nbytes* random bytes.  If *nbytes* is ``None``
    or not supplied, a reasonable default is used.

    >>> token_urlsafe(16)  #doctest:+SKIP
    'Drmhze6EPcv0fN_81Bj-nA'

    """
    tok = token_bytes(nbytes)
    return base64.urlsafe_b64encode(tok).rstrip(b"=").decode("ascii")


def create_database_token(user_id: UUID, db: Session):
    randomized_token = token_urlsafe()
    new_token = Token(token=randomized_token, user_id=user_id)
    db.add(new_token)
    db.commit()
    return new_token


### Getting users


def verify_token_access(token_str: str, db: Session) -> Token:
    """
    Return a token
    """
    max_age = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    token = (
        db.execute(
            select(Token).where(
                Token.token == token_str, Token.created_at >= datetime.now(UTC) - max_age
            ),
        )
        .scalars()
        .first()
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> Users:
    token_obj = verify_token_access(token_str=token, db=db)
    user = token_obj.user

    db.commit()
    db.refresh(user)
    return user



def get_current_admin(
    current_user: Annotated[Users, Depends(get_current_user)],
) -> Users:
    """
    Dependency that verifies the current user is a superuser.
    Returns the user object if the user is a superuser,
    otherwise raises an HTTP 403 Forbidden exception.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. admin privileges required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def get_current_token(
    token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)
):
    """
    oauth2_scheme automatically extracts the token from the authentication header
    Used when we simply want to return the token, instead of returning a user. E.g for logout
    """
    token = verify_token_access(token_str=token, db=db)
    return token
