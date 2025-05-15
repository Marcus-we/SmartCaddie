from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status, Query, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import delete, insert, select, update, and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import Optional, Annotated, Dict, Any
from random import randint
import json
import re
import os
from app.settings import settings
from pydantic import BaseModel

from app.security import get_current_user
from app.api.v1.core.react_agent.react_graph import app as agent_app

from app.api.v1.core.models import (
    Users,
)


from app.db_setup import get_db

router = APIRouter()

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

@router.post("/agent/query", status_code=status.HTTP_200_OK)
def query_agent(
    request: AgentQueryRequest,
    current_user: Users = Depends(get_current_user)
):
    try:
        # Format the query for better AI understanding
        formatted_query = (
            f"As a golf caddie for {current_user.full_name} ({current_user.email}), I need your recommendation.\n\n"
            f"Current situation:\n"
            f"- Distance to flag: {request.distance_to_flag} meters\n"
            f"- Wind speed: {request.wind_speed} m/s\n"
            f"- Wind direction: {request.wind_direction}\n"
        )
        
        # Add ground conditions description
        ground_conditions = []
        if request.wet_ground:
            ground_conditions.append("wet ground")
        if request.firm_ground:
            ground_conditions.append("firm ground")
            
        # Add ground conditions if any exist
        if ground_conditions:
            formatted_query += f"- Ground Conditions: {', '.join(ground_conditions)}\n"
        else:
            formatted_query += f"- Ground Conditions: normal\n"
        
        # Store ground conditions text for later use
        ground_conditions_text = ", ".join(ground_conditions) if ground_conditions else "normal"
        
        # Add lie conditions description
        formatted_query += f"- Lie conditions: "
        
        lie_conditions = []
        if request.fairway:
            lie_conditions.append("fairway")
        if request.light_rough:
            lie_conditions.append("light rough")
        if request.heavy_rough:
            lie_conditions.append("heavy rough")
        if request.hardpan:
            lie_conditions.append("hardpan")
        if request.divot:
            lie_conditions.append("divot")
        if request.bunker:
            lie_conditions.append("bunker")
        if request.uphill:
            lie_conditions.append("uphill lie")
        if request.downhill:
            lie_conditions.append("downhill lie")
        if request.ball_above_feet:
            lie_conditions.append("ball above feet")
        if request.ball_below_feet:
            lie_conditions.append("ball below feet")
        
        # Default to fairway if nothing selected
        if not lie_conditions:
            lie_conditions = ["fairway"]
        
        formatted_query += ", ".join(lie_conditions) + "\n\n"
        
        # Build the lie effect tool input parameters
        lie_params = {
            "fairway": request.fairway,
            "light_rough": request.light_rough,
            "heavy_rough": request.heavy_rough,
            "hardpan": request.hardpan,
            "divot": request.divot,
            "bunker": request.bunker,
            "uphill": request.uphill,
            "downhill": request.downhill,
            "ball_above_feet": request.ball_above_feet,
            "ball_below_feet": request.ball_below_feet
        }
        
        # Only include true values in the example
        lie_example_params = {k: v for k, v in lie_params.items() if v}
        lie_example_params["base_distance"] = 150
        
        # Add instructions as a regular string (not f-string)
        formatted_query += "### Instructions (follow these strictly):\n"
        formatted_query += "1. Address the user directly as if youre talking to them.\n"
        formatted_query += "2. Gather info about the users clubs.\n"
        formatted_query += "3. Analyze how the wind affects the shot.\n"
        formatted_query += f"4. Calculate the effective distance after considering the wind and ground conditions: {ground_conditions_text}.\n"

        formatted_query += "5. IMPORTANT: Follow this format for your answer\n"
        formatted_query += "5. First explain what the conditions will do to the ball\n"
        formatted_query += "5. Recommend **exactly two** different club options.\n"
        formatted_query += "6. For each option, provide in simple, clear language:\n"
        formatted_query += "   - Club name and normal distance (example: '8 iron - normally 130 meters')\n"
        formatted_query += "   - One short sentence about why this club works for this situation\n"
        
        formatted_query += "7. Keep your explanation brief and direct - avoid complex calculations in your answer.\n"
        formatted_query += "8. Begin your response with the phrase:\n"
        formatted_query += "   **Final Answer: [your complete recommendation here]**\n\n"

        formatted_query += "### Note:\n"
        formatted_query += "- DO NOT use any Markdown or special formatting (e.g., no asterisks, no bullet points, no bold or italics).\n"
        formatted_query += "- Write in plain text only.\n"
        formatted_query += "- When providing the Action Input, format the input as a dictionary: `{'input': {}}`.\n"
        formatted_query += "- If none of the users club distances are viable, you can recommend laying up instead of going for the green"

        
        try:
            # Call the agent graph with the formatted query
            result = agent_app.invoke(
                {
                    "input": formatted_query, 
                    "agent_outcome": None, 
                    "intermediate_steps": []
                }
            )
            
            # Extract the final answer from the agent result
            if result and "agent_outcome" in result and hasattr(result["agent_outcome"], "return_values"):
                answer = result["agent_outcome"].return_values.get("output", "No answer found")
            else:
                answer = "Could not process query"
        except Exception as agent_error:
            # If there's an error in parsing, try to extract the formatted response from the error message
            error_str = str(agent_error)
            # Extract the content between backticks if present
            if "`" in error_str:
                parts = error_str.split("`")
                if len(parts) >= 2:
                    answer = parts[1]  # Extract content between first pair of backticks
                else:
                    answer = "Error processing query, please try again"
            else:
                answer = "Error processing query, please try again"
            
        return {
            "wind_speed": request.wind_speed,
            "wind_direction": request.wind_direction,
            "distance_to_flag": request.distance_to_flag,
            "lie_conditions": {
                "fairway": request.fairway,
                "light_rough": request.light_rough,
                "heavy_rough": request.heavy_rough,
                "hardpan": request.hardpan,
                "divot": request.divot,
                "bunker": request.bunker,
                "uphill": request.uphill,
                "downhill": request.downhill,
                "ball_above_feet": request.ball_above_feet,
                "ball_below_feet": request.ball_below_feet
            },
            "lie_description": ", ".join(lie_conditions),
            "ground_conditions": ground_conditions_text,
            "answer": answer,
            "user_email": current_user.email
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing agent query: {str(e)}"
        )