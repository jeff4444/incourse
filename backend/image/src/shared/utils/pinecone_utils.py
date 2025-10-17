"""
Pinecone utility functions for text processing and name sanitization.
"""

import re
from typing import List
from urllib.parse import urlparse


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


def fix_canvas_file_url(file_url: str) -> str:
    """
    Convert Canvas API file detail URLs to download URLs.
    
    Converts URLs from:
        https://canvas.howard.edu/api/v1/courses/35439/files/2665183
    To:
        https://canvas.howard.edu/files/2665183/download?download_frd=1
    
    If the URL is already in download format or not a Canvas API URL, returns it unchanged.
    
    Args:
        file_url: The file URL to fix
    
    Returns:
        Download URL format if conversion is needed, otherwise the original URL
    """
    if not file_url:
        return file_url
    
    # Check if it's already a download URL
    if '/download' in file_url:
        return file_url
    
    # Pattern to match Canvas API file URLs: /api/v1/courses/{course_id}/files/{file_id}
    api_pattern = r'/api/v1/courses/\d+/files/(\d+)'
    match = re.search(api_pattern, file_url)
    
    if match:
        # Extract the file ID
        file_id = match.group(1)
        
        # Parse the URL to get the base domain
        parsed = urlparse(file_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        # Construct the download URL
        download_url = f"{base_url}/files/{file_id}/download?download_frd=1"
        return download_url
    
    # If it doesn't match the API pattern, return as is
    return file_url

