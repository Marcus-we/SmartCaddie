from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status, Query, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import delete, insert, select, update, and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import Optional, Annotated, Dict, Any, List
from random import randint
import json
import re
import os
import uuid
from datetime import datetime
from app.settings import settings
from pydantic import BaseModel, Field

from app.security import get_current_user
from app.api.v1.core.react_agent.react_graph import app as agent_app

from app.api.v1.core.schemas import (
    AgentQueryRequest,
    ShotFeedbackRequest
)

from app.api.v1.core.models import (
    Users,
)

from app.api.v1.core.rag.vector_store import (
    create_shot_vector_store,
    create_conditions_vector_store,
    init_chroma,
    add_shot_with_dual_embeddings,
    search_by_conditions
)

from app.db_setup import get_db

# Add the import for Gemini LLM after the existing imports
from langchain_google_genai import ChatGoogleGenerativeAI

# Add the LLM filtering function after the existing imports and before the router definition
def format_shot_for_analysis(shot_data, index: int) -> str:
    """Format a single shot for LLM analysis"""
    doc, similarity_score = shot_data
    metadata = doc.metadata
    
    # Extract conditions from the document content
    content_lines = doc.page_content.split('\n')
    conditions_section = []
    recommendation_section = []
    
    in_recommendation = False
    for line in content_lines:
        if 'Recommendation:' in line:
            in_recommendation = True
            continue
        if in_recommendation:
            recommendation_section.append(line.strip())
        else:
            conditions_section.append(line.strip())
    
    conditions_text = '\n'.join(conditions_section).strip()
    recommendation_text = '\n'.join(recommendation_section).strip()
    
    return f"""
Shot {index + 1} (Embedding Similarity: {similarity_score:.3f}):
Conditions: {conditions_text}
Previous Recommendation: {recommendation_text}
User Feedback: {'Liked' if metadata.get('liked') else 'Disliked' if metadata.get('liked') == False else 'No feedback'}
Club Used: {metadata.get('club_used', 'Not specified')}
Shot Result: {metadata.get('shot_result', 'Not specified')}
Timestamp: {metadata.get('timestamp', 'Unknown')}
---"""

def llm_filter_shots(request: AgentQueryRequest, retrieved_shots: list, target_count: int = 3) -> list:
    """Use Gemini to filter and rank the most relevant shots"""
    
    if len(retrieved_shots) <= target_count:
        return retrieved_shots
    
    # Create Gemini LLM instance
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1
    )
    
    # Format current conditions using the Pydantic schema
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
    
    if not lie_conditions:
        lie_conditions = ["fairway"]
    
    ground_conditions = []
    if request.wet_ground:
        ground_conditions.append("wet ground")
    if request.firm_ground:
        ground_conditions.append("firm ground")
    
    ground_conditions_text = ", ".join(ground_conditions) if ground_conditions else "normal"
    
    current_conditions = f"""
Distance to flag: {request.distance_to_flag} meters
Wind speed: {request.wind_speed} m/s
Wind direction: {request.wind_direction}
Lie conditions: {', '.join(lie_conditions)}
Ground conditions: {ground_conditions_text}
"""
    
    # Format retrieved shots
    formatted_shots = []
    for i, shot in enumerate(retrieved_shots):
        formatted_shots.append(format_shot_for_analysis(shot, i))
    
    shots_text = '\n'.join(formatted_shots)
    
    # Create filtering prompt
    prompt = f"""You are a golf expert analyzing shot similarity for a golf caddie AI system.

CURRENT SHOT CONDITIONS:
{current_conditions.strip()}

RETRIEVED SIMILAR SHOTS FROM EMBEDDING SEARCH:
{shots_text}

TASK: Select the {target_count} most relevant shots that would provide the best context for making a recommendation for the current shot.

EVALUATION CRITERIA (in order of importance):
1. Condition Similarity (40%): How closely do the distance, wind, and lie conditions match?
2. Strategic Relevance (30%): Would the previous recommendation strategy apply to the current situation?
3. Outcome Quality (20%): Did the previous shot work well (user liked it, good result)?
4. Recency (10%): More recent shots may be more relevant to current playing style

INSTRUCTIONS:
- Consider that ±10 meters distance is very similar
- Wind direction and speed should be reasonably close
- Exact lie condition matches are highly valuable
- User feedback (liked/disliked) is important for recommendation quality
- Shot results like "on green" indicate successful recommendations

OUTPUT FORMAT:
Return only a JSON array with the shot numbers (1-based) of the top {target_count} most relevant shots, ordered by relevance.
Example: [3, 1, 7]

JSON Response:"""

    try:
        # Get LLM response
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        
        # Extract JSON from response
        if '[' in response_text and ']' in response_text:
            json_start = response_text.find('[')
            json_end = response_text.find(']') + 1
            json_str = response_text[json_start:json_end]
            selected_indices = json.loads(json_str)
            
            # Convert to 0-based indices and return corresponding shots
            filtered_shots = []
            for idx in selected_indices:
                if 1 <= idx <= len(retrieved_shots):
                    filtered_shots.append(retrieved_shots[idx - 1])
            
            print(f"LLM filtered {len(retrieved_shots)} shots down to {len(filtered_shots)} most relevant")
            return filtered_shots[:target_count]
        else:
            # Fallback: return top shots by embedding similarity
            print("LLM filtering failed, falling back to embedding similarity")
            return retrieved_shots[:target_count]
            
    except Exception as e:
        print(f"Error in LLM filtering: {str(e)}")
        # Fallback: return top shots by embedding similarity
        return retrieved_shots[:target_count]

