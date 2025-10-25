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
from api.supabase import get_file_details_with_content_from_db

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
    
    # Upsert records to Pinecone in batches (max 96 records per batch)
    batch_size = 96
    total_records = len(records)
    print(f"Upserting {total_records} records to namespace '{namespace}' in batches of {batch_size}...")
    
    for i in range(0, total_records, batch_size):
        batch = records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total_records + batch_size - 1) // batch_size
        
        print(f"Upserting batch {batch_num}/{total_batches} ({len(batch)} records)...")
        index.upsert_records(
            namespace=namespace,
            records=batch
        )
    
    print(f"Successfully populated namespace '{namespace}' with {total_records} chunks in {total_batches} batches")
    

async def set_index_and_namespace(
    pc: Pinecone,
    index_name: str,
    namespace: str,
    course_id: str = None,
    file_id: str = None,
    file_info: Dict[str, Any] = None,
    filename: str = None,
    course_name: str = None
):
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
        # Query database for file info and content
        try:
            file_details = await get_file_details_with_content_from_db(file_id, course_id)
        except Exception as e:
            print(f"Error getting file details with content: {e}")
            file_details = {}
        
        file_content = file_details.get('parsed_content', '')
        
        # Validate we have content to index
        if not file_content or file_content.startswith("[Error") or file_content.startswith("[File too large"):
            return ({
                "is_error": True,
                "error": file_content
            }, None)
        
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
    
    return ({
        "created_new_index": created_new_index,
        "created_new_namespace": created_new_namespace,
        "is_error": False
    }, index)


async def search_file_with_chunk_index(
    course_id: str,
    course_name: str,
    file_id: str,
    filename: str,
    chunk_index: int,
    file_info: Dict[str, Any] = None,
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Search for a specific chunk in a course file using Pinecone.
    """
    print(f"search_file_with_chunk_index called with file_id={file_id}, chunk_index={chunk_index}")
    
    # Get Pinecone API key

    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_api_key:
        raise Exception("PINECONE_API_KEY environment variable not set")
    
    # Initialize Pinecone client
    pc = Pinecone(api_key=pinecone_api_key)

    # Generate index and namespace names
    index_name = sanitize_index_name(f"{course_id}-{course_name}")
    namespace = sanitize_namespace_name(f"{file_id}-{filename}")
    
    res, index = await set_index_and_namespace(
        pc=pc,
        index_name=index_name,
        namespace=namespace,
        course_id=course_id,
        file_id=file_id,
        file_info=file_info,
        filename=filename,
        course_name=course_name
    )
    if res["is_error"]:
        return {
            "chunk_index": chunk_index,
            "file_id": file_id,
            "file_name": filename,
            "chunks": [],
            "error": res["error"],
            "created_new_index": res["created_new_index"],
            "created_new_namespace": res["created_new_namespace"]
        }
    
    created_new_index = res["created_new_index"]
    created_new_namespace = res["created_new_namespace"]
    
    chunk_id = f"{file_id}_chunk_{chunk_index}"
    
    # Search the index
    print(f"Searching for chunk index: {chunk_index} with top_k: {top_k}...")
    try:
        results = index.search(
            namespace=namespace,
            query={
                "id": chunk_id,  # For integrated inference, id is a direct query parameter
                "top_k": top_k
            },
            fields=["text", "chunk_index", "filename", "file_id", "total_chunks"]
        )
        
        # Parse results
        hits = results.get('result', {}).get('hits', [])
        chunks = []
        print(f"Found {len(hits)} hits")
        
        for hit in hits:
            chunk_data = {
                "score": hit.get('_score', 0),
                "text": hit.get('fields', {}).get('text', ''),
                "chunk_index": hit.get('fields', {}).get('chunk_index', 0),
                "filename": hit.get('fields', {}).get('filename', ''),
                "file_id": hit.get('fields', {}).get('file_id', ''),
                "total_chunks": hit.get('fields', {}).get('total_chunks', 0)
            }
            chunks.append(chunk_data)

        return {
            "chunk_index": chunk_index,
            "file_id": file_id,
            "file_name": filename,
            "chunks": chunks,
            "created_new_index": created_new_index,
            "created_new_namespace": created_new_namespace
        }
        
    except Exception as e:
        print(f"Search failed: {e}")
        return {
            "chunk_index": chunk_index,
            "file_id": file_id,
            "file_name": filename,
            "chunks": [],
            "error": f"Search failed: {str(e)}",
            "created_new_index": created_new_index,
            "created_new_namespace": created_new_namespace
        }

async def search_file_with_query(
    course_id: str,
    course_name: str,
    file_id: str,
    filename: str,
    query: str,
    file_info: Dict[str, Any] = None,
    top_k: int = 3
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
    
    res, index = await set_index_and_namespace(
        pc=pc,
        index_name=index_name,
        namespace=namespace,
        course_id=course_id,
        file_id=file_id,
        file_info=file_info,
        filename=filename,
        course_name=course_name
    )
    if res["is_error"]:
        return {
            "query": query,
            "file_id": file_id,
            "file_name": filename,
            "chunks": [],
            "error": res["error"],
            "created_new_index": res["created_new_index"],
            "created_new_namespace": res["created_new_namespace"]
        }
    
    created_new_index = res["created_new_index"]
    created_new_namespace = res["created_new_namespace"]
    
    # Search the index
    print(f"Searching for query: '{query}' with top_k: {top_k}...")
    try:
        results = index.search(
            namespace=namespace,
            query={
                "inputs": {"text": query},
                "top_k": top_k
            },
            fields=["text", "chunk_index", "filename", "file_id", "total_chunks"]
        )
        
        # Parse results
        hits = results.get('result', {}).get('hits', [])
        chunks = []
        print(f"Found {len(hits)} hits")
        for hit in hits:
            chunk_data = {
                "score": hit.get('_score', 0),
                "text": hit.get('fields', {}).get('text', ''),
                "chunk_index": hit.get('fields', {}).get('chunk_index', 0),
                "filename": hit.get('fields', {}).get('filename', ''),
                "file_id": hit.get('fields', {}).get('file_id', ''),
                "total_chunks": hit.get('fields', {}).get('total_chunks', 0)
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

