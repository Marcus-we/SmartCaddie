from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.v1.core.models import Users, Rounds, CourseTees

def calculate_score_differential(adjusted_score: int, course_rating: float, slope_rating: float, total_holes: int, total_par: int) -> float:
    """
    Calculate the score differential for a round using the USGA formula:
    (113 / Slope Rating) × (Adjusted Gross Score - Course Rating)
    
    For 9-hole rounds:
    1. Handle course rating data inconsistency:
       - Some 9-hole courses store 18-hole equivalent ratings (need to halve these)
       - Others store actual 9-hole ratings (need to double these)
    2. Double the adjusted score to make it equivalent to 18 holes
    3. Use the same slope rating (slope doesn't change)
    
    A positive differential means the player scored above their expected score
    A negative differential means the player scored below their expected score
    """
    if total_holes == 9:
        # Detect if the course rating is stored as 18-hole equivalent
        # If course rating is more than 1.5 times the total par, it's likely an 18-hole rating
        is_eighteen_hole_rating = course_rating > (total_par * 1.5)
        
        if is_eighteen_hole_rating:
            # Halve the course rating to get the 9-hole rating first
            course_rating = course_rating / 2
        
        # Now double both score and course rating for 18-hole equivalent
        adjusted_score = adjusted_score * 2
        course_rating = course_rating * 2
    
    # Calculate the differential using the USGA formula
    differential = ((113 / slope_rating) * (adjusted_score - course_rating))
    
    # Round to one decimal place
    return round(differential, 1)

def get_last_20_rounds(db: Session, user_id: int) -> List[Rounds]:
    """Get the user's last 20 completed rounds"""
    return db.query(Rounds).filter(
        Rounds.user_id == user_id,
        Rounds.is_completed == True,
        Rounds.score_differential != None
    ).order_by(desc(Rounds.end_time)).limit(20).all()

def calculate_handicap_index(score_differentials: List[float]) -> float:
    """
    Calculate handicap index based on the best 8 of last 20 rounds
    Returns the average of the best 8 differentials multiplied by 0.96
    A positive handicap means the player typically scores above par (e.g., 19.9)
    A negative handicap (displayed with "+") means the player typically scores below par (e.g., +1.2)
    """
    if len(score_differentials) < 3:
        return None  # Need at least 3 rounds for initial handicap
        
    # Convert any Decimal types to float
    score_differentials = [float(d) for d in score_differentials]
        
    # Sort differentials from lowest to highest
    sorted_differentials = sorted(score_differentials)
    
    # Determine how many scores to use based on available rounds
    num_rounds = len(sorted_differentials)
    if num_rounds <= 6:
        num_to_use = 1  # Use lowest differential
    elif num_rounds <= 8:
        num_to_use = 2  # Use lowest 2 differentials
    elif num_rounds <= 11:
        num_to_use = 3  # Use lowest 3 differentials
    elif num_rounds <= 14:
        num_to_use = 4  # Use lowest 4 differentials
    elif num_rounds <= 16:
        num_to_use = 5  # Use lowest 5 differentials
    elif num_rounds <= 18:
        num_to_use = 6  # Use lowest 6 differentials
    elif num_rounds == 19:
        num_to_use = 7  # Use lowest 7 differentials
    else:
        num_to_use = 8  # Use lowest 8 differentials
    
    # Calculate average of the best differentials
    best_differentials = sorted_differentials[:num_to_use]
    average = sum(best_differentials) / len(best_differentials)
    
    # Apply 96% multiplier and round to 1 decimal
    return round(average * 0.96, 1)

def update_round_handicap_data(db: Session, round_obj: Rounds) -> None:
    """
    Update a round's score differential and included_in_handicap status
    """
    if not round_obj.is_completed or not round_obj.tee:
        return
        
    # Get the appropriate rating and slope based on user's gender
    # For now, using men's ratings - you might want to add logic for women's ratings
    course_rating = round_obj.tee.mens_rating
    slope_rating = round_obj.tee.mens_slope
    total_par = round_obj.tee.total_par
    
    # Calculate score differential, passing total_holes and total_par to handle 9-hole rounds correctly
    round_obj.score_differential = calculate_score_differential(
        adjusted_score=round_obj.total_shots,
        course_rating=course_rating,
        slope_rating=slope_rating,
        total_holes=round_obj.total_holes,
        total_par=total_par
    )
    
    db.commit()

