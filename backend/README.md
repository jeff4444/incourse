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

2. Run the server:
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

## API Documentation

Once the server is running, you can access:

- **Interactive API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc Documentation**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

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