from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict
from pydantic_ai import Agent, Tool
from prompts.take_action_agent import TAKE_ACTION_PROMPT
from shared.model import get_model
from tools.canvas_tools import get_chat_history_summary, get_course_grade_details, get_course_quiz_history, get_file_content_summaries, get_overall_course_performance

class RouteOutput(BaseModel):
    """
    Represents the output of the page to route to.
    """
    route_to: str = Field(
        default="",
        description="The route to navigate to."
    )
    file_to_open: str = Field(
        default="",
        description="Optional file to open, e.g., 'syllabus.pdf', 'assignment.docx'."
    )
    quiz_or_flashcard_to_open: str = Field(
        default="",
        description="Optional quiz or flashcard to open, e.g., 'quiz1', 'flashcard_set1'."
    )
    quiz_or_flashcard_to_create: str = Field(
        default="",
        description="Optional quiz or flashcard to create, e.g., 'Create quiz on Chapter 1'."
    )
    course_id: str = Field(
        default="",
        description="Optional course ID for the action, e.g., 'CS101'."
    )
    
    def to_dict(self) -> Dict[str, str]:
        """
        Convert the RouteOutput to a dictionary.
        """
        return {
            "route_to": self.route_to,
            "file_to_open": self.file_to_open,
            "quiz_or_flashcard_to_open": self.quiz_or_flashcard_to_open,
            "quiz_or_flashcard_to_create": self.quiz_or_flashcard_to_create,
            "course_id": self.course_id
        }
        
@dataclass
class Deps:
    user_id: str
    lms_api_key: str
    lms_base_url: str
    
    
def get_take_action_agent(**kwargs) -> Agent[Deps, RouteOutput]:
    """
    Get an agent for processing user input and determining appropriate actions.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = TAKE_ACTION_PROMPT
        
    model = get_model()
    
    return Agent[
        Deps,
        RouteOutput,
    ](
        model,
        output_type=RouteOutput,
        system_prompt=system_prompt,
        tools=[  
            Tool(get_overall_course_performance, takes_ctx=True),
            Tool(get_chat_history_summary, takes_ctx=True),
            Tool(get_course_quiz_history, takes_ctx=True),
            Tool(get_course_grade_details, takes_ctx=True),
            Tool(get_file_content_summaries, takes_ctx=True),
        ],
    )