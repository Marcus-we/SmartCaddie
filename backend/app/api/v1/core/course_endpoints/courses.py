from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.v1.core.models import GolfCourses, CourseTees, CourseHoles
from app.api.v1.core.schemas import CourseDetailsSchema
from app.db_setup import get_db

YARDS_TO_METERS = 0.9144  # 1 yard = 0.9144 meters

def convert_to_meters(yards: int | None) -> float | None:
    """Convert yards to meters."""
    if yards is None:
        return None
    return round(float(yards) * YARDS_TO_METERS)

def prepare_course_data(course: GolfCourses, filtered_tees: List[CourseTees], use_meters: bool) -> dict:
    """Prepare course data for response, handling distance conversions."""
    course_dict = {
        "id": course.id,
        "course_name": course.course_name,
        "location": course.location,
        "total_holes": course.total_holes,
        "tees": []
    }
    
    for tee in filtered_tees:
        tee_dict = {
            "id": tee.id,
            "tee_name": tee.tee_name,
            "mens_rating": tee.mens_rating,
            "mens_slope": tee.mens_slope,
            "womens_rating": tee.womens_rating,
            "womens_slope": tee.womens_slope,
            "total_distance_yards": tee.total_distance,
            "total_distance_meters": convert_to_meters(tee.total_distance) if use_meters else None,
            "total_par": tee.total_par,
            "holes": []
        }
        
        for hole in tee.holes:
            hole_dict = {
                "hole_number": hole.hole_number,
                "distance_yards": hole.distance_yards,
                "distance_meters": convert_to_meters(hole.distance_yards) if use_meters else None,
                "par": hole.par,
                "handicap": hole.handicap
            }
            tee_dict["holes"].append(hole_dict)
        
        course_dict["tees"].append(tee_dict)
    
    return course_dict

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("", response_model=List[CourseDetailsSchema])
async def list_courses(
    search: str,
    tee_type: Optional[str] = None,
    use_meters: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all golf courses with optional search and tee type filtering.
    
    Parameters:
    - search: Search term for course name
    - tee_type: Optional specific tee type to filter by
    - use_meters: If True, converts all distances from yards to meters
    """
    # Build base query with all necessary joins
    query = (
        select(GolfCourses)
        .options(
            joinedload(GolfCourses.tees)
            .joinedload(CourseTees.holes)
        )
    )
    
    # Apply search filter if provided
    if search:
        query = query.where(GolfCourses.course_name.ilike(f"%{search}%"))
    
    # Execute query
    result = db.execute(query)
    courses = result.unique().scalars().all()
    
    # Filter and prepare courses
    filtered_courses = []
    for course in courses:
        filtered_tees = course.tees
        
        if tee_type:
            filtered_tees = [tee for tee in filtered_tees if tee.tee_name == tee_type]
            
        # Only include course if it has matching tees after filtering
        if filtered_tees or not tee_type:
            course_data = prepare_course_data(course, filtered_tees, use_meters)
            filtered_courses.append(CourseDetailsSchema(**course_data))
    
    return filtered_courses 