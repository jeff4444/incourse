"""
Summary Agent for chat log summarization.

This agent creates concise, contextual summaries of chat conversations
to enable efficient context retrieval and conversation continuity.
"""

from .agent import get_summary_agent, SummaryResult

__all__ = ["get_summary_agent", "SummaryResult"]