def update_user_handicap(db: Session, user_id: int) -> None:
    """
    Update a user's handicap index based on their recent rounds
    Implements USGA soft cap and hard cap rules:
    - Soft Cap: Increases beyond 3.0 strokes are reduced by 50%
    - Hard Cap: Maximum increase of 5.0 strokes in a 12-month period
    
    For users with initial handicap of 54 (new golfers):
    - Start calculating after 3 rounds
    - Use progressive system (1 best differential for 3-6 rounds, etc.)
    
    For users with initial handicap < 54 (experienced golfers):
    - Keep initial handicap until 12 rounds are recorded
    - Then use progressive system starting with 4 differentials
    - Progress up to 8 differentials at 20 rounds
    """
    # Get last 20 rounds
    recent_rounds = get_last_20_rounds(db, user_id)
    
    # Get all score differentials
    differentials = [round.score_differential for round in recent_rounds if round.score_differential is not None]
    
    # Get user and their current handicap
    user = db.query(Users).filter(Users.id == user_id).first()
    current_handicap = float(user.handicap_index) if user.handicap_index is not None else None
    
    # If no current handicap, can't proceed
    if current_handicap is None:
        return
        
    # Different logic based on whether user is a new golfer (handicap == 54) or experienced
    is_new_golfer = current_handicap == 54.0
    num_rounds = len(differentials)
    
    # For new golfers, need minimum 3 rounds
    if is_new_golfer and num_rounds < 3:
        return
        
    # For experienced golfers, wait until 12 rounds
    if not is_new_golfer and num_rounds < 12:
        return
        
    # Calculate number of differentials to use
    if is_new_golfer:
        # Progressive system for new golfers starting at 3 rounds
        if num_rounds <= 6:
            num_to_use = 1  # Use lowest differential
        elif num_rounds <= 8:
            num_to_use = 2  # Use lowest 2 differentials
        elif num_rounds <= 11:
            num_to_use = 3  # Use lowest 3 differentials
        elif num_rounds <= 14:
            num_to_use = 4  # Use lowest 4 differentials
        elif num_rounds <= 16:
            num_to_use = 5  # Use lowest 5 differentials
        elif num_rounds <= 18:
            num_to_use = 6  # Use lowest 6 differentials
        elif num_rounds == 19:
            num_to_use = 7  # Use lowest 7 differentials
        else:
            num_to_use = 8  # Use lowest 8 differentials
    else:
        # Progressive system for experienced golfers starting at 12 rounds
        if num_rounds <= 14:
            num_to_use = 4  # Start with 4 differentials
        elif num_rounds <= 16:
            num_to_use = 5  # Use lowest 5 differentials
        elif num_rounds <= 18:
            num_to_use = 6  # Use lowest 6 differentials
        elif num_rounds == 19:
            num_to_use = 7  # Use lowest 7 differentials
        else:
            num_to_use = 8  # Use lowest 8 differentials
    
    # Sort differentials and take best ones
    sorted_differentials = sorted(differentials)
    best_differentials = sorted_differentials[:num_to_use]
    
    # Calculate average and apply 96% multiplier
    average = sum(best_differentials) / len(best_differentials)
    new_handicap = round(average * 0.96, 1)
    
    # Apply caps only when handicap is increasing
    increase = new_handicap - current_handicap
    
    if increase > 3.0:
        # Apply soft cap - reduce any increase beyond 3.0 by 50%
        excess_increase = increase - 3.0
        reduced_excess = excess_increase * 0.5
        new_handicap = current_handicap + 3.0 + reduced_excess
    
    if increase > 5.0:
        # Apply hard cap - limit total increase to 5.0
        new_handicap = current_handicap + 5.0
    
    # Update user's handicap
    user.handicap_index = new_handicap
    user.last_handicap_update = datetime.now(timezone.utc)
    
    # Update which rounds are included in handicap
    sorted_differentials = sorted(differentials)[:num_to_use]  # Best differentials
    for round in recent_rounds:
        round.included_in_handicap = (
            round.score_differential is not None and 
            round.score_differential in sorted_differentials
        )
    
    db.commit() 