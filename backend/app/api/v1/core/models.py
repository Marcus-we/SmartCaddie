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
    
    rounds: Mapped[list["Rounds"]] = relationship(
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


class Rounds(Base):
    __tablename__ = "rounds"
    
    # Basic round info
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    course_name: Mapped[str] = mapped_column(String(255))

    # NEW: Golf course integration
    course_id: Mapped[int] = mapped_column(ForeignKey("golf_courses.id"), nullable=True)
    tee_id: Mapped[int] = mapped_column(ForeignKey("course_tees.id"), nullable=True)
    
    # Round configuration
    total_holes: Mapped[int] = mapped_column(Integer)  # 9 or 18
    
    # Timing
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Scoring (calculated fields)
    total_shots: Mapped[int] = mapped_column(Integer, nullable=True)
    total_par: Mapped[int] = mapped_column(Integer, nullable=True)
    score_relative_to_par: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Status
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Additional data
    weather_conditions: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user: Mapped["Users"] = relationship(back_populates="rounds")
    course: Mapped["GolfCourses"] = relationship()
    tee: Mapped["CourseTees"] = relationship()
    hole_scores: Mapped[list["HoleScores"]] = relationship(
        back_populates="round", 
        cascade="all, delete-orphan",
        order_by="HoleScores.hole_number"
    )


class HoleScores(Base):
    __tablename__ = "hole_scores"
    
    round_id: Mapped[int] = mapped_column(ForeignKey("rounds.id", ondelete="CASCADE"))
    hole_number: Mapped[int] = mapped_column(Integer)
    
    # Scoring
    par: Mapped[int] = mapped_column(Integer)
    shots: Mapped[int] = mapped_column(Integer, default=0)
    score_relative_to_par: Mapped[int] = mapped_column(Integer)  # shots - par
    
    # Timing
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Optional details
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Relationships
    round: Mapped["Rounds"] = relationship(back_populates="hole_scores")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('round_id', 'hole_number', name='unique_round_hole'),
    )

class GolfCourses(Base):
    __tablename__ = "golf_courses"
    
    course_name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    total_holes: Mapped[int] = mapped_column(Integer)  # 9 or 18
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tees: Mapped[list["CourseTees"]] = relationship(back_populates="course", cascade="all, delete-orphan")

class CourseTees(Base):
    __tablename__ = "course_tees"
    
    course_id: Mapped[int] = mapped_column(ForeignKey("golf_courses.id", ondelete="CASCADE"))
    tee_name: Mapped[str] = mapped_column(String(50))  # Yellow, Red, White, etc.
    
    # Ratings
    mens_rating: Mapped[float] = mapped_column(Numeric, nullable=True)
    mens_slope: Mapped[float] = mapped_column(Numeric, nullable=True)
    womens_rating: Mapped[float] = mapped_column(Numeric, nullable=True)
    womens_slope: Mapped[float] = mapped_column(Numeric, nullable=True)
    
    total_distance: Mapped[int] = mapped_column(Integer, nullable=True)
    total_par: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Relationships
    course: Mapped["GolfCourses"] = relationship(back_populates="tees")
    holes: Mapped[list["CourseHoles"]] = relationship(back_populates="tee", cascade="all, delete-orphan")

class CourseHoles(Base):
    __tablename__ = "course_holes"
    
    tee_id: Mapped[int] = mapped_column(ForeignKey("course_tees.id", ondelete="CASCADE"))
    hole_number: Mapped[int] = mapped_column(Integer)
    
    distance_yards: Mapped[int] = mapped_column(Integer, nullable=True)
    par: Mapped[int] = mapped_column(Integer, nullable=True)
    handicap: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Relationships
    tee: Mapped["CourseTees"] = relationship(back_populates="holes")

    