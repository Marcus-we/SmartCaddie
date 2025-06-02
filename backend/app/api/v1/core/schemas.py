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


# Round tracking schemas
class HoleConfigSchema(BaseModel):
    hole_number: int = Field(..., ge=1, le=18)
    par: int = Field(..., ge=3, le=5)

class StartRoundSchema(BaseModel):
    course_name: str = Field(..., min_length=1, max_length=255)
    total_holes: int = Field(..., ge=9, le=18)
    holes_config: List[HoleConfigSchema]
    
    model_config = ConfigDict(from_attributes=True)

class UpdateHoleScoreSchema(BaseModel):
    shots: int = Field(..., ge=0)
    par: int = Field(..., ge=3, le=5)
    notes: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class CompleteRoundSchema(BaseModel):
    notes: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class HoleScoreOutSchema(BaseModel):
    id: int
    hole_number: int
    par: int
    shots: int
    score_relative_to_par: int
    completed_at: datetime | None
    notes: str | None
    
    model_config = ConfigDict(from_attributes=True)

class RoundOutSchema(BaseModel):
    id: int
    course_name: str
    total_holes: int
    start_time: datetime
    end_time: datetime | None
    total_shots: int | None
    total_par: int | None
    score_relative_to_par: int | None
    is_completed: bool
    notes: str | None
    hole_scores: List[HoleScoreOutSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

class RoundSummarySchema(BaseModel):
    id: int
    course_name: str
    total_holes: int
    start_time: datetime
    end_time: datetime | None
    total_shots: int | None
    total_par: int | None
    score_relative_to_par: int | None
    is_completed: bool
    
    model_config = ConfigDict(from_attributes=True)

class AgentQueryRequest(BaseModel):
    wind_speed: float
    wind_direction: str
    distance_to_flag: float
    
    # Surface type conditions (default to fairway if none specified)
    fairway: bool = False
    light_rough: bool = False
    heavy_rough: bool = False
    hardpan: bool = False
    divot: bool = False
    bunker: bool = False
    
    # Slope conditions (can combine with surface)
    uphill: bool = False
    downhill: bool = False
    ball_above_feet: bool = False
    ball_below_feet: bool = False

    # Ground conditions
    wet_ground: bool = False
    firm_ground: bool = False

class ShotFeedbackRequest(BaseModel):
    """Request model for submitting feedback on a shot recommendation"""
    timestamp: str = Field(..., description="Timestamp of the shot to provide feedback for")
    liked: bool = Field(..., description="Whether the user liked the recommendation")
    club_used: str = Field(None, description="The club the user actually used for the shot")
    shot_result: str = Field(None, description="Brief description of the shot result (e.g., 'on green', 'short', 'long')")

# Course related schemas
class CourseHoleSchema(BaseModel):
    hole_number: int
    distance_yards: int | None = None
    distance_meters: float | None = None
    par: int | None = None
    handicap: int | None = None
    
    model_config = ConfigDict(from_attributes=True)

class CourseTeeSchema(BaseModel):
    id: int
    tee_name: str
    mens_rating: float | None = None
    mens_slope: float | None = None
    womens_rating: float | None = None
    womens_slope: float | None = None
    total_distance_yards: int | None = None
    total_distance_meters: float | None = None
    total_par: int | None = None
    holes: List[CourseHoleSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

class CourseDetailsSchema(BaseModel):
    id: int
    course_name: str
    location: str | None = None
    total_holes: int
    tees: List[CourseTeeSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

class CourseFilters(BaseModel):
    tee_types: List[str] | None = None
    min_total_distance: int | None = None
    max_total_distance: int | None = None
    min_total_par: int | None = None
    max_total_par: int | None = None
