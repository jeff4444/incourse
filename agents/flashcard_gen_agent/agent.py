import os
from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict
from pydantic_ai import Agent, Tool
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider   
from shared.prompts.flashcard_agent_prompt import FLASHCARD_AGENT_PROMPT
from dotenv import load_dotenv
from shared.agents.tools import (
    get_chat_history_summary, 
    get_course_grade_details, 
    get_course_quiz_history, 
    get_file_content_summaries, 
    get_overall_course_performance,
    get_assignment_grades,
    get_all_grades,
    get_some_grades,
    get_course_analytics,
    get_student_analytics,
    get_canvas_courses,
    get_canvas_course,
    get_canvas_course_modules,
    get_canvas_module_items,
    get_canvas_file_details,
    get_canvas_files_details,
    get_canvas_course_assignments
)


load_dotenv()

ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DEFAULT_LOCATION = os.getenv("AWS_DEFAULT_REGION")
MODEL_ARN = os.getenv("AWS_MODEL_ARN")

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
    
    
def get_flashcard_agent(**kwargs) -> Agent[Deps, List[Flashcard]]:
    """
    Get an agent for generating flashcards based on course content.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = FLASHCARD_AGENT_PROMPT
            
    model = BedrockConverseModel(
        MODEL_ARN,
        provider=BedrockProvider(
            region_name=DEFAULT_LOCATION,
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
        ),
    )
    
    return Agent[
        Deps,
        List[Flashcard],
    ](
        model,
        output_type=List[Flashcard],
        system_prompt=system_prompt,
        tools=[  
            Tool(get_overall_course_performance, takes_ctx=True),
            Tool(get_chat_history_summary, takes_ctx=True),
            Tool(get_course_quiz_history, takes_ctx=True),
            Tool(get_course_grade_details, takes_ctx=True),
            Tool(get_file_content_summaries, takes_ctx=True),
            Tool(get_assignment_grades, takes_ctx=True),
            Tool(get_all_grades, takes_ctx=True),
            Tool(get_some_grades, takes_ctx=True),
            Tool(get_course_analytics, takes_ctx=True),
            Tool(get_student_analytics, takes_ctx=True),
            Tool(get_canvas_courses, takes_ctx=True),
            Tool(get_canvas_course, takes_ctx=True),
            Tool(get_canvas_course_modules, takes_ctx=True),
            Tool(get_canvas_module_items, takes_ctx=True),
            Tool(get_canvas_file_details, takes_ctx=True),
            Tool(get_canvas_files_details, takes_ctx=True),
            Tool(get_canvas_course_assignments, takes_ctx=True),
        ],
    )