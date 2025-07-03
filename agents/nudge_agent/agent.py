import asyncio
import os
from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import List, Dict
from pydantic_ai import Agent, Tool
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from shared.prompts.nudge_agent_prompt import NUDGE_AGENT_PROMPT
from dotenv import load_dotenv
from shared.agents.tools import get_chat_history_summary, get_course_grade_details, get_course_quiz_history, get_file_content_summaries, get_overall_course_performance

load_dotenv()

ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DEFAULT_LOCATION = os.getenv("AWS_DEFAULT_REGION")
MODEL_ARN = os.getenv("AWS_MODEL_ARN")

class Nudge(BaseModel):
    """
    A class representing a nudge.
    """
    nudge: str = Field(
        ...,
        description="The nudge to be sent to the user."
    )
    action: str = Field(
        ...,
        description="The action to be taken when the user takes action on the nudge."
    )
    label: str = Field(
        description="The label for the nudge, used for categorization and testing purposes.",
    )
    
    def to_dict(self) -> Dict[str, str]:
        """
        Convert the Nudge object to a dictionary.
        """
        return {
            "nudge": self.nudge,
            "action": self.action,
            "label": self.label
        }
        
@dataclass
class Deps:
    user_id: str
    lms_api_key: str
    
    
def get_nudge_agent(**kwargs) -> Agent[Deps, List[Nudge]]:
    """
    Get an agent for generating personalized nudges for the user.
    """
    system_prompt = kwargs.get("prompt", None)
    if system_prompt is None:
        system_prompt = NUDGE_AGENT_PROMPT
        
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
        List[Nudge],
    ](
        model,
        output_type=List[Nudge],
        system_prompt=system_prompt,
        tools=[  
            Tool(get_overall_course_performance, takes_ctx=True),
            Tool(get_chat_history_summary, takes_ctx=True),
            Tool(get_course_quiz_history, takes_ctx=True),
            Tool(get_course_grade_details, takes_ctx=True),
            Tool(get_file_content_summaries, takes_ctx=True),
        ],
    )