router = APIRouter()



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
        
        # Format ground conditions as a dictionary
        ground_conditions_dict = {
            "wet_ground": request.wet_ground,
            "firm_ground": request.firm_ground
        }
        
        # Only include true values in the example
        lie_example_params = {k: v for k, v in lie_params.items() if v}
        lie_example_params["base_distance"] = 150
        
        # Create a query text for similarity search (conditions only)
        conditions_text = f"""
        Shot Context:
        Distance to flag: {request.distance_to_flag} meters
        Wind speed: {request.wind_speed} m/s
        Wind direction: {request.wind_direction}
        Lie conditions: {', '.join(lie_conditions)}
        Ground conditions: {ground_conditions_text}
        """
        
        # Check for similar shots from this user based on conditions with LLM filtering
        try:
            # Initialize Chroma
            init_chroma()
            
            # Search for more shots initially (20) for LLM filtering
            initial_shots = search_by_conditions(
                conditions_text=conditions_text.strip(),
                user_id=current_user.id,
                k=20,  # Retrieve more shots for LLM filtering
                similarity_threshold=0.1  # Lower threshold to get more candidates
            )
            
            # Use LLM to filter down to the 3 most relevant shots
            if initial_shots:
                similar_shots = llm_filter_shots(request, initial_shots, target_count=2)
            else:
                similar_shots = []
            
            # Add similar shots as context if any were found
            if similar_shots:
                formatted_query += "### Your Previous Similar Shots (LLM-filtered for relevance):\n"
                for i, (doc, score) in enumerate(similar_shots, 1):
                    # Extract the recommendation part
                    context_parts = doc.page_content.split("Recommendation:")
                    shot_context = context_parts[0].strip()
                    recommendation = context_parts[1].strip() if len(context_parts) > 1 else "No recommendation found"
                    
                    # Format and add to query
                    formatted_query += f"Similar Shot {i} (embedding similarity: {score:.3f}):\n"
                    formatted_query += f"Context: {shot_context}\n"
                    formatted_query += f"Previous Recommendation: {recommendation}\n"
                    
                    # Add club used and shot result if available in metadata
                    metadata = doc.metadata
                    if "club_used" in metadata:
                        formatted_query += f"Club Used: {metadata['club_used']}\n"
                    if "shot_result" in metadata:
                        formatted_query += f"Shot Result: {metadata['shot_result']}\n"
                    if "liked" in metadata:
                        formatted_query += f"User {'liked' if metadata['liked'] else 'disliked'} this recommendation\n"
                    
                    formatted_query += "\n"
            else:
                print(f"No similar shots found for conditions: {conditions_text.strip()}")
        except Exception as search_error:
            # If search fails, continue without similarity context
            print(f"Similarity search error: {str(search_error)}")
            pass
        
        # Add instructions as a regular string (not f-string)
        formatted_query += "### Instructions (follow these strictly):\n"
        formatted_query += "1. Address the user directly as if youre talking to them.\n"
        formatted_query += "2. Gather info about the users clubs.\n"
        formatted_query += "3. Analyze how the wind affects the shot.\n"
        formatted_query += f"4. Calculate the effective distance after considering the wind and ground conditions: {ground_conditions_text}.\n"
        formatted_query += f"5. If user liked a previous similar shot recommendation. ONLY then do you take that recommendation into account for new recommendation\n"

        formatted_query += "6. IMPORTANT: Follow this format for your answer\n"
        formatted_query += "7. First explain what the conditions will do to the ball\n"
        formatted_query += "8. Recommend **exactly two** different club options.\n"
        formatted_query += "9. For each option, provide in simple, clear language:\n"
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
        
        # Current timestamp for this shot
        shot_timestamp = datetime.now().isoformat()
        
        # Generate a unique ID for this shot
        shot_id = str(uuid.uuid4())
        
        # Simple approach: Store the shot and recommendation directly in ChromaDB
        # Initialize Chroma
        init_chroma()
        
        # Format the full shot text for embedding (includes recommendation)
        full_shot_text = f"""
        Shot Context:
        Distance to flag: {request.distance_to_flag} meters
        Wind speed: {request.wind_speed} m/s
        Wind direction: {request.wind_direction}
        Lie conditions: {', '.join(lie_conditions)}
        Ground conditions: {ground_conditions_text}
        
        Recommendation:
        {answer}
        """
        
        # Format the conditions-only text for the second embedding
        conditions_text = f"""
        Shot Context:
        Distance to flag: {request.distance_to_flag} meters
        Wind speed: {request.wind_speed} m/s
        Wind direction: {request.wind_direction}
        Lie conditions: {', '.join(lie_conditions)}
        Ground conditions: {ground_conditions_text}
        """
        
        # Create metadata
        metadata = {
            "user_id": current_user.id,
            "timestamp": shot_timestamp,
            "shot_id": shot_id,
            "wind_speed": request.wind_speed,
            "wind_direction": request.wind_direction,
            "distance_to_flag": request.distance_to_flag,
            "lie_conditions": json.dumps(lie_params),
            "ground_conditions": json.dumps(ground_conditions_dict),
        }
        
        # Store with dual embeddings
        add_shot_with_dual_embeddings(
            shot_full_text=full_shot_text.strip(),
            shot_conditions_text=conditions_text.strip(),
            metadata=metadata,
            shot_id=shot_id
        )
            
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
            "user_email": current_user.email,
            "timestamp": shot_timestamp  # Return timestamp for feedback reference
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing agent query: {str(e)}"
        )

