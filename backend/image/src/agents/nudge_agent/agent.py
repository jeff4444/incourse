from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict
from pydantic_ai import Agent, Tool
from prompts.nudge_agent_prompt import NUDGE_AGENT_PROMPT
from shared.model import get_model
from tools.nudge_tracking_tools import (
    get_user_quiz_status,
    get_flashcard_study_status,
    get_upcoming_deadlines,
    get_study_patterns,
    get_nudge_preferences
)

class Nudge(BaseModel):
    """
    A class representing a nudge.
    """
    nudge_text: str = Field(
        ...,
        description="The nudge message to be sent to the user."
    )
    action: str = Field(
        ...,
        description="The action to be taken when the user takes action on the nudge."
    )
    label: str = Field(
        description="The label for the nudge, used for categorization and testing purposes.",
    )
    priority: str = Field(
        default="medium",
        description="The priority level of the nudge: high, medium, or low."
    )
    course_id: str = Field(
        default=None,
        description="The course ID if the nudge is course-specific, null otherwise."
    )
    
    def to_dict(self) -> Dict[str, str]:
        """
        Convert the Nudge object to a dictionary.
        """
        return {
            "nudge_text": self.nudge_text,
            "action": self.action,
            "label": self.label,
            "priority": self.priority,
            "course_id": self.course_id
        }
        
@dataclass
class Deps:
    user_id: str
    
    
def get_nudge_agent(**kwargs) -> Agent[Deps, List[Nudge]]:
    """
    Get an agent for generating personalized nudges for the user.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = NUDGE_AGENT_PROMPT
        
    model = get_model()
    
    return Agent[
        Deps,
        List[Nudge],
    ](
        model,
        output_type=List[Nudge],
        system_prompt=system_prompt,
        tools=[
            Tool(get_user_quiz_status, takes_ctx=True),
            Tool(get_flashcard_study_status, takes_ctx=True),
            Tool(get_upcoming_deadlines, takes_ctx=True),
            Tool(get_study_patterns, takes_ctx=True),
            Tool(get_nudge_preferences, takes_ctx=True),
        ],
    )