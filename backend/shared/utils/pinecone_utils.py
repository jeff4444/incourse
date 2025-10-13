"""
Pinecone utility functions for text processing and name sanitization.
"""

import re
from typing import List


# Configuration
CHUNK_SIZE = 500  # characters per chunk
CHUNK_OVERLAP = 50  # overlap between chunks


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Chunk text into smaller pieces with overlap.
    
    Args:
        text: Text to chunk
        chunk_size: Maximum characters per chunk
        overlap: Number of characters to overlap between chunks
    
    Returns:
        List of text chunks
    """
    if not text or len(text) <= chunk_size:
        return [text] if text else []
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at a sentence boundary
        if end < len(text):
            # Look for sentence endings (., !, ?, newline)
            sentence_end = max(
                text.rfind('.', start, end),
                text.rfind('!', start, end),
                text.rfind('?', start, end),
                text.rfind('\n', start, end)
            )
            if sentence_end > start:
                end = sentence_end + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        # Move start position with overlap
        start = end - overlap if end < len(text) else end
    
    return chunks


def sanitize_index_name(name: str) -> str:
    """
    Sanitize index name to meet Pinecone requirements.
    Index names must be lowercase alphanumeric with hyphens.
    """
    # Convert to lowercase
    name = name.lower()
    # Replace spaces and underscores with hyphens
    name = re.sub(r'[\s_]+', '-', name)
    # Remove any non-alphanumeric characters except hyphens
    name = re.sub(r'[^a-z0-9-]', '', name)
    # Remove leading/trailing hyphens
    name = name.strip('-')
    # Limit length to 45 characters (Pinecone max is ~50)
    name = name[:45]
    # Ensure name ends with alphanumeric after truncation
    name = re.sub(r'-+$', '', name)
    return name


def sanitize_namespace_name(name: str) -> str:
    """
    Sanitize namespace name to meet Pinecone requirements.
    Namespaces can contain most characters but should avoid special chars.
    """
    # Replace problematic characters
    name = re.sub(r'[\s]+', '-', name)
    # Remove any special characters that might cause issues
    name = re.sub(r'[^a-zA-Z0-9_-]', '', name)
    # Remove leading/trailing hyphens and underscores
    name = name.strip('-_')
    # Limit length
    name = name[:100]
    # Ensure name ends with alphanumeric after truncation
    name = re.sub(r'[-_]+$', '', name)
    return name

