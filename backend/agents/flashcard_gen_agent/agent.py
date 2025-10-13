from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from pydantic_ai import Agent, Tool
from prompts.flashcard_agent_prompt import FLASHCARD_AGENT_PROMPT
from shared.model import get_model
from tools.pinecone_tools import search_multiple_files_with_query

class Flashcard(BaseModel):
    """
    A class representing a flashcard.
    """
    question: str = Field(
        ...,
        description="The question to be asked on the flashcard."
    )
    answer: str = Field(
        ...,
        description="The answer to the flashcard question."
    )
    hint: str = Field(
        default="",
        description="Optional. A hint for the flashcard question."
    )
    image_prompt: str = Field(
        default="",
        description="Optional. A prompt for generating an image related to the flashcard question."
    )
    
    def to_dict(self) -> Dict[str, str]:
        """
        Convert the Flashcard object to a dictionary.
        """
        return {
            "question": self.question,
            "answer": self.answer,
            "hint": self.hint,
            "image_prompt": self.image_prompt
        }

        
@dataclass
class Deps:
    user_id: str
    lms_api_key: str
    lms_base_url: str
    course_id: str
    file_ids: List[str]
    
    # For Pinecone file info (similar to chat agent)
    course_info: Optional[Dict[str, Any]] = None
    files_info: Optional[List[Dict[str, Any]]] = None
    
    
def get_flashcard_agent(**kwargs) -> Agent[Deps, List[Flashcard]]:
    """
    Get an agent for generating flashcards based on course content.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = FLASHCARD_AGENT_PROMPT
            
    model = get_model()
    
    return Agent[
        Deps,
        List[Flashcard],
    ](
        model,
        output_type=List[Flashcard],
        system_prompt=system_prompt,
        tools=[  
            # Pinecone search tools - primary for content retrieval
            Tool(search_multiple_files_with_query, takes_ctx=True),
        ],
    )