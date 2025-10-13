"""
Core Pinecone API functions without RunContext dependency.
All functions accept explicit parameters instead of extracting from context.
"""

import os
import aiohttp
import tempfile
from typing import Dict, Any
from pinecone import Pinecone
from dotenv import load_dotenv
from shared.utils.pinecone_utils import chunk_text, sanitize_index_name, sanitize_namespace_name, fix_canvas_file_url
from api.canvas import get_file_details_with_content

load_dotenv()


def create_index_if_not_exists(pc: Pinecone, index_name: str) -> None:
    """Create a Pinecone index with integrated inference if it doesn't exist."""
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"Creating index '{index_name}' with integrated inference...")
        pc.create_index_for_model(
            name=index_name,
            cloud="aws",
            region="us-east-1",
            embed={
                "model": "multilingual-e5-large",
                "field_map": {"text": "text"}
            },
            deletion_protection="disabled"
        )
        print(f"Index '{index_name}' created successfully!")
    else:
        print(f"Index '{index_name}' already exists.")


def check_namespace_exists(index, namespace: str) -> bool:
    """Check if a namespace exists in the index."""
    try:
        stats = index.describe_index_stats()
        namespaces = stats.get('namespaces', {})
        return namespace in namespaces and namespaces[namespace].get('vector_count', 0) > 0
    except Exception as e:
        print(f"Error checking namespace: {e}")
        return False


def create_and_populate_namespace(
    index,
    namespace: str,
    file_content: str,
    file_id: str,
    filename: str,
    course_id: str,
    course_name: str
) -> None:
    """Chunk file content and populate Pinecone namespace."""
    print(f"Creating namespace '{namespace}' and adding chunks...")
    
    # Chunk the content
    chunks = chunk_text(file_content)
    print(f"Created {len(chunks)} chunks from file content")
    
    if not chunks:
        raise Exception("No content to chunk from file")
    
    # Prepare records for upserting
    records = []
    for i, chunk in enumerate(chunks):
        record = {
            "id": f"{file_id}_chunk_{i}",
            "text": chunk,  # This field will be embedded automatically
            "chunk_index": i,
            "total_chunks": len(chunks),
            "file_id": file_id,
            "filename": filename,
            "course_id": course_id,
            "course_name": course_name
        }
        records.append(record)
    
    # Upsert records to Pinecone (embeddings generated automatically)
    print(f"Upserting {len(records)} records to namespace '{namespace}'...")
    index.upsert_records(
        namespace=namespace,
        records=records
    )
    print(f"Successfully populated namespace '{namespace}' with {len(records)} chunks")


async def search_file_with_query(
    api_key: str,
    api_base_url: str,
    course_id: str,
    course_name: str,
    file_id: str,
    filename: str,
    query: str,
    is_file_from_lms: bool = False,
    file_info: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Search for relevant chunks in a course file using Pinecone.
    
    If the index or namespace doesn't exist, automatically creates it and indexes the file.
    
    Args:
        api_key: LMS API key
        api_base_url: LMS API base URL
        course_id: Course ID
        course_name: Course name
        file_id: The file ID to search
        filename: The file name
        query: The search query
        is_file_from_lms: Whether file is directly from LMS
        file_info: Optional file info dict if already loaded
    
    Returns:
        Dictionary containing:
        - query: The original query
        - file_id: The file ID
        - file_name: The file name
        - chunks: List of relevant chunks with scores
        - created_new_index: Whether a new index was created
        - created_new_namespace: Whether a new namespace was created
    """
    print(f"search_file_with_query called with file_id={file_id}, query='{query}'")
    
    # Get Pinecone API key
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_api_key:
        raise Exception("PINECONE_API_KEY environment variable not set")
    
    # Initialize Pinecone client
    pc = Pinecone(api_key=pinecone_api_key)
    
    # Generate index and namespace names
    index_name = sanitize_index_name(f"{course_id}-{course_name}")
    namespace = sanitize_namespace_name(f"{file_id}-{filename}")
    
    print(f"Using index: '{index_name}', namespace: '{namespace}'")
    
    created_new_index = False
    created_new_namespace = False
    
    # Check if index exists before creating
    existing_indexes = [index.name for index in pc.list_indexes()]
    if index_name not in existing_indexes:
        created_new_index = True
    
    # Create index if it doesn't exist
    create_index_if_not_exists(pc, index_name)
        
    # Connect to index
    index = pc.Index(index_name)
    
    # Check if namespace exists and has content
    namespace_exists = check_namespace_exists(index, namespace)
    
    if not namespace_exists:
        print(f"Namespace '{namespace}' doesn't exist or is empty. Creating...")
        if not is_file_from_lms:
            try:
                file_details = await get_file_details_with_content(api_key, api_base_url, course_id, file_id)
            except Exception as e:
                print(f"Error getting file details with content: {e}")
                file_details = {}
        else:
            file_details = file_info if file_info else {}
        
        file_content = file_details.get('parsed_content', '')
        
        # Validate we have content to index
        if not file_content or file_content.startswith("[Error") or file_content.startswith("[File too large"):
            return {
                "query": query,
                "file_id": file_id,
                "file_name": filename,
                "chunks": [],
                "error": f"Cannot index file: {file_content}",
                "created_new_index": created_new_index,
                "created_new_namespace": created_new_namespace
            }
        
        # Create and populate namespace
        create_and_populate_namespace(
            index=index,
            namespace=namespace,
            file_content=file_content,
            file_id=file_id,
            filename=filename,
            course_id=course_id,
            course_name=course_name
        )
    
    # Search the index
    print(f"Searching for query: '{query}'...")
    try:
        results = index.search(
            namespace=namespace,
            query={
                "inputs": {"text": query},
                "top_k": 3
            },
            fields=["text", "chunk_index", "filename", "file_id"]
        )
        
        # Parse results
        hits = results.get('result', {}).get('hits', [])
        chunks = []
        
        for hit in hits:
            chunk_data = {
                "score": hit.get('_score', 0),
                "text": hit.get('fields', {}).get('text', ''),
                "chunk_index": hit.get('fields', {}).get('chunk_index', 0),
                "filename": hit.get('fields', {}).get('filename', ''),
                "file_id": hit.get('fields', {}).get('file_id', '')
            }
            chunks.append(chunk_data)
        
        return {
            "query": query,
            "file_id": file_id,
            "file_name": filename,
            "chunks": chunks,
            "created_new_index": created_new_index,
            "created_new_namespace": created_new_namespace
        }
        
    except Exception as e:
        print(f"Search failed: {e}")
        return {
            "query": query,
            "file_id": file_id,
            "file_name": filename,
            "chunks": [],
            "error": f"Search failed: {str(e)}",
            "created_new_index": created_new_index,
            "created_new_namespace": created_new_namespace
        }