@router.post("/shots/feedback", status_code=status.HTTP_200_OK)
def update_shot_feedback(
    request: ShotFeedbackRequest,
    current_user: Users = Depends(get_current_user)
):
    """Update shot metadata with user feedback (like/dislike)"""
    try:
        # Initialize Chroma
        init_chroma()
        full_store = create_shot_vector_store()
        conditions_store = create_conditions_vector_store()
        
        # First get all documents from this user from the full store
        results = full_store.get(
            where={"user_id": current_user.id}
        )
        
        if not results or not results['metadatas']:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No shots found for this user"
            )
        
        # Find the document with matching timestamp
        found_index = None
        for idx, metadata in enumerate(results['metadatas']):
            if metadata.get('timestamp') == request.timestamp:
                found_index = idx
                break
        
        if found_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shot with timestamp {request.timestamp} not found"
            )
        
        # Get the document ID, content, and shot_id
        doc_id = results['ids'][found_index]
        doc_content = results['documents'][found_index]
        shot_id = results['metadatas'][found_index].get('shot_id')
        
        if not shot_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shot ID not found in metadata"
            )
        
        # Create updated metadata
        updated_metadata = results['metadatas'][found_index].copy()
        updated_metadata["liked"] = request.liked
        
        # Add club information if provided
        if request.club_used:
            updated_metadata["club_used"] = request.club_used
        
        # Add shot result if provided
        if request.shot_result:
            updated_metadata["shot_result"] = request.shot_result
        
        # Update both collections
        
        # 1. First delete and update the full store
        full_store.delete(ids=[doc_id])
        full_store.add_texts(
            texts=[doc_content],
            metadatas=[updated_metadata],
            ids=[doc_id]
        )
        full_store.persist()
        
        # 2. Update the conditions store
        try:
            # Get the conditions document with the same shot_id
            conditions_results = conditions_store.get(
                where={"shot_id": shot_id}
            )
            
            if conditions_results and conditions_results['ids']:
                # Get the conditions document ID and content
                conditions_doc_id = conditions_results['ids'][0]
                conditions_content = conditions_results['documents'][0]
                
                # Delete and re-add with updated metadata
                conditions_store.delete(ids=[conditions_doc_id])
                conditions_store.add_texts(
                    texts=[conditions_content],
                    metadatas=[updated_metadata],
                    ids=[conditions_doc_id]
                )
                conditions_store.persist()
        except Exception as e:
            print(f"Error updating conditions store: {str(e)}")
            # Continue even if conditions update fails
        
        # Prepare success message
        feedback_message = f"Shot feedback updated. User {'liked' if request.liked else 'disliked'} the recommendation."
        if request.club_used:
            feedback_message += f" Used club: {request.club_used}"
        if request.shot_result:
            feedback_message += f". Result: {request.shot_result}"
        
        return {
            "status": "success",
            "message": feedback_message
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating shot feedback: {str(e)}"
        )