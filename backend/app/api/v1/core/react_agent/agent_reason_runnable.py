
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
    
    # ADJUSTED: More realistic wind effect factors (reduced by ~50%)
    headwind_factor = 0.006  # 0.6% per m/s for headwind (was 1.2%)
    tailwind_factor = 0.004  # 0.4% per m/s for tailwind (was 0.75%)
    
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
        # ADJUSTED: More moderate lateral drift
        lateral_effect = wind_speed * 0.9  # Approximate lateral drift in meters (was 1.5)
        # ADJUSTED: Reduced crosswind distance effect
        distance_effect = distance_to_flag * (headwind_factor * wind_speed * 0.2)  # Was 0.3
    
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

@tool
def calculate_lie_effect(input: dict):
    """Calculate how multiple lie conditions affect the golf shot distance and behavior.
    
    Args:
        input: A dictionary containing:
            base_distance: Base/normal distance in meters for the shot
            
            # Surface type (select only one)
            fairway: Boolean, ball on fairway
            light_rough: Boolean, ball in light rough
            heavy_rough: Boolean, ball in heavy rough
            hardpan: Boolean, ball on hardpan/bare ground
            divot: Boolean, ball in a divot
            bunker: Boolean, ball in fairway bunker
            
            # Slope conditions (can be combined with surface)
            uphill: Boolean, uphill lie
            downhill: Boolean, downhill lie
            ball_above_feet: Boolean, ball above feet
            ball_below_feet: Boolean, ball below feet
        
    Returns:
        Information about how the combined lie conditions affect the shot distance and behavior
    """
    # Extract base distance
    base_distance = input.get('base_distance', 0)
    
    # Validate base distance
    if not base_distance or not isinstance(base_distance, (int, float)) or base_distance <= 0:
        return {"error": "Invalid base_distance. Must be a positive number."}
    
    # ADJUSTED: More realistic surface effects with less extreme penalties
    surface_types = {
        "fairway": {
            "distance_factor": 1.0,  # 100% of normal distance
            "dispersion_factor": 1.0,  # Normal dispersion
            "description": "Normal distance and control from fairway lie"
        },
        "light_rough": {
            "distance_factor": 0.97,  # 97% of normal distance (was 95%)
            "dispersion_factor": 1.07,  # 7% more dispersion (was 10%)
            "description": "Slightly reduced distance and marginally less control"
        },
        "heavy_rough": {
            "distance_factor": 0.90,  # 90% of normal distance (was 85%)  
            "dispersion_factor": 1.2,  # 20% more dispersion (was 30%)
            "description": "Reduced distance with less predictable ball flight"
        },
        "hardpan": {
            "distance_factor": 0.95,  # 95% of normal distance (was 90%)
            "dispersion_factor": 1.05,  # 5% more dispersion (was 10%)
            "description": "Slightly more difficult to get clean contact, resulting in minor distance loss"
        },
        "divot": {
            "distance_factor": 0.93,  # 93% of normal distance (was 90%)
            "dispersion_factor": 1.15,  # 15% more dispersion (was 20%)
            "description": "Clean contact is harder from a divot, expect slightly shorter distance"
        },
        "bunker": {
            "distance_factor": 0.90,  # 90% of normal distance (was 88%)
            "dispersion_factor": 1.2,  # 20% more dispersion (was 30%)
            "description": "Challenging to get clean contact from fairway bunkers, resulting in shorter distance"
        }
    }
    
    # ADJUSTED: More realistic slope effects with less extreme penalties
    slope_conditions = {
        "uphill": {
            "distance_factor": 0.95,  # 95% of normal distance (was 92%)
            "dispersion_factor": 1.1,  # 10% more dispersion (was 15%)
            "description": "Ball tends to fly higher with slightly reduced distance from uphill lies"
        },
        "downhill": {
            "distance_factor": 0.97,  # 97% of normal distance (was 94%)
            "dispersion_factor": 1.12,  # 12% more dispersion (was 20%)
            "description": "Ball tends to fly lower with slightly reduced distance and more roll from downhill lies"
        },
        "ball_above_feet": {
            "distance_factor": 0.96,  # 96% of normal distance (was 93%)
            "dispersion_factor": 1.15,  # 15% more dispersion (was 25%)
            "description": "Ball tends to draw with slight risk of fat shot"
        },
        "ball_below_feet": {
            "distance_factor": 0.95,  # 95% of normal distance (was 92%)
            "dispersion_factor": 1.15,  # 15% more dispersion (was 25%)
            "description": "Ball tends to fade/slice with slight risk of thin shot"
        }
    }
    
    # Initialize effect factors
    net_distance_factor = 1.0
    net_dispersion_factor = 1.0
    active_conditions = []
    descriptions = []
    
    # Check which surface is active (should be only one)
    active_surface = None
    for surface_type in surface_types.keys():
        if input.get(surface_type, False):
            if active_surface:
                return {"error": f"Only one surface type can be active at a time. Found both {active_surface} and {surface_type}."}
            active_surface = surface_type
    
    # Default to fairway if no surface is specified
    if not active_surface:
        active_surface = "fairway"
    
    # Apply surface effect
    surface_effect = surface_types[active_surface]
    net_distance_factor *= surface_effect["distance_factor"]
    net_dispersion_factor *= surface_effect["dispersion_factor"]
    active_conditions.append(active_surface)
    descriptions.append(surface_effect["description"])
    
    # Check and apply slope conditions (can have multiple)
    for slope_condition in slope_conditions.keys():
        if input.get(slope_condition, False):
            slope_effect = slope_conditions[slope_condition]
            net_distance_factor *= slope_effect["distance_factor"]
            net_dispersion_factor *= slope_effect["dispersion_factor"]
            active_conditions.append(slope_condition)
            descriptions.append(slope_effect["description"])
    
    # Calculate adjusted distance
    adjusted_distance = base_distance * net_distance_factor
    
    # Calculate the club distance needed to reach the target
    required_club_distance = base_distance / net_distance_factor if net_distance_factor > 0 else base_distance
    
    # Build combined description
    if len(descriptions) > 1:
        combined_description = "Combined effects: " + "; ".join(descriptions)
    else:
        combined_description = descriptions[0] if descriptions else "Standard lie"
    
    # Format the active conditions for display
    formatted_conditions = [condition.replace('_', ' ') for condition in active_conditions]
    condition_str = " + ".join(formatted_conditions)
    
    return {
        "target_distance_meters": base_distance,  # Original target distance
        "required_club_distance_meters": round(required_club_distance, 1),  # How far your club should normally hit
        "explanation": f"To reach your {base_distance} meter target from this {condition_str} lie, select a club that normally carries {round(required_club_distance, 1)} meters."
    }

