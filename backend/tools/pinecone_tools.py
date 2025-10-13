"""
Pinecone tool wrappers that extract parameters from RunContext and call core API functions.
"""

from pydantic_ai import RunContext
from typing import Dict, Any

# Import core API functions
from api import pinecone as pinecone_api


async def search_file_with_query(
    ctx: RunContext,
    query: str
) -> Dict[str, Any]:
    """
    Search for relevant chunks in a course file using Pinecone.
    
    If the index or namespace doesn't exist, automatically creates it and indexes the file.
    
    Args:
        ctx: RunContext with dependencies (lms_api_key, lms_base_url, course_id, file_info, etc.)
        query: The search query
    
    Returns:
        Dictionary containing:
        - query: The original query
        - file_id: The file ID
        - file_name: The file name
        - chunks: List of relevant chunks with scores
        - created_new_index: Whether a new index was created
        - created_new_namespace: Whether a new namespace was created
    """
    # Extract parameters from context
    api_key = ctx.deps.lms_api_key
    api_base_url = ctx.deps.lms_base_url
    course_id = ctx.deps.course_info["lms_id"]
    course_name = ctx.deps.course_info["name"]
    is_file_from_lms = ctx.deps.is_file_from_lms
    
    # Get file ID and name depending on source
    if is_file_from_lms:
        file_id = ctx.deps.file_info["id"]
        filename = ctx.deps.file_info["display_name"]
    else:
        file_id = ctx.deps.file_info["lms_content_id"]
        filename = ctx.deps.file_info["name"]
    
    file_info = ctx.deps.file_info
    
    return await pinecone_api.search_file_with_query(
        api_key=api_key,
        api_base_url=api_base_url,
        course_id=course_id,
        course_name=course_name,
        file_id=file_id,
        filename=filename,
        query=query,
        is_file_from_lms=is_file_from_lms,
        file_info=file_info
    )
