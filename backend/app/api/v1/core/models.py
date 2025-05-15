from datetime import datetime, timezone
from enum import Enum
from typing import List

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    Numeric
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

class Token(Base):
    __tablename__ = "tokens"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now() 
    )
    token: Mapped[str] = mapped_column(unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user: Mapped["Users"] = relationship(back_populates="tokens")


class Users(Base):
    __tablename__ = "users"
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    hashed_password: Mapped[str] = mapped_column(String(150))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now() 
    )
    
    tokens: Mapped[list["Token"]] = relationship(
        back_populates="user")
    
    clubs: Mapped[list["Clubs"]] = relationship(
        back_populates="user"
    )


    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.full_name})>"
    
class Clubs(Base):
    __tablename__ = "clubs"
    club: Mapped[str] = mapped_column(String(255))
    distance_meter: Mapped[float] = mapped_column(Numeric)
    preferred_club: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"))
    
    user: Mapped["Users"] = relationship(
        back_populates="clubs"
    )
    

    

    