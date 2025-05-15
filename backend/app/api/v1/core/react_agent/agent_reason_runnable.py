from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import tool, create_react_agent
import datetime
import math
from langchain_community.tools import TavilySearchResults
from langchain import hub
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.v1.core.user_endpoints.user_db import get_user_clubs_db
from app.api.v1.core.models import Users
from app.db_setup import get_db
from app.settings import settings
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=settings.GEMINI_API_KEY)

@tool
def get_system_time(format: str = "%Y-%m-%d %H:%M:%S"):
    """ Returns the current date and time in the specified format 
    
    Args:
        format: Optional time format string (default: "%Y-%m-%d %H:%M:%S")
            
    Returns:
        The current time formatted as a string
    """
    current_time = datetime.datetime.now()
    formatted_time = current_time.strftime(format)
    return formatted_time

@tool
def get_user_clubs(email: str):
    """Retrieves all golf clubs for a specified user by email. 
    
    Args:
        email: The user's email formatted as 'user@email.com'
        
    Returns:
        A list of the user's clubs with details like club name, distance, and whether it's preferred
    """
    try:
        # Create a database session
        db = next(get_db())
        
        # Find the user by email
        user = db.scalar(select(Users).where(Users.email == email))
        if not user:
            return {"error": f"User with email {email} not found"}
        
        # Get the user's clubs
        clubs = get_user_clubs_db(user_id=user.id, db=db)
        
        if not clubs:
            return {"message": f"User {email} has no clubs registered"}
        
        # Format clubs for better readability
        clubs_data = [{
            "club": club.club, 
            "distance_meter": float(club.distance_meter), 
            "preferred_club": club.preferred_club
        } for club in clubs]
        
        return clubs_data
        
    except Exception as e:
        return {"error": f"Error retrieving clubs: {str(e)}"}
    finally:
        db.close()

@tool
def calculate_wind_effect(wind_speed: float, wind_direction: str, distance_to_flag: float):
    """Calculate how wind affects a golf ball's distance when hitting toward the flag.
    
    Args:
        wind_speed: Wind speed in meters per second (m/s)
        wind_direction: Direction of the wind ('headwind', 'tailwind', 'crosswind-left', 'crosswind-right')
        distance_to_flag: Distance from the ball to the flag/hole in meters
        
    Returns:
        Information about how the wind affects the shot, including adjusted distance needed
    """
    # Determine wind type from direction
    if not isinstance(wind_direction, str):
        return {"error": "Wind direction must be a string"}
        
    wind_direction = wind_direction.lower()
    
    # Map the wind direction to wind type
    if wind_direction == "headwind":
        wind_type = "headwind"
    elif wind_direction == "tailwind":
        wind_type = "tailwind"
    elif wind_direction in ["crosswind-left", "crosswind-right"]:
        wind_type = "crosswind"
    else:
        return {"error": "Invalid wind direction. Use 'headwind', 'tailwind', 'crosswind-left', or 'crosswind-right'"}
    
    # Wind effect factors
    headwind_factor = 0.012  # 1.2% per m/s for headwind
    tailwind_factor = 0.0075  # 0.75% per m/s for tailwind
    
    # Calculate distance effect
    distance_effect = 0
    lateral_effect = 0
    
    if wind_type == "headwind":
        # Headwind makes the shot play longer (positive adjustment needed)
        distance_effect = distance_to_flag * (headwind_factor * wind_speed)
    elif wind_type == "tailwind":
        # Tailwind makes the shot play shorter (negative adjustment needed)
        distance_effect = -distance_to_flag * (tailwind_factor * wind_speed)
    elif wind_type == "crosswind":
        # Crosswind primarily affects lateral movement (minimal distance effect)
        lateral_effect = wind_speed * 1.5  # Approximate lateral drift in meters
        # Crosswinds also slightly increase effective distance
        distance_effect = distance_to_flag * (headwind_factor * wind_speed * 0.3)
    
    # Calculate effective distance needed to counter wind effect
    effective_distance_needed = distance_to_flag + distance_effect
    
    return {
        "actual_distance_to_flag_meters": distance_to_flag,
        "effective_distance_needed_meters": round(effective_distance_needed, 1),
        "adjustment_needed_meters": round(distance_effect, 1),
        "lateral_drift_meters": round(lateral_effect, 1),
        "wind_type": wind_type,
        "wind_speed_mps": wind_speed,
        "explanation": f"With {wind_speed} m/s {wind_type}, although the flag is {distance_to_flag} meters away, you should play the shot as if it were {round(effective_distance_needed, 1)} meters (an adjustment of {round(distance_effect, 1)} meters). {'' if lateral_effect == 0 else f'Account for {abs(round(lateral_effect, 1))} meters of lateral drift.'}"
    }

tools = [get_system_time, get_user_clubs, calculate_wind_effect]

react_prompt = hub.pull("hwchase17/react")

react_agent_runnable = create_react_agent(tools=tools, llm=llm, prompt=react_prompt)