from datetime import datetime
from enum import Enum
from typing import List
from fastapi import Query

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSearchSchema(BaseModel):
    username: str

class UserUpdateSchema(BaseModel):
    first_name: str | None = None
    last_name: str | None = None

class AdminUpdateSchema(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    is_admin: bool | None = None

class UserRegisterSchema(BaseModel):
    email: str
    first_name: str
    last_name: str
    password: str
    is_admin: bool = False
    model_config = ConfigDict(from_attributes=True)
    

class TokenSchema(BaseModel):
    access_token: str
    token_type: str    

class UserOutSchema(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)

class PasswordChangeSchema(BaseModel):
    current_password: str
    new_password: str

class ClubSchema(BaseModel):
    club: str
    distance_meter: float
    preferred_club: bool = False
    model_config = ConfigDict(from_attributes=True)

class UpdateClubSchema(BaseModel):
    club: str | None = None
    distance_meter: float | None = None
    preferred_club: bool | None = None
    model_config = ConfigDict(from_attributes=True)

class AddMultipleClubsSchema(BaseModel):
    clubs: List[ClubSchema]
    model_config = ConfigDict(from_attributes=True)
