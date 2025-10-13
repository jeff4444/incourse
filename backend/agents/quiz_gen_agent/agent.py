from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from pydantic_ai import Agent, Tool
from prompts.quiz_agent_prompt import QUIZ_AGENT_PROMPT
from shared.model import get_model
from tools.pinecone_tools import search_multiple_files_with_query

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
    lms_api_key: str
    lms_base_url: str
    course_id: str
    file_ids: List[str]
    
    # For Pinecone file info (similar to chat agent)
    course_info: Optional[Dict[str, Any]] = None
    files_info: Optional[List[Dict[str, Any]]] = None
    
    
def get_quiz_agent(**kwargs) -> Agent[Deps, List[Quiz]]:
    """
    Get an agent for generating quizzes based on course content.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = QUIZ_AGENT_PROMPT
        
    system_prompt = system_prompt + f"\n\nThe user has requested {kwargs.get('num_quizzes', 10)} quiz questions."
    
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
        ],
    )