from langchain.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from app.settings import settings

CHROMA_PERSIST_DIRECTORY = os.path.join(os.path.dirname(__file__), "chroma_db")

def init_chroma():
    """Ensure Chroma directory exists"""
    os.makedirs(CHROMA_PERSIST_DIRECTORY, exist_ok=True)

def get_embeddings():
    """Get the embedding function"""
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=settings.GEMINI_API_KEY
    )

def create_shot_vector_store(collection_name="golf_shots_full"):
    """Create or get the vector store for full shot recommendations including recommendations"""
    embeddings = get_embeddings()
    
    return Chroma(
        persist_directory=CHROMA_PERSIST_DIRECTORY,
        embedding_function=embeddings,
        collection_name=collection_name
    )

def create_conditions_vector_store(collection_name="golf_shots_conditions"):
    """Create or get the vector store for just shot conditions"""
    embeddings = get_embeddings()
    
    return Chroma(
        persist_directory=CHROMA_PERSIST_DIRECTORY,
        embedding_function=embeddings,
        collection_name=collection_name
    )

def add_shot_with_dual_embeddings(shot_full_text, shot_conditions_text, metadata, shot_id):
    """Add a shot with dual embeddings - one for full text and one for just conditions
    
    Args:
        shot_full_text: Full text including context and recommendation
        shot_conditions_text: Just the shot conditions (wind, distance, lie, etc.)
        metadata: Dict with user_id, timestamp, etc.
        shot_id: Unique ID for the shot
    """
    # Get both vector stores
    full_store = create_shot_vector_store()
    conditions_store = create_conditions_vector_store()
    
    # Add to full store
    full_store.add_texts(
        texts=[shot_full_text],
        metadatas=[metadata],
        ids=[shot_id]
    )
    
    # Add to conditions store
    conditions_store.add_texts(
        texts=[shot_conditions_text],
        metadatas=[metadata],
        ids=[shot_id]
    )
    
    # Persist changes
    full_store.persist()
    conditions_store.persist()
    
def search_by_conditions(conditions_text, user_id, k=5, similarity_threshold=0.4):
    """Search for similar shots based on just the conditions, but return full shots
    
    Args:
        conditions_text: The shot conditions to search for
        user_id: User ID to filter by
        k: Number of results to return
        similarity_threshold: Minimum similarity score
        
    Returns:
        List of similar shots with their metadata and scores
    """
    # Initialize Chroma
    init_chroma()
    
    # Get both vector stores
    conditions_store = create_conditions_vector_store()
    full_store = create_shot_vector_store()
    
    # Search in conditions store
    try:
        similar_conditions = conditions_store.similarity_search_with_score(
            query=conditions_text,
            k=k,
            filter={"user_id": user_id}
        )
        
        # Filter by similarity threshold - lower threshold to 0.2 for identical conditions
        similar_conditions = [(doc, score) for doc, score in similar_conditions if score >= 0.2]
        
        if not similar_conditions:
            print("No similar conditions found with threshold 0.2")
            return []
        
        # Get IDs of matching documents
        matching_ids = []
        for doc, score in similar_conditions:
            shot_id = doc.metadata.get("shot_id")
            if shot_id:
                matching_ids.append(shot_id)
            else:
                print(f"Warning: document missing shot_id in metadata: {doc.metadata}")
        
        if not matching_ids:
            print("No valid shot_ids found in metadata")
            return []
        
        # Retrieve full documents from full store
        results = []
        
        for match_id in matching_ids:
            try:
                # Get the similarity score from the conditions search
                score = next((score for doc, score in similar_conditions 
                            if doc.metadata.get("shot_id") == match_id), 0)
                
                # Get full document from full store
                full_docs = full_store.get(ids=[match_id])
                
                if full_docs and full_docs.get('documents') and full_docs.get('metadatas') and len(full_docs['documents']) > 0:
                    # Create a document object with the full text and metadata
                    from langchain.schema import Document
                    doc = Document(
                        page_content=full_docs['documents'][0],
                        metadata=full_docs['metadatas'][0]
                    )
                    results.append((doc, score))
                else:
                    print(f"Warning: No full document found for shot_id {match_id}")
            except Exception as e:
                print(f"Error retrieving full document for shot_id {match_id}: {str(e)}")
                continue
        
        # Sort by similarity score
        results.sort(key=lambda x: x[1], reverse=True)
        
        return results
    except Exception as e:
        print(f"Error in search_by_conditions: {str(e)}")
        return [] 