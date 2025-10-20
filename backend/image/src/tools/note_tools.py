"""
Note search tools for agents to retrieve note content.
"""

from typing import List
from api.supabase import get_notes_by_ids, extract_text_from_note_content


def chunk_note_text(text: str, chunk_size: int = 500) -> List[str]:
    """
    Split text into chunks for sequential access.
    
    Args:
        text: Text to chunk
        chunk_size: Size of each chunk in characters
    
    Returns:
        List of text chunks
    """
    if not text:
        return []
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at word boundary if possible
        if end < len(text):
            # Look for the last space within the chunk
            last_space = text.rfind(' ', start, end)
            if last_space > start:
                end = last_space
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end
    
    return chunks


async def search_note_with_chunk_index(
    ctx,
    note_id: str,
    chunk_index: int,
    num_results: int = 5
) -> str:
    """
    Fetch note from Supabase and return requested chunk and surrounding chunks.
    
    Args:
        ctx: Run context
        note_id: ID of the note to search
        chunk_index: Index of the chunk to retrieve (0-based)
        num_results: Number of surrounding chunks to include
    
    Returns:
        Formatted string with note title and chunk content
    """
    try:
        # Fetch the note
        notes = await get_notes_by_ids([note_id])
        
        if not notes:
            return f"Error: Note with ID '{note_id}' not found."
        
        note = notes[0]
        note_title = note.get("title", "Untitled")
        note_content = note.get("content", {})
        
        # Extract text from Tiptap JSON
        text_content = extract_text_from_note_content(note_content)
        
        if not text_content:
            return f"Note '{note_title}' contains no text content."
        
        # Chunk the text
        chunks = chunk_note_text(text_content)
        
        if not chunks:
            return f"Note '{note_title}' could not be chunked."
        
        # Check if chunk_index is valid
        if chunk_index < 0 or chunk_index >= len(chunks):
            return f"Error: Chunk index {chunk_index} is out of range. Note '{note_title}' has {len(chunks)} chunks (0-{len(chunks)-1})."
        
        # Calculate start and end indices for surrounding chunks
        half_results = num_results // 2
        start_idx = max(0, chunk_index - half_results)
        end_idx = min(len(chunks), chunk_index + half_results + 1)
        
        # Get the chunks
        result_chunks = chunks[start_idx:end_idx]
        
        # Format the response
        result = f"📝 Note: {note_title}\n"
        result += f"📊 Total chunks: {len(chunks)}\n"
        result += f"📖 Showing chunks {start_idx}-{end_idx-1}:\n\n"
        
        for i, chunk in enumerate(result_chunks):
            actual_index = start_idx + i
            marker = "👉" if actual_index == chunk_index else "  "
            result += f"{marker} Chunk {actual_index}: {chunk}\n\n"
        
        return result
        
    except Exception as e:
        return f"Error searching note '{note_id}': {str(e)}"


async def search_multiple_notes_overview(
    ctx,
    note_ids: List[str]
) -> str:
    """
    Fetch all notes and return overview with note titles and first chunk of each.
    
    Args:
        ctx: Run context
        note_ids: List of note IDs to fetch
    
    Returns:
        Formatted string with overview of all notes
    """
    try:
        if not note_ids:
            return "No notes provided."
        
        # Fetch all notes
        notes = await get_notes_by_ids(note_ids)
        
        if not notes:
            return "No notes found."
        
        result = f"📚 Overview of {len(notes)} notes:\n\n"
        
        for note in notes:
            note_id = note.get("id", "")
            note_title = note.get("title", "Untitled")
            note_content = note.get("content", {})
            
            # Extract text from Tiptap JSON
            text_content = extract_text_from_note_content(note_content)
            
            if not text_content:
                result += f"📝 {note_title} (ID: {note_id})\n"
                result += "   No text content available.\n\n"
                continue
            
            # Chunk the text
            chunks = chunk_note_text(text_content)
            
            if not chunks:
                result += f"📝 {note_title} (ID: {note_id})\n"
                result += "   Could not chunk content.\n\n"
                continue
            
            # Get first chunk as preview
            first_chunk = chunks[0]
            preview = first_chunk[:200] + "..." if len(first_chunk) > 200 else first_chunk
            
            result += f"📝 {note_title} (ID: {note_id})\n"
            result += f"   📊 {len(chunks)} chunks available\n"
            result += f"   📖 Preview: {preview}\n\n"
        
        result += "💡 Use search_note_with_chunk_index(note_id, chunk_index) to get specific chunks."
        
        return result
        
    except Exception as e:
        return f"Error fetching notes overview: {str(e)}"
