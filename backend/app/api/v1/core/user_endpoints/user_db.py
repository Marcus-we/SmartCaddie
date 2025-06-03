from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from sqlalchemy import delete, insert, select, update, and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import Optional, List
from random import randint
import bcrypt
from app.security import hash_password
from datetime import datetime, timezone

from app.api.v1.core.models import (
    Users,
    Clubs
)

from app.api.v1.core.schemas import (
    UserSearchSchema,
    UserRegisterSchema,
    UserUpdateSchema,
    ClubSchema,
    AddMultipleClubsSchema
)

def create_user_db(user: UserRegisterSchema, db):
    normalized_user_data = user.model_dump(exclude="hashed_password")
    normalized_user_data['email'] = normalized_user_data['email'].lower().strip()
    
    # Set handicap from initial_handicap (which defaults to 54.0)
    initial_handicap = normalized_user_data.pop('initial_handicap')
    normalized_user_data['handicap_index'] = initial_handicap
    normalized_user_data['last_handicap_update'] = datetime.now(timezone.utc)
    
    user = Users(**normalized_user_data, hashed_password=hash_password(user.password))

    db.add(user)
    db.commit()
    return user


def get_user_db(db):
    users = db.scalars(select(Users)).all()
    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No users found"
        )

    return users


def delete_user_db(user_id: int, db):
    # Kontrollera om användaren finns
    user = db.scalar(select(Users).where(Users.id == user_id))
    if not user:
        return False

    # Utför delete-operationen
    db.execute(delete(Users).where(Users.id == user_id))
    db.commit()
    return True


def add_multiple_clubs_db(user_id: int, clubs_data: List[ClubSchema], db: Session):
    # Check if user exists
    user = db.scalar(select(Users).where(Users.id == user_id))
    if not user:
        return False
    
    # Create club instances
    new_clubs = []
    for club_data in clubs_data:
        new_club = Clubs(
            club=club_data.club,
            distance_meter=club_data.distance_meter,
            preferred_club=club_data.preferred_club,
            user_id=user_id
        )
        new_clubs.append(new_club)
    
    # Add all clubs to database
    db.add_all(new_clubs)
    db.commit()
    
    return new_clubs


def get_user_clubs_db(user_id: int, db: Session):
    # Check if user exists
    user = db.scalar(select(Users).where(Users.id == user_id))
    if not user:
        return None
    
    # Get all clubs for the user, sorted by distance (longest first)
    clubs = db.scalars(
        select(Clubs)
        .where(Clubs.user_id == user_id)
        .order_by(Clubs.distance_meter.desc())
    ).all()
    
    return clubs


def update_club_db(club_name: str, user_id: int, club_data: ClubSchema, db: Session):
    # Check if club exists and belongs to the user
    club = db.scalar(
        select(Clubs).where(
            and_(
                Clubs.club == club_name,
                Clubs.user_id == user_id
            )
        )
    )
    
    if not club:
        return None
    
    # Update club data
    for key, value in club_data.model_dump().items():
        setattr(club, key, value)
    
    db.commit()
    db.refresh(club)
    
    return club


def delete_club_db(club_name: str, user_id: int, db: Session):
    # Check if club exists and belongs to the user
    club = db.scalar(
        select(Clubs).where(
            and_(
                Clubs.club == club_name,
                Clubs.user_id == user_id
            )
        )
    )
    
    if not club:
        return None
    
    # Delete the club
    db.delete(club)
    db.commit()
    
    return True

