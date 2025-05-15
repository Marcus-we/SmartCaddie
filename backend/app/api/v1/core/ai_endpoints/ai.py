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

@router.post("/agent/query", status_code=status.HTTP_200_OK)
def query_agent(
    request: AgentQueryRequest,
    current_user: Users = Depends(get_current_user)
):
    try:
        # Format the query for better AI understanding
        formatted_query = (
            f"You are acting as a professional golf caddie for {current_user.full_name} ({current_user.email}). "
            f"Based on the current golf shot situation, provide a detailed recommendation.\n\n"
            
            f"### Current Situation:\n"
            f"- Distance to flag: {request.distance_to_flag} meters\n"
            f"- Wind speed: {request.wind_speed} m/s\n"
            f"- Wind direction: {request.wind_direction}\n\n"
            
            f"### Instructions (follow these strictly):\n"
            f"0. Address the user directly as if youre talking to them.\n"
            f"1. Gather info about the users clubs.\n"
            f"2. Analyze how the wind affects the shot.\n"
            f"3. Calculate and provide the effective distance after considering the wind.\n"
            f"4. Recommend **exactly two** different shot options.\n"
            f"5. For each option, include:\n"
            f"   - The expected distance\n"
            f"   - How the shot accounts for wind conditions\n"
            f"6. Begin your response with the phrase:\n"
            f"   **Final Answer: [your complete recommendation here]**\n\n"

            f"### Note:\n"
            f"- DO NOT use any Markdown or special formatting (e.g., no asterisks, no bullet points, no bold or italics).\n"
            f"- Write in plain text only.\n\n"
            "- When providing the Action Input, format the input as a dictionary: `{'input': {}}`.\n"
        )

        
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
            "answer": answer,
            "user_email": current_user.email
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing agent query: {str(e)}"
        )