from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from pydantic_ai import Agent, Tool
from prompts.flashcard_agent_prompt import FLASHCARD_AGENT_PROMPT
from shared.model import get_model
from tools.pinecone_tools import (
    search_multiple_files_with_query,
    search_single_file_with_query,
    search_single_file_with_chunk_index
)
from tools.note_tools import (
    search_note_with_chunk_index,
    search_multiple_notes_overview
)

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
    course_id: str
    file_ids: List[str]
    
    # Lazy-loaded fields (will be fetched by tools if needed, but can be pre-populated)
    lms_api_key: Optional[str] = None
    lms_base_url: Optional[str] = None
    course_info: Optional[Dict[str, Any]] = None
    files_info: Optional[List[Dict[str, Any]]] = None
    note_ids: Optional[List[str]] = None
    notes_info: Optional[List[Dict[str, Any]]] = None
    
    
def get_flashcard_agent(**kwargs) -> Agent[Deps, List[Flashcard]]:
    """
    Get an agent for generating flashcards based on course content.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = FLASHCARD_AGENT_PROMPT
    
    # Inject file_ids into prompt if available
    file_ids = kwargs.get("file_ids", [])
    if file_ids:
        system_prompt += f"\n\n📁 AVAILABLE FILES:\n"
        for file_id in file_ids:
            system_prompt += f"- {file_id}\n"
        system_prompt += "\nUse these file_ids when calling search_single_file_with_query() or search_single_file_with_chunk_index()."
    
    # Inject note_ids into prompt if available
    note_ids = kwargs.get("note_ids", [])
    if note_ids:
        system_prompt += f"\n\n📝 AVAILABLE NOTES:\n"
        for note_id in note_ids:
            system_prompt += f"- {note_id}\n"
        system_prompt += "\nUse these note_ids when calling search_note_with_chunk_index() or search_multiple_notes_overview()."
            
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
            Tool(search_single_file_with_query, takes_ctx=True),
            Tool(search_single_file_with_chunk_index, takes_ctx=True),
            # Note search tools - for note content retrieval
            Tool(search_note_with_chunk_index, takes_ctx=True),
            Tool(search_multiple_notes_overview, takes_ctx=True),
        ],
    )