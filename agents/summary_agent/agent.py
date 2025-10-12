from dataclasses import dataclass
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from shared.prompts.summary_agent_prompt import SUMMARY_AGENT_PROMPT
from shared.agents.model import get_model


class SummaryResult(BaseModel):
    """
    Model for a chat conversation summary.
    """
    summary: str = Field(..., description="A structured summary of the conversation")
    main_topics: List[str] = Field(default_factory=list, description="List of main topics discussed")
    key_insights: List[str] = Field(default_factory=list, description="Key insights and explanations provided")
    
    
@dataclass
class SummaryDeps:
    """
    Dependencies for the summary agent.
    """
    conversation_text: str
    previous_summary: str = None


SYSTEM_PROMPT = SUMMARY_AGENT_PROMPT


def get_summary_agent(**kwargs) -> Agent[SummaryDeps, SummaryResult]:
    """
    Create a summary agent for chat log summarization.
    
    This agent analyzes chat conversations and produces structured summaries
    that capture key topics, questions, insights, and learning progress.
    
    Returns:
        Agent configured for chat summarization
    """
    model = get_model()
    
    return Agent[
        SummaryDeps,
        SummaryResult,
    ](
        model,
        output_type=SummaryResult,
        system_prompt=SYSTEM_PROMPT,
        retries=3,
        output_retries=3,
    )


async def summarize_conversation(
    messages: List[Dict[str, Any]],
    previous_summary: str = None,
    additional_context: str = None
) -> SummaryResult:
    """
    Summarize a list of chat messages.
    
    Args:
        messages: List of message dictionaries with 'sender' and 'content' keys
        previous_summary: Optional previous summary to build upon
        additional_context: Optional additional context (e.g., course/document info)
    
    Returns:
        SummaryResult with structured summary and extracted information
    """
    # Format the conversation
    conversation_text = ""
    
    if additional_context:
        conversation_text += f"Context: {additional_context}\n\n"
    
    if previous_summary:
        conversation_text += f"Previous Summary:\n{previous_summary}\n\n---\n\n"
    
    conversation_text += "Recent Conversation:\n"
    for msg in messages:
        role = "Student" if msg.get("sender") == "user" else "Assistant"
        content = msg.get("content", "")
        conversation_text += f"{role}: {content}\n"
    
    # Create agent and run
    agent = get_summary_agent()
    deps = SummaryDeps(
        conversation_text=conversation_text,
        previous_summary=previous_summary
    )
    
    result = await agent.run(
        f"Please summarize this conversation:\n\n{conversation_text}", deps=deps
    )
    
    return result.output


async def summarize_conversation_incremental(
    new_messages: List[Dict[str, Any]],
    previous_summary: str,
    message_count: int,
    additional_context: str = None
) -> SummaryResult:
    """
    Create an incremental summary that builds upon a previous summary.
    
    This is useful for long conversations where you want to maintain
    a rolling summary without re-summarizing everything from scratch.
    
    Args:
        new_messages: New messages since the last summary
        previous_summary: The previous summary to build upon
        message_count: Total number of messages in the conversation
        additional_context: Optional additional context
    
    Returns:
        SummaryResult with updated summary
    """
    conversation_text = ""
    
    if additional_context:
        conversation_text += f"Context: {additional_context}\n\n"
    
    conversation_text += f"Previous Summary (after {message_count - len(new_messages)} messages):\n"
    conversation_text += f"{previous_summary}\n\n"
    conversation_text += "---\n\n"
    conversation_text += "New Messages:\n"
    
    for msg in new_messages:
        role = "Student" if msg.get("sender") == "user" else "Assistant"
        content = msg.get("content", "")
        conversation_text += f"{role}: {content}\n"
    
    agent = get_summary_agent()
    deps = SummaryDeps(
        conversation_text=conversation_text,
        previous_summary=previous_summary
    )
    
    prompt = f"""
    Update the previous summary with the new conversation. 
    Integrate new topics and insights while maintaining the overall context.
    The summary should reflect the entire conversation ({message_count} messages total).
    
    {conversation_text}
    """
    
    result = await agent.run(prompt, deps=deps)
    
    return result.output