@tool
def calculate_ground_effect(input: dict):
    """Calculate how ground conditions (wet or firm) affect golf shots.
    
    Args:
        input: A dictionary containing:
            ground_condition: String, either 'wet', 'firm', or 'normal'
            base_distance: Base/normal distance in meters for the shot
        
    Returns:
        Information about how the ground condition affects the shot
    """
    # Extract parameters
    ground_condition = input.get('ground_condition', '').lower()
    base_distance = input.get('base_distance', 0)
    
    # Validate base distance
    if not base_distance or not isinstance(base_distance, (int, float)) or base_distance <= 0:
        return {"error": "Invalid base_distance. Must be a positive number."}
    
    # ADJUSTED: More realistic ground effects with less extreme adjustments
    ground_effects = {
        "wet": {
            "roll_factor": 0.92,  # 8% less roll (was 15%)
            "carry_vs_roll_ratio": 0.85,  # 85% carry, 15% roll (was 90/10)
            "club_adjustment": 0.5,  # 1/2 club longer (was 1)
            "landing_description": "Slightly higher landing angle; ball stops quicker with reduced roll",
            "strategy": "Focus more on carry distance; aim closer to target",
            "spin_effect": "Increased backspin effect; ball may stop quicker",
            "landing_characteristics": "Softer landing with less bounce",
            "explanation": "On wet ground, expect moderately reduced roll distance and quicker stopping. Consider using a half-club longer to compensate for the reduced roll."
        },
        "firm": {
            "roll_factor": 1.12,  # 12% more roll (was 20%)
            "carry_vs_roll_ratio": 0.75,  # 75% carry, 25% roll (was 70/30)
            "club_adjustment": -0.5,  # 1/2 club shorter (was -1)
            "landing_description": "Slightly lower landing angle; ball bounces and rolls more",
            "strategy": "Account for extra roll; consider landing ball short of target",
            "spin_effect": "Slightly reduced spin effect; ball tends to release forward more",
            "landing_characteristics": "More bounce and forward roll; ball plays slightly faster",
            "explanation": "On firm ground, expect increased roll distance and more forward bounce. Consider using a half-club shorter to account for additional roll."
        },
        "normal": {
            "roll_factor": 1.0,  # Normal roll
            "carry_vs_roll_ratio": 0.80,  # 80% carry, 20% roll
            "club_adjustment": 0,  # No club adjustment
            "landing_description": "Standard landing and bounce characteristics",
            "strategy": "Standard shot strategy; normal target selection",
            "spin_effect": "Normal spin effects",
            "landing_characteristics": "Expected bounce and roll for the course conditions",
            "explanation": "Under normal ground conditions, expect standard ball behavior with typical bounce and roll."
        }
    }
    
    # Check if ground condition is valid
    if ground_condition not in ground_effects:
        return {
            "error": f"Invalid ground condition: '{ground_condition}'. Valid options are 'wet', 'firm', or 'normal'.",
            "valid_options": list(ground_effects.keys())
        }
    
    # Get effects for the specified ground condition
    effects = ground_effects[ground_condition]
    
    # Calculate distances
    # For simplicity, assume 20% of total distance is roll under normal conditions
    normal_carry = base_distance * 0.8
    normal_roll = base_distance * 0.2
    
    # Adjust roll based on ground conditions
    adjusted_roll = normal_roll * effects["roll_factor"]
    
    # Calculate total distance with adjusted roll
    total_distance = normal_carry + adjusted_roll
    
    # Determine club adjustment recommendation
    if effects["club_adjustment"] > 0:
        if effects["club_adjustment"] == 0.5:
            club_recommendation = "Consider a half-club longer than normal"
        else:
            club_recommendation = f"Select {effects['club_adjustment']} club{'s' if effects['club_adjustment'] > 1 else ''} longer than normal"
    elif effects["club_adjustment"] < 0:
        if effects["club_adjustment"] == -0.5:
            club_recommendation = "Consider a half-club shorter than normal"
        else:
            club_recommendation = f"Select {abs(effects['club_adjustment'])} club{'s' if abs(effects['club_adjustment']) > 1 else ''} shorter than normal"
    else:
        club_recommendation = "Use your normal club selection"
    
    # Create detailed ground effect information
    return {
        "ground_condition": ground_condition,
        "base_distance_meters": base_distance,
        "estimated_total_distance_meters": round(total_distance, 1),
        "carry_distance_meters": round(normal_carry, 1),
        "roll_distance_meters": round(adjusted_roll, 1),
        "roll_adjustment_percentage": f"{round((effects['roll_factor'] - 1) * 100, 1)}%" if ground_condition != "normal" else "0%",
        "club_recommendation": club_recommendation,
        "landing_description": effects["landing_description"],
        "strategy": effects["strategy"],
        "spin_effect": effects["spin_effect"],
        "explanation": effects["explanation"]
    }


tools = [get_user_clubs, calculate_wind_effect, calculate_lie_effect, calculate_ground_effect]

react_prompt = hub.pull("hwchase17/react")

react_agent_runnable = create_react_agent(tools=tools, llm=llm, prompt=react_prompt)