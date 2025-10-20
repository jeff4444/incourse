from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from pydantic_ai import Agent, Tool
from prompts.quiz_agent_prompt import QUIZ_AGENT_PROMPT
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

class Quiz(BaseModel):
    """
    A class representing a quiz.
    """
    question: str = Field(
        ...,
        description="The question to be asked in the quiz."
    )
    options: List[str] = Field(
        ...,
        description="The options for the quiz question. Must be four options."
    )
    response_index: int = Field(
        ...,
        description="The index of the correct response in the options list."
    )
    explanation: str = Field(
        ...,
        description="An explanation of the correct answer."
    )
    helper_image_prompt: str = Field(
        default="",
        description="Optional. A prompt for generating a helper image related to the quiz question."
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the Quiz object to a dictionary.
        """
        return {
            "question": self.question,
            "options": self.options,  # Keep as list for JSONB storage
            "response_index": self.response_index,
            "explanation": self.explanation,
            "helper_image_prompt": self.helper_image_prompt
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
    
    
def get_quiz_agent(**kwargs) -> Agent[Deps, List[Quiz]]:
    """
    Get an agent for generating quizzes based on course content.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = QUIZ_AGENT_PROMPT
    
    # Add number of questions to prompt
    system_prompt = system_prompt + f"\n\nThe user has requested {kwargs.get('num_quizzes', 10)} quiz questions."
    
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
        List[Quiz],
    ](
        model,
        output_type=List[Quiz],
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