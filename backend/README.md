# InCourse AI Agents Backend

This is the backend API for InCourse AI agents, providing endpoints for flashcard generation, quiz generation, nudges, and action routing.

## Features

- **Flashcard Generation**: Generate flashcards from course content and files
- **Quiz Generation**: Create quiz questions based on course materials
- **Nudge Generation**: Generate personalized nudges for users
- **Action Routing**: Process user input and determine appropriate actions
- **Health Monitoring**: Check the status of all agents
- **Auto-generated API Documentation**: Interactive API docs with Swagger UI

## Setup

### Prerequisites

1. Python 3.8+
2. AWS credentials configured for Bedrock access
3. Required environment variables
4. **LibreOffice** (required for PPTX to PDF conversion)

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# AWS Configuration for Bedrock
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=us-east-1

# Server Configuration (optional)
PORT=8000
HOST=0.0.0.0
RELOAD=true
LOG_LEVEL=info
```

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Install LibreOffice (required for PPTX to PDF conversion):

**macOS:**
```bash
brew install --cask libreoffice
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install libreoffice
```

**Windows:**
Download and install from [LibreOffice.org](https://www.libreoffice.org/download/download/)

**Verify installation:**
```bash
soffice --version
```

3. Run the server:
```bash
# Option 1: Using the run script
cd backend
python run.py

# Option 2: Direct uvicorn command
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check for all agents
- `GET /agents/status` - Status of individual agents

### Flashcard Generation
- `POST /generate-flashcards` - Generate flashcards from course content

**Request Body:**
```json
{
  "api_key": "your_api_key",
  "course_id": "course_123",
  "file_ids": ["file_1", "file_2"],
  "prompt": "Optional custom prompt"
}
```

**Response:**
```json
{
  "flashcards": [
    {
      "question": "What is the capital of France?",
      "answer": "Paris",
      "image_prompt": "Eiffel Tower in Paris"
    }
  ],
  "success": true,
  "message": "Flashcards generated successfully"
}
```

### Quiz Generation
- `POST /generate-quiz` - Generate quiz questions from course content

**Request Body:**
```json
{
  "api_key": "your_api_key",
  "course_id": "course_123",
  "file_ids": ["file_1", "file_2"],
  "prompt": "Optional custom prompt"
}
```

**Response:**
```json
{
  "quizzes": [
    {
      "question": "What is the main function of mitochondria?",
      "options": "Option A, Option B, Option C, Option D",
      "response_index": "2",
      "explanation": "Mitochondria are the powerhouse of the cell...",
      "helper_image_prompt": "Mitochondria structure diagram"
    }
  ],
  "success": true,
  "message": "Quiz questions generated successfully"
}
```

### Nudge Generation
- `POST /generate-nudges` - Generate personalized nudges

**Request Body:**
```json
{
  "api_key": "your_api_key"
}
```

**Response:**
```json
{
  "nudges": [
    {
      "nudge": "You have an upcoming quiz in 2 days. Time to review!",
      "action": "navigate_to_quiz",
      "label": "quiz_reminder"
    }
  ],
  "success": true,
  "message": "Nudges generated successfully"
}
```

### Action Routing
- `POST /take-action` - Process user input and determine action

**Request Body:**
```json
{
  "api_key": "your_api_key",
  "user_input": "I want to study for my math exam"
}
```

**Response:**
```json
{
  "route_to": "/courses/math101",
  "file_to_open": "math_syllabus.pdf",
  "quiz_or_flashcard_to_open": "",
  "quiz_or_flashcard_to_create": "Create quiz on calculus",
  "course_id": "math101",
  "success": true,
  "message": "Action processed successfully"
}
```

### PPTX to PDF Conversion
- `POST /convert-pptx-to-pdf` - Convert PowerPoint files to PDF

**Request Body:**
```json
{
  "url": "https://example.com/presentation.pptx"
}
```

**Response:**
Returns the converted PDF file as `application/pdf` with filename `converted.pdf`

**Requirements:**
- LibreOffice must be installed on the server
- The endpoint tries multiple possible LibreOffice installation paths automatically
- Supports both `.ppt` and `.pptx` files
- Conversion timeout: 60 seconds

**Example:**
```bash
curl -X POST http://localhost:8000/convert-pptx-to-pdf \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/slides.pptx"}' \
  --output converted.pdf
```

## API Documentation

