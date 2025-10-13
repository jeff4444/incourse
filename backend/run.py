#!/usr/bin/env python3
"""
Simple script to run the InCourse AI Agents backend server.
"""

import os
import sys
import uvicorn
from dotenv import load_dotenv

load_dotenv()

def main():
    """Start the FastAPI server with uvicorn."""
    
    # Get configuration from environment variables
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    reload = os.getenv("RELOAD", "true").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    print(f"🚀 Starting InCourse AI Agents API...")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🔄 Auto-reload: {reload}")
    print(f"📝 Log level: {log_level}")
    print(f"🌐 API will be available at: http://{host}:{port}")
    print(f"📚 API docs will be available at: http://{host}:{port}/docs")
    print("-" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level=log_level,
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 