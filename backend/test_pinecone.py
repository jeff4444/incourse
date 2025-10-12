"""
Script to create a Pinecone index for a course and upload chunked README content.

This script:
1. Creates a Pinecone index with integrated inference configuration
2. Chunks the README file into manageable pieces  
3. Uploads chunks using upsert_records (Pinecone generates embeddings automatically)
4. Tests with search (Pinecone handles query embedding automatically)

Requirements:
- PINECONE_API_KEY environment variable
- README.md file in the project root
"""

import os
from typing import List, Dict, Any
from pathlib import Path
import hashlib
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
INDEX_NAME = "incourse-readme"
NAMESPACE = "readme"
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


def generate_chunk_id(index: int) -> str:
    """Generate a unique ID for a chunk based on index."""
    return f"readme_chunk_{index}"


def create_pinecone_index_with_inference(pc: Pinecone, index_name: str) -> None:
    """
    Create a Pinecone index with integrated inference if it doesn't exist.
    
    Args:
        pc: Pinecone client instance
        index_name: Name of the index to create
    """
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name in existing_indexes:
        print(f"Index '{index_name}' already exists.")
        return
        
    print(f"Creating index '{index_name}' with integrated inference...")
    # Use create_index_for_model for integrated inference
    pc.create_index_for_model(
        name=index_name,
        cloud="aws",
        region="us-east-1",
        embed={
            "model": "multilingual-e5-large",
            "field_map": {"text": "text"}  # Map "text" input to the "text" field in records
        },
        deletion_protection="disabled"
    )
    print(f"Index '{index_name}' created successfully!")


def prepare_records(chunks: List[str]) -> List[Dict[str, Any]]:
    """
    Prepare records for upsert with text field for inference.
    
    Args:
        chunks: List of text chunks
    
    Returns:
        List of records ready for upsert_records
    """
    records = []
    
    for i, chunk in enumerate(chunks):
        record = {
            "id": generate_chunk_id(i),
            "text": chunk,  # The field that will be embedded
            "chunk_index": i,
            "total_chunks": len(chunks),
            "source": "README.md",
            "course": "incourse",
            "document_type": "readme"
        }
        records.append(record)
    
    return records


def main():
    """Main function to create index and upload README content."""
    
    # Validate environment variables
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is required")
    
    # Initialize Pinecone
    print("Initializing Pinecone...")
    pc = Pinecone(api_key=api_key)
    
    # Create index with inference
    create_pinecone_index_with_inference(pc, INDEX_NAME)
    
    # Connect to index
    print(f"Connecting to index '{INDEX_NAME}'...")
    index = pc.Index(INDEX_NAME)
    
    # Read README file
    readme_path = Path(__file__).parent / "README.md"
    if not readme_path.exists():
        raise FileNotFoundError(f"README.md not found at {readme_path}")
    
    print(f"Reading README from {readme_path}...")
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme_content = f.read()
    
    if not readme_content.strip():
        print("Warning: README.md is empty!")
        return
    
    print(f"README length: {len(readme_content)} characters")
    
    # Chunk the text
    print("Chunking text...")
    chunks = chunk_text(readme_content)
    print(f"Created {len(chunks)} chunks")
    
    # Prepare records
    print("Preparing records...")
    records = prepare_records(chunks)
    
    # Upload to Pinecone using upsert_records
    # Pinecone will automatically generate embeddings for the "text" field
    print(f"Uploading to Pinecone (namespace: '{NAMESPACE}')...")
    print("Note: Pinecone will automatically generate embeddings using integrated inference")
    
    try:
        index.upsert_records(
            namespace=NAMESPACE,
            records=records
        )
        print(f"Successfully uploaded {len(records)} records to namespace '{NAMESPACE}'")
    except Exception as e:
        print(f"Error uploading records: {e}")
        print("\nNote: If the index doesn't support integrated inference, you may need to:")
        print("1. Delete the existing index")
        print("2. Create a new index configured for a specific embedding model")
        return
    
    # Verify upload
    print("\nVerifying upload...")
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")
    
    # Test search using integrated inference
    print("\nTesting with a sample query...")
    query_text = "What environment variables are required for the AWS Configuration?"
    
    try:
        # Use search method with text query - Pinecone handles embedding automatically
        results = index.search(
            namespace=NAMESPACE,
            query={
                "inputs": {"text": query_text},
                "top_k": 3
            },
            fields=["text", "source", "chunk_index"]  # Specify which fields to return
        )
        
        print(results['result']['hits'])
            
    except Exception as e:
        print(f"Search error: {e}")
        print("Note: Make sure the index is configured with integrated inference")
    
    print("\n✅ Script completed successfully!")


if __name__ == "__main__":
    main()
