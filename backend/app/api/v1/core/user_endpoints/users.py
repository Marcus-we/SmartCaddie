# ./backend/app/api/v1/core/user_endpoints/users.py

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Annotated, List

from app.api.v1.core.user_endpoints.user_db import (
    create_user_db,
    get_user_db,
    delete_user_db,
    add_multiple_clubs_db,
    get_user_clubs_db,
    update_club_db,
    delete_club_db
)
from app.api.v1.core.models import Users, Clubs
from app.api.v1.core.schemas import (
    UserSearchSchema,
    UserUpdateSchema,
    UserOutSchema,
    UserRegisterSchema,
    PasswordChangeSchema,
    AdminUpdateSchema,
    ClubSchema,
    AddMultipleClubsSchema,
    UpdateClubSchema
)
# Importera e-postfunktionerna

from app.security import (
    hash_password,
    verify_password,
    get_current_user,
    get_current_admin
)
from app.db_setup import get_db

router = APIRouter()

@router.post("/user", status_code=201)
def create_user(
    user: UserRegisterSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    new_user = create_user_db(user=user, db=db)
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User couldn't be created"
        )
    
    return {
        "message": "Created user successfully"
    }

@router.get("/me", response_model=UserOutSchema)
def read_users_me(current_user: Users = Depends(get_current_user)):
    return current_user

@router.get("/user", status_code=200)
def search_user(db: Session = Depends(get_db)):
    result = get_user_db(db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No users found"
        )
    return result

@router.delete("/user", status_code=200)
def delete_user(db: Session = Depends(get_db), current_user: Users = Depends(get_current_user)):
    result = delete_user_db(user_id=current_user.id, db=db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or could not be deleted"
        )
    return {"message": "User has been deleted"}

@router.get("/profile", response_model=UserUpdateSchema)
def get_user_profile(current_user: Users = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserUpdateSchema)
def update_user_profile(
    user_update: UserUpdateSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = db.scalars(select(Users).where(Users.id == current_user.id)).first()
    for key, value in user_update.model_dump(exclude_unset=True).items():
        if value != "":
            setattr(db_user, key, value)
    db.commit()
    return db_user

@router.put("/admin/profile/{user_id}", response_model=UserOutSchema)
def update_admin_profile(
    user_update: AdminUpdateSchema,
    user_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not an admin",
            headers={"WWW-Authenticate": "Bearer"},
        )
    db_user = db.scalars(select(Users).where(Users.id == user_id)).first()
    for key, value in user_update.model_dump(exclude_unset=True).items():
        if value != "":
            setattr(db_user, key, value)
    db.commit()
    return db_user

@router.put("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    password_data: PasswordChangeSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not password_data.current_password or not password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both current and new passwords are required",
        )
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long",
        )
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if verify_password(password_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )
    try:
        db_user = db.scalars(select(Users).where(Users.id == current_user.id)).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        db_user.hashed_password = hash_password(password_data.new_password)
        db.commit()
        return {
            "message": "Password updated successfully",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}",
        )

@router.post("/clubs", status_code=status.HTTP_201_CREATED)
def add_multiple_clubs(
    clubs_data: AddMultipleClubsSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = add_multiple_clubs_db(user_id=current_user.id, clubs_data=clubs_data.clubs, db=db)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    return {
        "message": f"Successfully added {len(result)} clubs",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/clubs", response_model=List[ClubSchema], status_code=status.HTTP_200_OK)
def get_user_clubs(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clubs = get_user_clubs_db(user_id=current_user.id, db=db)
    
    if clubs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if not clubs:
        return []
        
    return clubs

@router.put("/clubs/{club_name}", response_model=ClubSchema, status_code=status.HTTP_200_OK)
def update_club(
    club_name: str,
    club_data: UpdateClubSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_club = update_club_db(club_name=club_name, user_id=current_user.id, club_data=club_data, db=db)
    
    if updated_club is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission to update it"
        )
        
    return updated_club

@router.delete("/clubs/{club_name}", status_code=status.HTTP_200_OK)
def delete_club(
    club_name: str,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = delete_club_db(club_name=club_name, user_id=current_user.id, db=db)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission to delete it"
        )
        
    return {
        "message": f"Successfully deleted club: {club_name}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