Once the server is running, you can access:

## Development

### Running in Development Mode

The server runs with auto-reload enabled by default, so changes to the code will automatically restart the server.

### Testing

You can test the endpoints using curl or any HTTP client:

```bash
# Health check
curl http://localhost:8000/health

# Generate flashcards
curl -X POST http://localhost:8000/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "test_key",
    "course_id": "test_course",
    "file_ids": ["file1", "file2"]
  }'
```

### Logging

The server logs are displayed in the console. You can adjust the log level using the `LOG_LEVEL` environment variable:

- `debug` - Detailed debug information
- `info` - General information (default)
- `warning` - Warning messages only
- `error` - Error messages only

## Architecture

The backend uses:
- **FastAPI**: Modern, fast web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI applications
- **Pydantic**: Data validation and settings management
- **AWS Bedrock**: AI model provider for all agents

All agents are converted to use AWS Bedrock with Claude Sonnet 4 for consistent AI capabilities across the platform.

## Pinecone File Search

### Overview

The `pinecone_tools.py` module provides semantic search capabilities over course files using Pinecone's vector database with integrated inference. This allows AI agents to find relevant content within course documents by understanding the meaning of queries, not just matching keywords.

### Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   Add to your `.env` file:
   ```env
   PINECONE_API_KEY=your_pinecone_api_key_here
   CANVAS_API_KEY=your_canvas_api_key
   CANVAS_BASE_URL=https://canvas.instructure.com/api/v1
   ```

### Usage

#### From Python Code

```python
from shared.agents.pinecone_tools import search_file_with_query
from pydantic_ai import RunContext

# Create context with dependencies
class Deps:
    def __init__(self):
        self.lms_api_key = "your_canvas_key"
        self.lms_base_url = "https://canvas.instructure.com/api/v1"
        self.course_id = "12345"

ctx = RunContext(deps=Deps(), retry=0)

# Search a file
results = await search_file_with_query(
    ctx=ctx,
    file_id="67890",
    query="What are the key concepts in chapter 3?"
)

# Access results
for chunk in results['chunks']:
    print(f"Score: {chunk['score']:.4f}")
    print(f"Text: {chunk['text']}")
```

#### From Command Line

Use the test script to search files:

```bash
cd backend

# Set environment variables
export PINECONE_API_KEY="your_key"
export CANVAS_API_KEY="your_key"
export CANVAS_BASE_URL="https://canvas.instructure.com/api/v1"
export TEST_COURSE_ID="12345"

# Run search
python test_pinecone_search.py <file_id> "your search query"
```

### How It Works

1. **Automatic Index Creation**: The tool creates a Pinecone index for each course using the pattern `{course_id}-{course_name}`. Indexes use integrated inference with the `multilingual-e5-large` embedding model.

2. **Namespace Organization**: Each file gets its own namespace within the course index using the pattern `{file_id}-{filename}`. This keeps file content isolated and searchable.

3. **Smart Chunking**: Files are automatically chunked into 500-character pieces with 50-character overlap to maintain context across chunks.

4. **Lazy Indexing**: Files are only indexed when first searched. Subsequent searches use the existing index for instant results.

5. **Semantic Search**: Queries use Pinecone's integrated inference to find the most relevant chunks based on meaning, not just keyword matching.

### Return Format

```python
{
    "query": "your search query",
    "file_id": "67890",
    "file_name": "lecture_notes.pdf",
    "chunks": [
        {
            "score": 0.8542,
            "text": "Chapter 3 covers...",
            "chunk_index": 5
        },
        # ... up to 3 chunks
    ],
    "created_new_index": False,
    "created_new_namespace": True
}
```

### Index Naming Convention

- **Index**: `{course_id}-{course_name}` (sanitized to lowercase alphanumeric with hyphens)
- **Namespace**: `{file_id}-{filename}` (sanitized to avoid special characters)

### Supported File Types

The tool supports the same file types as the Canvas file parser:
- PDF (`.pdf`)
- Word Documents (`.docx`)
- PowerPoint (`.pptx`)
- Text files (`.txt`)
- Markdown (`.md`)

### Cost Considerations

- **Index Creation**: One-time cost per course
- **Namespace Creation**: One-time cost per file (lazy indexing)
- **Search**: Minimal cost per query using Pinecone's integrated inference

Files are only indexed once and reused for all future queries, making this cost-effective for frequently accessed content.
