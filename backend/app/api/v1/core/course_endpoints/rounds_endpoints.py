from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db_setup import get_db
from app.security import get_current_user
from app.api.v1.core.models import Users, Rounds, HoleScores, GolfCourses, CourseTees
from app.api.v1.core.schemas import (
    StartRoundSchema, 
    UpdateHoleScoreSchema, 
    CompleteRoundSchema,
    RoundOutSchema, 
    RoundSummarySchema,
    HoleScoreOutSchema
)
from .handicap import update_round_handicap_data, update_user_handicap

router = APIRouter(prefix="/rounds", tags=["rounds"])


@router.post("/start", response_model=RoundOutSchema)
async def start_round(
    round_data: StartRoundSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new round"""
    
    # Check if user has an active round
    active_round = db.query(Rounds).filter(
        Rounds.user_id == current_user.id,
        Rounds.is_completed == False
    ).first()
    
    if active_round:
        raise HTTPException(
            status_code=400, 
            detail="You already have an active round. Please complete it first."
        )
    
    # Get course and tee data
    course = db.query(GolfCourses).filter(GolfCourses.id == round_data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    tee = db.query(CourseTees).filter(
        CourseTees.id == round_data.tee_id,
        CourseTees.course_id == round_data.course_id
    ).first()
    if not tee:
        raise HTTPException(status_code=404, detail="Tee not found")
    
    # Create round
    new_round = Rounds(
        user_id=current_user.id,
        course_name=course.course_name,
        course_id=course.id,
        tee_id=tee.id,
        total_holes=course.total_holes,
        start_time=datetime.now(timezone.utc),
        total_par=tee.total_par,
        total_shots=0,
        score_relative_to_par=0
    )
    
    db.add(new_round)
    db.flush()  # Get the round ID
    
    # Create hole scores from tee data
    hole_scores = []
    for hole in tee.holes:
        hole_score = HoleScores(
            round_id=new_round.id,
            hole_number=hole.hole_number,
            par=hole.par,
            shots=0,
            score_relative_to_par=-hole.par  # 0 shots - par
        )
        db.add(hole_score)
        hole_scores.append(hole_score)
    
    db.commit()
    db.refresh(new_round)
    
    return new_round


@router.get("/active", response_model=RoundOutSchema | None)
async def get_active_round(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current active round for the user"""
    
    active_round = db.query(Rounds).filter(
        Rounds.user_id == current_user.id,
        Rounds.is_completed == False
    ).first()
    
    return active_round


@router.put("/{round_id}/hole/{hole_number}", response_model=HoleScoreOutSchema)
async def update_hole_score(
    round_id: int,
    hole_number: int,
    score_data: UpdateHoleScoreSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the score for a specific hole"""
    
    # Get the round and verify ownership
    round_obj = db.query(Rounds).filter(
        Rounds.id == round_id,
        Rounds.user_id == current_user.id
    ).first()
    
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    if round_obj.is_completed:
        raise HTTPException(status_code=400, detail="Cannot update completed round")
    
    # Get the hole score
    hole_score = db.query(HoleScores).filter(
        HoleScores.round_id == round_id,
        HoleScores.hole_number == hole_number
    ).first()
    
    if not hole_score:
        raise HTTPException(status_code=404, detail="Hole not found")
    
    # Update hole score
    hole_score.shots = score_data.shots
    hole_score.par = score_data.par
    hole_score.score_relative_to_par = score_data.shots - score_data.par
    hole_score.notes = score_data.notes
    hole_score.completed_at = datetime.now(timezone.utc)
    
    # Recalculate round totals
    all_hole_scores = db.query(HoleScores).filter(
        HoleScores.round_id == round_id
    ).all()
    
    round_obj.total_shots = sum(hs.shots for hs in all_hole_scores)
    round_obj.total_par = sum(hs.par for hs in all_hole_scores)
    round_obj.score_relative_to_par = round_obj.total_shots - round_obj.total_par
    
    db.commit()
    db.refresh(hole_score)
    
    return hole_score


@router.post("/{round_id}/complete", response_model=RoundOutSchema)
async def complete_round(
    round_id: int,
    completion_data: CompleteRoundSchema,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a round"""
    
    # Get the round and verify ownership
    round_obj = db.query(Rounds).filter(
        Rounds.id == round_id,
        Rounds.user_id == current_user.id
    ).first()
    
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    if round_obj.is_completed:
        raise HTTPException(status_code=400, detail="Round is already completed")
    
    # Mark round as completed
    round_obj.is_completed = True
    round_obj.end_time = datetime.now(timezone.utc)
    round_obj.notes = completion_data.notes
    
    # Calculate score differential and update handicap
    update_round_handicap_data(db, round_obj)
    update_user_handicap(db, current_user.id)
    
    db.refresh(round_obj)
    
    return round_obj


@router.get("/history", response_model=List[RoundSummarySchema])
async def get_round_history(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's round history"""
    
    rounds = db.query(Rounds).filter(
        Rounds.user_id == current_user.id,
        Rounds.is_completed == True
    ).order_by(desc(Rounds.start_time)).offset(offset).limit(limit).all()
    
    return rounds


@router.get("/{round_id}", response_model=RoundOutSchema)
async def get_round_details(
    round_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific round"""
    
    round_obj = db.query(Rounds).filter(
        Rounds.id == round_id,
        Rounds.user_id == current_user.id
    ).first()
    
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    return round_obj


@router.delete("/{round_id}")
async def delete_round(
    round_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a round and all associated hole scores"""
    
    round_obj = db.query(Rounds).filter(
        Rounds.id == round_id,
        Rounds.user_id == current_user.id
    ).first()
    
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Delete all associated hole scores first (due to foreign key constraints)
    db.query(HoleScores).filter(HoleScores.round_id == round_id).delete()
    
    # Delete the round
    db.delete(round_obj)
    db.commit()
    
    return {"message": "Round deleted successfully"} 