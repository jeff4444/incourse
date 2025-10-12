"""
Shared model configuration for all agents.

This module provides a centralized function to get the Bedrock model instance
used across all agents, making it easy to change models or configuration.
"""

import os
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from dotenv import load_dotenv

load_dotenv()

# Model configuration from environment variables
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DEFAULT_LOCATION = os.getenv("AWS_DEFAULT_REGION")
MODEL_ARN = os.getenv("AWS_MODEL_ARN")


def get_model(model_type: str = "bedrock"):
    if model_type == "bedrock":
        return get_bedrock_model()
    else:
        raise ValueError(f"Model type {model_type} not supported")

def get_bedrock_model() -> BedrockConverseModel:
    """
    Get the configured Bedrock model instance.
    
    Returns:
        BedrockConverseModel: The configured model instance ready to use with agents.
    
    Raises:
        ValueError: If required environment variables are not set.
    """
    if not all([ACCESS_KEY, SECRET_KEY, DEFAULT_LOCATION, MODEL_ARN]):
        missing = []
        if not ACCESS_KEY:
            missing.append("AWS_ACCESS_KEY_ID")
        if not SECRET_KEY:
            missing.append("AWS_SECRET_ACCESS_KEY")
        if not DEFAULT_LOCATION:
            missing.append("AWS_DEFAULT_REGION")
        if not MODEL_ARN:
            missing.append("AWS_MODEL_ARN")
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    return BedrockConverseModel(
        MODEL_ARN,
        provider=BedrockProvider(
            region_name=DEFAULT_LOCATION,
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
        ),
    )

