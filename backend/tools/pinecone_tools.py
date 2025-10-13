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
    
    Automatically fetches required context (LMS credentials, course info, file info)
    if not already loaded. This ensures the tool works regardless of call order.
    
    If the index or namespace doesn't exist, automatically creates it and indexes the file.
    
    Args:
        ctx: RunContext with dependencies
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
    # Ensure required dependencies are loaded
    # If they're not, fetch them now (this allows search to be called independently)
    if not ctx.deps.lms_api_key or not ctx.deps.lms_base_url:
        from api.supabase import get_user_lms_info
        lms_info = await get_user_lms_info(user_id=ctx.deps.user_id)
        ctx.deps.lms_api_key = lms_info["api_key"]
        ctx.deps.lms_base_url = lms_info["base_url"]
    
    if not ctx.deps.course_info:
        from api.supabase import get_course
        ctx.deps.course_info = await get_course(course_id=ctx.deps.course_id)
    
    if not ctx.deps.file_info:
        from api.supabase import get_module_items_by_course_id
        from api.canvas import get_file_details_with_content
        
        try:
            # Try to get from our database first
            file_info = await get_module_items_by_course_id(
                course_id=ctx.deps.course_info["id"],
                lms_id=ctx.deps.file_id
            )
            ctx.deps.is_file_from_lms = False
            ctx.deps.file_info = file_info
        except Exception:
            # Fall back to LMS API
            file_info = await get_file_details_with_content(
                api_key=ctx.deps.lms_api_key,
                api_base_url=ctx.deps.lms_base_url,
                course_id=ctx.deps.course_info["lms_id"],
                file_id=ctx.deps.file_id
            )
            ctx.deps.is_file_from_lms = True
            ctx.deps.file_info = file_info
    
    # Now extract parameters from context (guaranteed to be populated)
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


async def search_file_with_chunk_index(
    ctx: RunContext,
    chunk_index: int
) -> Dict[str, Any]:
    """
    Search for a specific chunk and nearby chunks by chunk index.
    
    Use this ONLY when you already found relevant chunks via search_file_with_query
    and need to see the surrounding context (nearby chunks) for better understanding.
    
    Automatically fetches required context (LMS credentials, course info, file info)
    if not already loaded.
    
    Args:
        ctx: RunContext with dependencies
        chunk_index: The index of the chunk to retrieve (and find similar chunks to)
    
    Returns:
        Dictionary containing:
        - chunk_index: The requested chunk index
        - file_id: The file ID
        - file_name: The file name
        - chunks: List of the target chunk and nearby chunks with scores
        - created_new_index: Whether a new index was created
        - created_new_namespace: Whether a new namespace was created
    """
    # Ensure required dependencies are loaded
    if not ctx.deps.lms_api_key or not ctx.deps.lms_base_url:
        from api.supabase import get_user_lms_info
        lms_info = await get_user_lms_info(user_id=ctx.deps.user_id)
        ctx.deps.lms_api_key = lms_info["api_key"]
        ctx.deps.lms_base_url = lms_info["base_url"]
    
    if not ctx.deps.course_info:
        from api.supabase import get_course
        ctx.deps.course_info = await get_course(course_id=ctx.deps.course_id)
    
    if not ctx.deps.file_info:
        from api.supabase import get_module_items_by_course_id
        from api.canvas import get_file_details_with_content
        
        try:
            # Try to get from our database first
            file_info = await get_module_items_by_course_id(
                course_id=ctx.deps.course_info["id"],
                lms_id=ctx.deps.file_id
            )
            ctx.deps.is_file_from_lms = False
            ctx.deps.file_info = file_info
        except Exception:
            # Fall back to LMS API
            file_info = await get_file_details_with_content(
                api_key=ctx.deps.lms_api_key,
                api_base_url=ctx.deps.lms_base_url,
                course_id=ctx.deps.course_info["lms_id"],
                file_id=ctx.deps.file_id
            )
            ctx.deps.is_file_from_lms = True
            ctx.deps.file_info = file_info
    
    # Now extract parameters from context (guaranteed to be populated)
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
    
    return await pinecone_api.search_file_with_chunk_index(
        api_key=api_key,
        api_base_url=api_base_url,
        course_id=course_id,
        course_name=course_name,
        file_id=file_id,
        filename=filename,
        chunk_index=chunk_index,
        is_file_from_lms=is_file_from_lms,
        file_info=file_info
    )


async def search_multiple_files_with_query(
    ctx: RunContext,
    query: str,
    num_results_per_file: int = 5
) -> str:
    """
    Search across multiple files and aggregate results.
    
    This tool is specifically for agents that need to generate content from multiple files
    (like flashcard and quiz generation agents). It searches each file in file_ids and
    aggregates the most relevant chunks from all files.
    
    Args:
        ctx: RunContext with dependencies (must have file_ids list)
        query: The search query
        num_results_per_file: Number of results to get from each file
    
    Returns:
        Formatted string with aggregated search results from all files
    """
    # Ensure required dependencies are loaded
    if not ctx.deps.lms_api_key or not ctx.deps.lms_base_url:
        from api.supabase import get_user_lms_info
        lms_info = await get_user_lms_info(user_id=ctx.deps.user_id)
        ctx.deps.lms_api_key = lms_info["api_key"]
        ctx.deps.lms_base_url = lms_info["base_url"]
    
    if not ctx.deps.course_info:
        from api.supabase import get_course
        ctx.deps.course_info = await get_course(course_id=ctx.deps.course_id)
    
    # Get file_ids from context
    file_ids = ctx.deps.file_ids
    
    if not file_ids:
        return "No files provided for search."
    
    # Fetch all files info
    from api.supabase import get_module_items_by_course_id
    from api.canvas import get_file_details_with_content
    
    all_results = []
    
    for file_id in file_ids:
        try:
            # Get file info
            try:
                # Try database first
                file_info = await get_module_items_by_course_id(
                    course_id=ctx.deps.course_info["id"],
                    lms_id=file_id
                )
                is_file_from_lms = False
            except Exception:
                # Fall back to LMS
                file_info = await get_file_details_with_content(
                    api_key=ctx.deps.lms_api_key,
                    api_base_url=ctx.deps.lms_base_url,
                    course_id=ctx.deps.course_info["lms_id"],
                    file_id=file_id
                )
                is_file_from_lms = True
            
            # Get file ID and name
            if is_file_from_lms:
                actual_file_id = file_info["id"]
                filename = file_info["display_name"]
            else:
                actual_file_id = file_info["lms_content_id"]
                filename = file_info["name"]
            
            # Search this file
            result = await pinecone_api.search_file_with_query(
                api_key=ctx.deps.lms_api_key,
                api_base_url=ctx.deps.lms_base_url,
                course_id=ctx.deps.course_info["lms_id"],
                course_name=ctx.deps.course_info["name"],
                file_id=actual_file_id,
                filename=filename,
                query=query,
                is_file_from_lms=is_file_from_lms,
                file_info=file_info,
                top_k=num_results_per_file
            )
            
            # Add file context to chunks
            if result.get("chunks"):
                for chunk in result["chunks"][:num_results_per_file]:
                    all_results.append({
                        "file_name": filename,
                        "file_id": actual_file_id,
                        "chunk": chunk
                    })
        
        except Exception as e:
            # Log error but continue with other files
            print(f"Error searching file {file_id}: {str(e)}")
            continue
    
    if not all_results:
        return f"No relevant content found for query: '{query}'"
    
    # Format results
    formatted_output = f"Search Results for: '{query}'\n\n"
    formatted_output += f"Found {len(all_results)} relevant chunks across {len(set(r['file_name'] for r in all_results))} files:\n\n"
    
    for idx, result in enumerate(all_results, 1):
        chunk_data = result["chunk"]
        formatted_output += f"[Result {idx}] From '{result['file_name']}':\n"
        formatted_output += f"  Score: {chunk_data.get('score', 'N/A')}\n"
        formatted_output += f"  Chunk #{chunk_data.get('chunk_index', 'N/A')}\n"
        formatted_output += f"  Content: {chunk_data.get('text', '')}\n\n"
    
    return formatted_output
